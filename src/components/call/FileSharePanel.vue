<script setup lang="ts">
import { ref, computed, toRef } from "vue";
import { useDailyFileChannel } from "@/composables/useDailyFileChannel";

const props = defineProps<{
  callFrame: any;
  recipient?: string;
}>();

const enabled = computed(
  () => import.meta.env.VITE_FILE_TRANSFER_ENABLED === "true"
);

// Use toRef to avoid reactive issues with props
const callFrameRef = toRef(props, "callFrame");
const {
  sendFile,
  sending,
  progress,
  completedFiles,
  outgoingFiles,
  resetAll,
  error,
  isEnabled,
  requestFileList,
  sendFileListToParticipant,
} = useDailyFileChannel(callFrameRef);

const fileInput = ref<HTMLInputElement | null>(null);

function pickFile() {
  if (enabled.value && !sending.value) {
    fileInput.value?.click();
  }
}

async function onFileChange(e: Event) {
  const tgt = e.target as HTMLInputElement;
  const file = tgt.files?.[0];
  if (!file) return;

  try {
    await sendFile(file, props.recipient ?? "*");
  } catch (err: any) {
    let message = "Failed to send file.";

    if (err?.message === "FILE_TOO_LARGE") {
      const maxMB = Math.round(
        Number(import.meta.env.VITE_FILE_TRANSFER_MAX_BYTES ?? 10485760) /
          (1024 * 1024)
      );
      message = `File is too large (limit: ${maxMB}MB).`;
    } else if (err?.message === "FILE_TRANSFER_DISABLED") {
      message = "File transfer is disabled.";
    } else if (err?.message === "CALL_FRAME_NOT_AVAILABLE") {
      message = "Video call not active.";
    }

    alert(message);
  } finally {
    tgt.value = "";
  }
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

function broadcastFiles() {
  // Broadcast files to all participants
  sendFileListToParticipant("*");
}
</script>

<template>
  <div class="file-share-panel">
    <div class="file-share-panel__header">
      <h3 class="file-share-panel__title">File Transfer</h3>
      <div class="file-share-panel__header-actions">
        <button
          @click="requestFileList"
          class="file-share-panel__sync-btn file-share-panel__sync-btn--request"
          title="Request files from other participants"
        >
          <svg
            class="file-share-panel__sync-icon"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span class="file-share-panel__sync-text">Sync</span>
        </button>
        <button
          @click="broadcastFiles"
          class="file-share-panel__sync-btn file-share-panel__sync-btn--broadcast"
          title="Share my files with all participants"
        >
          <svg
            class="file-share-panel__sync-icon"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
            />
          </svg>
          <span class="file-share-panel__sync-text">Share</span>
        </button>
        <button
          v-if="completedFiles.length > 0 || outgoingFiles.length > 0"
          @click="resetAll"
          class="file-share-panel__clear-btn"
          title="Clear all files"
        >
          <svg
            class="file-share-panel__clear-icon"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
          Clear
        </button>
      </div>
    </div>

    <!-- Send File Section -->
    <div class="file-share-panel__send">
      <button
        @click="pickFile"
        :disabled="sending || !enabled"
        :aria-disabled="sending || !enabled"
        class="file-share-panel__send-btn"
      >
        <svg
          v-if="!sending"
          class="file-share-panel__send-icon"
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
        <div v-else class="file-share-panel__spinner"></div>
        {{
          enabled ? (sending ? "Sending…" : "Send File") : "Transfer Disabled"
        }}
      </button>

      <input
        ref="fileInput"
        type="file"
        class="file-share-panel__file-input"
        @change="onFileChange"
      />

      <!-- Progress indicator -->
      <div v-if="sending" class="file-share-panel__progress">
        <div class="file-share-panel__progress-bar">
          <div
            class="file-share-panel__progress-fill"
            :style="{ width: `${progress}%` }"
          ></div>
        </div>
        <span class="file-share-panel__progress-text">{{ progress }}%</span>
      </div>
    </div>

    <!-- Error Display -->
    <div v-if="error" class="file-share-panel__error">
      {{ error }}
    </div>

    <!-- Outgoing Files -->
    <div v-if="outgoingFiles.length > 0" class="file-share-panel__section">
      <h4 class="file-share-panel__section-title">Sent Files</h4>
      <div class="file-share-panel__file-list">
        <div
          v-for="file in outgoingFiles"
          :key="file.fileId"
          class="file-share-panel__file-item file-share-panel__file-item--outgoing"
        >
          <div class="file-share-panel__file-info">
            <span class="file-share-panel__file-name">{{ file.name }}</span>
            <span class="file-share-panel__file-meta">
              {{ formatFileSize(file.size) }} •
              {{ formatTimestamp(file.timestamp) }}
            </span>
          </div>
          <div class="file-share-panel__file-status">
            <div
              v-if="file.status === 'sending'"
              class="file-share-panel__file-progress"
            >
              {{ file.progress }}%
            </div>
            <div
              v-else-if="file.status === 'completed'"
              class="file-share-panel__file-status-icon file-share-panel__file-status-icon--success"
            >
              ✓
            </div>
            <div
              v-else-if="file.status === 'error'"
              class="file-share-panel__file-status-icon file-share-panel__file-status-icon--error"
            >
              ✗
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Received Files -->
    <div v-if="completedFiles.length > 0" class="file-share-panel__section">
      <h4 class="file-share-panel__section-title">Received Files</h4>
      <div class="file-share-panel__file-list">
        <div
          v-for="file in completedFiles"
          :key="file.fileId"
          class="file-share-panel__file-item file-share-panel__file-item--incoming"
        >
          <div class="file-share-panel__file-info">
            <!-- Show different content for placeholder files -->
            <div
              v-if="file.url === '#placeholder'"
              class="file-share-panel__placeholder"
            >
              <span
                class="file-share-panel__file-name file-share-panel__file-name--placeholder"
              >
                {{ file.name }}
              </span>
              <span class="file-share-panel__placeholder-note">
                (shared before you joined - metadata only)
              </span>
            </div>
            <a
              v-else
              :href="file.url"
              :download="file.name"
              class="file-share-panel__file-link"
              :title="`Download ${file.name}`"
            >
              {{ file.name }}
            </a>
            <span class="file-share-panel__file-meta">
              {{ formatFileSize(file.size) }} •
              {{ formatTimestamp(file.timestamp) }}
            </span>
          </div>
          <span
            v-if="file.url !== '#placeholder'"
            class="file-share-panel__ephemeral-note"
          >
            (ephemeral; cleared when you leave)
          </span>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-if="
        completedFiles.length === 0 && outgoingFiles.length === 0 && !sending
      "
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
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      <p class="file-share-panel__empty-text">
        {{ enabled ? "No files shared yet" : "File transfer is disabled" }}
      </p>
    </div>
  </div>
</template>

<style scoped>
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
</style>
