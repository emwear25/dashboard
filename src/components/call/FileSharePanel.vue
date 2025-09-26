<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue";
import { useFileChannel } from "@/composables/useFileChannel";
import { useDoctorAuth } from "@/composables/useDoctorAuth";
import {
  encryptFile,
  validateFileType,
  validateFileSize,
} from "@/utils/cryptoFallback";
import {
  createPresignedUpload,
  uploadEncryptedFile,
  logFileTransfer,
  checkFallbackAvailability,
} from "@/services/fallbackApi";
import type { DailyCall } from "@daily-co/daily-js";

const props = defineProps<{
  callFrame: DailyCall | null;
  recipient?: string;
}>();

// Configuration
const MAX_P2P_SIZE = 50 * 1024 * 1024; // 50MB for P2P
const MAX_FALLBACK_SIZE = 100 * 1024 * 1024; // 100MB for fallback

// Consent state (session-scoped)
const consentGiven = ref(false);
const consentModalVisible = ref(false);
const counterpartyName = ref("the other participant");
const counterpartyConsent = ref(false);
// Both consents are tracked but not currently used for UI display
// const bothConsentsGiven = computed(
//   () => consentGiven.value && counterpartyConsent.value
// );

// File transfer state
const isTransferring = ref(false);
const transferProgress = ref(0);
const fallbackAvailable = ref(false);
const useFallback = ref(false);

// Session-only sent files tracking (not persisted, cleared when meeting ends)
const sentFiles = ref<
  Array<{
    name: string;
    size: number;
    timestamp: number;
    status: "sending" | "sent" | "failed";
  }>
>([]);

// Get meeting ID from URL or appointment
const meetingId = computed(() => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("appointmentId") || urlParams.get("id") || "unknown";
});

// Initialize file channel
const sendAppMessage = (payload: unknown) => {
  console.log("📤 Doctor sending app message:", payload);
  if (props.callFrame) {
    try {
      props.callFrame.sendAppMessage(payload, "*");
      console.log("✅ Message sent successfully");
    } catch (error) {
      console.error("❌ Failed to send app message:", error);
    }
  } else {
    console.error("❌ No call frame available for sending message");
  }
};

const onAppMessage = (handler: (data: unknown) => void) => {
  console.log("🔧 Setting up app message listener on doctor side...");
  if (props.callFrame) {
    try {
      props.callFrame.on("app-message", (event: { data: unknown }) => {
        console.log("📨 Raw app message received on doctor side:", event);
        handler(event.data);
      });
      console.log("✅ App message listener set up successfully");
    } catch (error) {
      console.error("❌ Failed to set up app message listener:", error);
    }
  } else {
    console.error("❌ No call frame available for message listener");
  }
};

const fileChannel = useFileChannel(sendAppMessage, onAppMessage);

// Use incoming files from fileChannel
const incomingFiles = fileChannel.incomingFiles;

// Debug: Watch for changes in incoming files
watch(
  incomingFiles,
  (newFiles) => {
    console.log("🔍 Doctor incoming files changed:", {
      count: newFiles.length,
      files: newFiles.map((f) => ({ name: f.name, size: f.size })),
    });
  },
  { deep: true }
);

const fileInput = ref<HTMLInputElement | null>(null);

// Show consent modal before enabling file transfer
function showConsentModal() {
  // Get participant names from Daily call
  if (props.callFrame) {
    const participants = props.callFrame.participants();
    const remoteParticipants = Object.values(participants).filter(
      (p) => !p.local
    );
    if (remoteParticipants.length > 0) {
      counterpartyName.value =
        remoteParticipants[0].user_name || "the other participant";
    }
  }

  consentModalVisible.value = true;
}

// Handle consent acceptance
function acceptConsent() {
  consentGiven.value = true;
  consentModalVisible.value = false;

  console.log("Doctor consent accepted, sending message to patient...");

  // Small delay to ensure patient's listener is ready
  setTimeout(() => {
    // Send consent acceptance via Daily app message
    try {
      sendAppMessage({
        type: "consent-accepted",
        from: "doctor",
        timestamp: Date.now(),
      });
      console.log("✅ Consent message sent to patient");
    } catch (error) {
      console.error("❌ Failed to send consent message:", error);
    }

    // Initialize P2P immediately as doctor (caller) - don't wait for patient
    console.log("Initializing P2P as caller...");
    initializeP2PConnection();
  }, 100);
}

// Handle consent rejection
function rejectConsent() {
  consentModalVisible.value = false;
}

function pickFile() {
  if (!consentGiven.value) {
    showConsentModal();
    return;
  }

  // Check if P2P is ready, if not try to initialize
  if (!fileChannel.isConnected.value && !useFallback.value) {
    console.log("P2P not connected, trying to initialize...");
    initializeP2PConnection();

    // Give it a moment to connect
    setTimeout(() => {
      if (!fileChannel.isConnected.value) {
        console.log("P2P failed to connect, enabling fallback");
        useFallback.value = true;
      }
    }, 2000);
  }

  if (!isTransferring.value) {
    fileInput.value?.click();
  }
}

async function onFileChange(e: Event) {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  try {
    // Validate file
    if (!validateFileType(file)) {
      throw new Error(
        "File type not allowed. Please use PDF, images, text files, Word documents, or ZIP files only."
      );
    }

    if (!validateFileSize(file, MAX_FALLBACK_SIZE)) {
      throw new Error(
        `File too large. Maximum size is ${MAX_FALLBACK_SIZE / (1024 * 1024)}MB.`
      );
    }

    isTransferring.value = true;
    transferProgress.value = 0;

    // Debug connection status
    console.log("File transfer debug:", {
      fileSize: file.size,
      maxP2PSize: MAX_P2P_SIZE,
      isConnected: fileChannel.isConnected.value,
      isInitialized: fileChannel.isInitialized.value,
      useFallback: useFallback.value,
      fallbackAvailable: fallbackAvailable.value,
    });

    // Choose transfer method based on size and availability
    if (
      file.size <= MAX_P2P_SIZE &&
      fileChannel.isConnected.value &&
      !useFallback.value
    ) {
      console.log("Using P2P transfer");
      await sendViaP2P(file);
    } else if (fallbackAvailable.value) {
      console.log("Using fallback transfer");
      await sendViaFallback(file);
    } else {
      console.error("No transfer method available:", {
        p2pAvailable: fileChannel.isConnected.value,
        fallbackAvailable: fallbackAvailable.value,
        fileSize: file.size,
        maxP2PSize: MAX_P2P_SIZE,
      });
      throw new Error("No transfer method available. Please try again later.");
    }

    // Audit logging temporarily disabled to prevent meeting disconnections
    // TODO: Re-enable when auth system is more stable
    console.log(
      "Audit logging temporarily disabled in production to prevent auth conflicts"
    );
  } catch (error) {
    console.error("File transfer failed:", error);
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    alert(`File transfer failed: ${message}`);

    // Audit logging temporarily disabled to prevent meeting disconnections
    // TODO: Re-enable when auth system is more stable
    console.log(
      "Audit logging temporarily disabled in production to prevent auth conflicts"
    );
  } finally {
    isTransferring.value = false;
    transferProgress.value = 0;
    target.value = "";
  }
}

// Send file via P2P WebRTC data channel
async function sendViaP2P(file: File) {
  // Add to sent files tracking
  const sentFile = {
    name: file.name,
    size: file.size,
    timestamp: Date.now(),
    status: "sending" as "sending" | "sent" | "failed",
  };
  sentFiles.value.push(sentFile);

  try {
    await fileChannel.sendFile(file);
    // Update status to sent
    sentFile.status = "sent";
  } catch (error) {
    console.error(
      "P2P transfer failed, falling back to encrypted transfer:",
      error
    );
    sentFile.status = "failed";
    if (fallbackAvailable.value) {
      useFallback.value = true;
      await sendViaFallback(file);
      sentFile.status = "sent"; // Update if fallback succeeds
    } else {
      throw error;
    }
  }
}

// Send file via encrypted fallback (S3)
async function sendViaFallback(file: File) {
  transferProgress.value = 10;

  // Encrypt file client-side
  const encrypted = await encryptFile(file);
  transferProgress.value = 30;

  // Get presigned upload URL
  const uploadInfo = await createPresignedUpload(meetingId.value);
  transferProgress.value = 40;

  // Upload encrypted file
  await uploadEncryptedFile(uploadInfo.uploadUrl, encrypted.cipher);
  transferProgress.value = 80;

  // Share metadata via Daily app message
  sendAppMessage({
    type: "fallback-meta",
    algo: "AES-GCM",
    name: encrypted.meta.name,
    size: encrypted.meta.size,
    mime: encrypted.meta.mime,
    ivBase64: btoa(String.fromCharCode(...encrypted.iv)),
    objectKey: uploadInfo.objectKey,
    expiresAt: uploadInfo.expiresAt,
    timestamp: Date.now(),
  });

  transferProgress.value = 100;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString();
}

// Handle incoming app messages
function handleAppMessage(data: unknown) {
  const message = data as { type: string; [key: string]: unknown };

  console.log("📨 Doctor received app message:", message.type, message);

  if (message.type === "offer") {
    console.log("📨 Received WebRTC offer");
    fileChannel.onOffer(message);
  } else if (message.type === "answer") {
    console.log("📨 Received WebRTC answer");
    fileChannel.onAnswer(message);
  } else if (message.type === "ice") {
    console.log("📨 Received ICE candidate");
    fileChannel.onIce(message);
  } else if (message.type === "fallback-meta") {
    console.log("📨 Received fallback file metadata");
    handleFallbackFile(message);
  } else if (message.type === "consent-accepted") {
    // Handle counterparty consent
    const from = message.from as string;
    console.log(`📨 Received consent from: ${from}`);
    if (from === "patient") {
      console.log("✅ Patient consent received, both parties ready!");
      counterpartyConsent.value = true;
    }
  } else if (message.type === "test-message") {
    const from = message.from as string;
    console.log(`🧪 Test message received from ${from}:`, message.message);
  }
}

// Initialize P2P connection when both parties consent
async function initializeP2PConnection() {
  try {
    console.log("Initializing P2P connection as doctor (caller)...");
    await fileChannel.initAsCaller();
    console.log("P2P connection initialized successfully");
  } catch (error) {
    console.error("Failed to initialize P2P connection:", error);
    useFallback.value = true;
  }
}

// Handle encrypted fallback file
function handleFallbackFile(data: { [key: string]: unknown }) {
  const metadata = {
    name: String(data.name || "unknown"),
    size: Number(data.size || 0),
    mime: String(data.mime || "application/octet-stream"),
    timestamp: Number(data.timestamp || Date.now()),
  };

  // For now, just log fallback files (decryption not implemented yet)
  console.log("📨 Received encrypted fallback file:", metadata);

  // TODO: Implement fallback file decryption and add to incomingFiles
  alert(
    `Received encrypted file: ${metadata.name} (decryption not yet implemented)`
  );
}

// Download file (creates blob URL for user download)
function downloadFile(file: { name: string; blob: Blob }) {
  if (file.blob.size > 0) {
    // P2P file - create download link
    const url = URL.createObjectURL(file.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
  } else {
    // Fallback file - would need decryption logic
    alert("Encrypted file download not yet implemented");
  }
}

// Track if message listener is set up
const messageListenerSetup = ref(false);

// Watch for callFrame changes and set up listener when available
watch(
  () => props.callFrame,
  (newCallFrame) => {
    console.log(
      "🔧 CallFrame changed:",
      !!newCallFrame,
      "Listener setup:",
      messageListenerSetup.value
    );

    if (newCallFrame && !messageListenerSetup.value) {
      console.log("🔧 Setting up message listener for doctor...");
      onAppMessage(handleAppMessage);
      messageListenerSetup.value = true;

      // Test message sending after a delay
      setTimeout(() => {
        console.log("🧪 Testing Daily.co app message...");
        sendAppMessage({
          type: "test-message",
          from: "doctor",
          message: "Testing Daily.co app messages",
        });
      }, 2000);
    }
  },
  { immediate: true }
);

// Check fallback availability on mount
onMounted(async () => {
  console.log("🔧 FileSharePanel mounted, callFrame:", !!props.callFrame);
  fallbackAvailable.value = await checkFallbackAvailability();
});

// Cleanup on unmount
onBeforeUnmount(() => {
  fileChannel.close();
});
</script>

<template>
  <div class="file-share-panel">
    <!-- Consent Modal -->
    <div v-if="consentModalVisible" class="consent-modal-overlay">
      <div class="consent-modal">
        <div class="consent-header">
          <h3>File Sharing Consent</h3>
          <div class="consent-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
        </div>
        <div class="consent-body">
          <p>
            Share files during this visit only with
            <strong>{{ counterpartyName }}</strong
            >.
          </p>
          <ul class="consent-terms">
            <li>Files are shared directly between participants</li>
            <li>No permanent storage on our servers</li>
            <li>No recordings of shared files</li>
            <li>Files cleared when meeting ends</li>
          </ul>
        </div>
        <div class="consent-actions">
          <button @click="rejectConsent" class="btn-secondary">Decline</button>
          <button @click="acceptConsent" class="btn-primary">
            Accept & Continue
          </button>
        </div>
      </div>
    </div>

    <div class="file-share-panel__header">
      <h3 class="file-share-panel__title">Secure File Transfer</h3>
      <div class="file-share-panel__status">
        <div
          class="status-indicator"
          :class="{
            'status-connected': fileChannel.isConnected,
            'status-fallback': useFallback && fallbackAvailable,
            'status-disabled': !consentGiven,
          }"
        ></div>
        <span class="status-text">
          {{
            !consentGiven
              ? "Consent Required"
              : !counterpartyConsent
                ? "Waiting for Patient Consent"
                : fileChannel.isConnected
                  ? "P2P Connected"
                  : useFallback
                    ? "Encrypted Fallback"
                    : "Connecting..."
          }}
        </span>
      </div>
    </div>

    <!-- Send File Section -->
    <div class="file-share-panel__send">
      <button
        @click="pickFile"
        :disabled="isTransferring"
        class="file-share-panel__send-btn"
        :class="{ 'btn-disabled': isTransferring }"
      >
        <svg
          v-if="!isTransferring"
          class="file-share-panel__send-icon"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
        <div v-else class="file-share-panel__spinner"></div>
        {{
          isTransferring
            ? "Transferring..."
            : consentGiven
              ? "Send Secure File"
              : "Enable File Sharing"
        }}
      </button>

      <input
        ref="fileInput"
        type="file"
        accept="application/pdf,image/jpeg,image/png,image/webp,text/plain,.doc,.docx,.zip,application/zip,application/x-zip-compressed"
        class="file-share-panel__file-input"
        @change="onFileChange"
      />

      <!-- Transfer Method Info -->
      <div class="file-share-panel__method-info">
        <div class="method-item">
          <div class="method-label">
            <svg
              class="method-icon"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            P2P Direct (≤{{ Math.round(MAX_P2P_SIZE / (1024 * 1024)) }}MB +
            ZIP):
          </div>
          <div
            class="method-status"
            :class="{ 'method-available': fileChannel.isConnected }"
          >
            {{ fileChannel.isConnected ? "Available" : "Connecting..." }}
          </div>
        </div>

        <div class="method-item">
          <div class="method-label">
            <svg
              class="method-icon"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            Encrypted Fallback (≤{{
              Math.round(MAX_FALLBACK_SIZE / (1024 * 1024))
            }}MB Large ZIP):
          </div>
          <div
            class="method-status"
            :class="{ 'method-available': fallbackAvailable }"
          >
            {{ fallbackAvailable ? "Available" : "Unavailable" }}
          </div>
        </div>
      </div>

      <!-- Progress indicator -->
      <div v-if="isTransferring" class="file-share-panel__progress">
        <div class="file-share-panel__progress-bar">
          <div
            class="file-share-panel__progress-fill"
            :style="{ width: `${transferProgress}%` }"
          ></div>
        </div>
        <span class="file-share-panel__progress-text"
          >{{ transferProgress }}%</span
        >
      </div>
    </div>

    <!-- Sent Files (Session-only, not persisted) -->
    <div v-if="sentFiles.length > 0" class="file-share-panel__section">
      <h4 class="file-share-panel__section-title">Sent Files (This Session)</h4>
      <div class="file-share-panel__file-list">
        <div
          v-for="(file, index) in sentFiles"
          :key="`sent-${index}`"
          class="file-share-panel__file-item file-share-panel__file-item--outgoing"
        >
          <div class="file-share-panel__file-info">
            <span class="file-share-panel__file-name">
              <svg
                class="file-icon"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              {{ file.name }}
            </span>
            <span class="file-share-panel__file-meta">
              {{ formatFileSize(file.size) }} •
              {{ formatTimestamp(file.timestamp) }}
              <span
                class="file-status"
                :class="{
                  'status-sent': file.status === 'sent',
                  'status-sending': file.status === 'sending',
                  'status-failed': file.status === 'failed',
                }"
              >
                {{
                  file.status === "sent"
                    ? "✓ Sent"
                    : file.status === "sending"
                      ? "⏳ Sending..."
                      : "✗ Failed"
                }}
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Received Files -->
    <div v-if="incomingFiles.length > 0" class="file-share-panel__section">
      <h4 class="file-share-panel__section-title">Received Files</h4>
      <div class="file-share-panel__file-list">
        <div
          v-for="(file, index) in incomingFiles"
          :key="index"
          class="file-share-panel__file-item file-share-panel__file-item--incoming"
        >
          <div class="file-share-panel__file-info">
            <button
              @click="downloadFile(file)"
              class="file-share-panel__file-link"
              :title="`Download ${file.name}`"
            >
              <svg
                class="download-icon"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              {{ file.name }}
            </button>
            <span class="file-share-panel__file-meta">
              {{ formatFileSize(file.size) }} •
              {{ formatTimestamp(file.timestamp) }}
            </span>
          </div>
          <div class="file-share-panel__security-note">
            <svg
              class="security-icon"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <span>Secure transfer</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-if="incomingFiles.length === 0 && !isTransferring"
      class="file-share-panel__empty"
    >
      <svg
        class="file-share-panel__empty-icon"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        />
      </svg>
      <p class="file-share-panel__empty-text">
        {{
          consentGiven ? "No files shared yet" : "File sharing requires consent"
        }}
      </p>
      <p class="file-share-panel__empty-subtitle">
        Files are shared securely and cleared when the meeting ends
      </p>
    </div>

    <!-- Privacy Notice -->
    <div class="file-share-panel__privacy">
      <div class="privacy-icon">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
      </div>
      <div class="privacy-text">
        <p>
          <strong>BG/DE Compliant:</strong> Files transfer directly between
          participants. No server storage, no recordings.
        </p>
        <p>
          Minimal metadata logged for audit purposes only (90-day retention).
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Consent Modal */
.consent-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.consent-modal {
  background: white;
  border-radius: 0.75rem;
  padding: 1.5rem;
  max-width: 480px;
  width: 90%;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.consent-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.consent-header h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.consent-icon {
  width: 2rem;
  height: 2rem;
  color: #3b82f6;
}

.consent-body p {
  font-size: 1rem;
  color: #374151;
  margin: 0 0 1rem 0;
  line-height: 1.5;
}

.consent-terms {
  list-style: none;
  padding: 0;
  margin: 0 0 1.5rem 0;
}

.consent-terms li {
  padding: 0.5rem 0;
  color: #6b7280;
  font-size: 0.875rem;
  position: relative;
  padding-left: 1.5rem;
}

.consent-terms li:before {
  content: "✓";
  position: absolute;
  left: 0;
  color: #10b981;
  font-weight: bold;
}

.consent-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.btn-primary,
.btn-secondary {
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background: #2563eb;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

/* Main Panel */
.file-share-panel {
  padding: 1rem;
  border-radius: 0.75rem;
  border: 1px solid #e5e7eb;
  background: white;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 320px;
  max-width: 400px;
}

.file-share-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.file-share-panel__title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.file-share-panel__status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-indicator {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;
  background: #9ca3af;
  transition: all 0.3s;
}

.status-indicator.status-connected {
  background: #10b981;
  box-shadow: 0 0 0.5rem rgba(16, 185, 129, 0.5);
}

.status-indicator.status-fallback {
  background: #f59e0b;
  box-shadow: 0 0 0.5rem rgba(245, 158, 11, 0.5);
}

.status-indicator.status-disabled {
  background: #ef4444;
}

.status-text {
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
}

/* Transfer Method Info */
.file-share-panel__method-info {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  padding: 0.75rem;
  margin-top: 0.5rem;
}

.method-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.method-item:last-child {
  margin-bottom: 0;
}

.method-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #374151;
  font-weight: 500;
}

.method-icon {
  width: 1rem;
  height: 1rem;
}

.method-status {
  font-size: 0.75rem;
  color: #6b7280;
  font-weight: 500;
}

.method-status.method-available {
  color: #10b981;
}

/* Send Button */
.file-share-panel__send-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  background: #3b82f6;
  color: white;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;
}

.file-share-panel__send-btn:hover:not(:disabled) {
  background: #2563eb;
  transform: translateY(-1px);
}

.file-share-panel__send-btn:disabled,
.file-share-panel__send-btn.btn-disabled {
  background: #9ca3af;
  cursor: not-allowed;
  transform: none;
}

.file-share-panel__send-icon {
  width: 1.25rem;
  height: 1.25rem;
}

.file-share-panel__spinner {
  width: 1.25rem;
  height: 1.25rem;
  border: 2px solid white;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.file-share-panel__file-input {
  display: none;
}

/* Progress Bar */
.file-share-panel__progress {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.file-share-panel__progress-bar {
  flex: 1;
  height: 0.5rem;
  background: #e5e7eb;
  border-radius: 9999px;
  overflow: hidden;
}

.file-share-panel__progress-fill {
  height: 100%;
  background: #3b82f6;
  transition: width 0.3s;
}

.file-share-panel__progress-text {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

/* File Lists */
.file-share-panel__section {
  margin-top: 1rem;
}

.file-share-panel__section-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  margin: 0 0 0.5rem 0;
}

.file-share-panel__file-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.file-share-panel__file-item {
  padding: 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
}

.file-share-panel__file-item--incoming {
  background: #f0fdf4;
  border-color: #bbf7d0;
}

.file-share-panel__file-info {
  margin-bottom: 0.5rem;
}

.file-share-panel__file-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: none;
  border: none;
  color: #2563eb;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
}

.file-share-panel__file-link:hover {
  color: #1d4ed8;
}

.download-icon {
  width: 1rem;
  height: 1rem;
}

.file-share-panel__file-meta {
  font-size: 0.75rem;
  color: #6b7280;
  display: block;
  margin-top: 0.25rem;
}

.file-share-panel__security-note {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: #10b981;
}

.security-icon {
  width: 0.875rem;
  height: 0.875rem;
}

/* Empty State */
.file-share-panel__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 2rem 1rem;
  text-align: center;
}

.file-share-panel__empty-icon {
  width: 3rem;
  height: 3rem;
  color: #d1d5db;
}

.file-share-panel__empty-text {
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
  margin: 0;
}

.file-share-panel__empty-subtitle {
  font-size: 0.75rem;
  color: #9ca3af;
  margin: 0;
}

/* Privacy Notice */
.file-share-panel__privacy {
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem;
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 0.5rem;
  margin-top: 1rem;
}

.privacy-icon {
  flex-shrink: 0;
  width: 1.25rem;
  height: 1.25rem;
  color: #0284c7;
}

.privacy-text {
  font-size: 0.75rem;
  color: #0c4a6e;
  line-height: 1.4;
}

.privacy-text p {
  margin: 0 0 0.25rem 0;
}

.privacy-text p:last-child {
  margin-bottom: 0;
}

.file-share-panel__header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

@media (max-width: 480px) {
  .file-share-panel__header-actions {
    gap: 0.25rem;
  }
}

.file-share-panel__title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
}

/* Sync Buttons */
.file-share-panel__sync-btn {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.375rem 0.75rem;
  border-radius: 0.375rem;
  border: 1px solid;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 0;
}

.file-share-panel__sync-btn--request {
  background: #f0f9ff;
  border-color: #0ea5e9;
  color: #0c4a6e;
}

.file-share-panel__sync-btn--request:hover {
  background: #e0f2fe;
  border-color: #0284c7;
  transform: translateY(-1px);
}

.file-share-panel__sync-btn--broadcast {
  background: #f0fdf4;
  border-color: #22c55e;
  color: #166534;
}

.file-share-panel__sync-btn--broadcast:hover {
  background: #dcfce7;
  border-color: #16a34a;
  transform: translateY(-1px);
}

.file-share-panel__sync-icon {
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
}

.file-share-panel__sync-text {
  white-space: nowrap;
}

/* Clear Button */
.file-share-panel__clear-btn {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.375rem 0.75rem;
  border-radius: 0.375rem;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
  color: #6b7280;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.file-share-panel__clear-btn:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
  color: #374151;
  transform: translateY(-1px);
}

.file-share-panel__clear-icon {
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
}

/* Responsive adjustments */
@media (max-width: 480px) {
  .file-share-panel__sync-btn,
  .file-share-panel__clear-btn {
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
  }

  .file-share-panel__sync-text {
    display: none;
  }

  .file-share-panel__sync-icon,
  .file-share-panel__clear-icon {
    width: 0.875rem;
    height: 0.875rem;
  }
}

.file-share-panel__send {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.file-share-panel__send-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  background: #2563eb;
  color: white;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s;
}

.file-share-panel__send-btn:not(:disabled):hover {
  background: #1d4ed8;
}

.file-share-panel__send-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.file-share-panel__send-icon {
  width: 1.25rem;
  height: 1.25rem;
}

.file-share-panel__spinner {
  width: 1.25rem;
  height: 1.25rem;
  border: 2px solid white;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.file-share-panel__file-input {
  display: none;
}

.file-share-panel__progress {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.file-share-panel__progress-bar {
  flex: 1;
  height: 0.5rem;
  background: #e5e7eb;
  border-radius: 9999px;
  overflow: hidden;
}

.file-share-panel__progress-fill {
  height: 100%;
  background: #2563eb;
  transition: width 0.3s;
}

.file-share-panel__progress-text {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.file-share-panel__error {
  padding: 0.75rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 0.5rem;
  color: #b91c1c;
  font-size: 0.875rem;
}

.file-share-panel__section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.file-share-panel__section-title {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.file-share-panel__file-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.file-share-panel__file-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid;
}

.file-share-panel__file-item--outgoing {
  background: #eff6ff;
  border-color: #bfdbfe;
}

.file-share-panel__file-item--incoming {
  background: #f0fdf4;
  border-color: #bbf7d0;
}

.file-share-panel__file-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
  min-width: 0;
}

.file-share-panel__file-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: #111827;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-share-panel__file-link {
  font-size: 0.875rem;
  font-weight: 500;
  color: #2563eb;
  text-decoration: underline;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-share-panel__file-link:hover {
  color: #1d4ed8;
}

.file-share-panel__file-meta {
  font-size: 0.75rem;
  color: #6b7280;
}

.file-share-panel__file-status {
  display: flex;
  align-items: center;
}

.file-share-panel__file-progress {
  font-size: 0.75rem;
  font-weight: 500;
  color: #2563eb;
}

.file-share-panel__file-status-icon {
  width: 1.25rem;
  height: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: white;
  font-size: 0.875rem;
  font-weight: bold;
}

.file-share-panel__file-status-icon--success {
  background: #10b981;
}

.file-share-panel__file-status-icon--error {
  background: #ef4444;
}

.file-share-panel__ephemeral-note {
  font-size: 0.75rem;
  color: #9ca3af;
  font-style: italic;
}

.file-share-panel__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 2rem 0;
  text-align: center;
}

.file-share-panel__empty-icon {
  width: 3rem;
  height: 3rem;
  color: #d1d5db;
}

.file-share-panel__empty-text {
  font-size: 0.875rem;
  color: #6b7280;
}

.file-share-panel__placeholder {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.file-share-panel__file-name--placeholder {
  color: #9ca3af;
  font-style: italic;
}

.file-share-panel__placeholder-note {
  font-size: 0.75rem;
  color: #d1d5db;
  font-style: italic;
}

/* File Size Info */
.file-share-panel__size-info {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  padding: 0.75rem;
  font-size: 0.75rem;
}

.size-info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.25rem;
}

.size-info-item:last-child {
  margin-bottom: 0;
}

.size-info-label {
  color: #64748b;
  font-weight: 500;
}

.size-info-value {
  color: #0f172a;
  font-weight: 600;
}

/* GDPR Consent Notice */
.file-share-panel__consent {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem;
  background: #fef3c7;
  border: 1px solid #fbbf24;
  border-radius: 0.375rem;
  margin-top: 0.5rem;
}

.consent-icon {
  flex-shrink: 0;
  width: 1rem;
  height: 1rem;
  color: #d97706;
}

.consent-icon svg {
  width: 100%;
  height: 100%;
}

.consent-text {
  font-size: 0.75rem;
  color: #92400e;
  line-height: 1.4;
  margin: 0;
}

@media (max-width: 480px) {
  .file-share-panel__size-info {
    padding: 0.5rem;
    font-size: 0.625rem;
  }

  .size-info-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.125rem;
  }

  .file-share-panel__consent {
    padding: 0.5rem;
  }

  .consent-text {
    font-size: 0.625rem;
  }
}

/* File status indicators */
.file-status {
  margin-left: 0.5rem;
  font-weight: 500;
  font-size: 0.875rem;
}

.status-sent {
  color: #16a34a;
}

.status-sending {
  color: #f59e0b;
}

.status-failed {
  color: #dc2626;
}

.file-icon {
  width: 1rem;
  height: 1rem;
  margin-right: 0.5rem;
  display: inline-block;
  vertical-align: middle;
}

.file-share-panel__file-name {
  display: flex;
  align-items: center;
  color: #1f2937;
  font-weight: 500;
}
</style>
