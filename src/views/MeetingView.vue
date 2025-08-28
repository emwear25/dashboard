<template>
  <div class="meeting-container">
    <div
      v-if="loading"
      class="flex items-center justify-center h-screen bg-blue-500 text-white"
    >
      <div class="text-center">
        <Loader2 class="h-8 w-8 animate-spin mr-2" />
        <h1 class="text-2xl font-bold">
          🔵 LOADING STATE - Loading meeting...
        </h1>
        <p class="mt-2">If you see this, the component is loading</p>
      </div>
    </div>

    <div
      v-else-if="error"
      class="flex flex-col items-center justify-center h-screen space-y-4 bg-red-600 text-white"
    >
      <AlertTriangle class="h-16 w-16 text-yellow-400" />
      <h2 class="text-3xl font-bold">
        🔴 ERROR STATE - Unable to Join Meeting
      </h2>
      <p class="text-center max-w-md text-lg">{{ error }}</p>
      <p class="text-sm">
        If you see this, there's an error loading the meeting
      </p>
      <Button
        @click="$router.push('/appointments')"
        variant="outline"
        class="bg-white text-black"
      >
        <ArrowLeft class="mr-2 h-4 w-4" />
        Back to Appointments
      </Button>
    </div>

    <div v-else-if="appointment" class="h-screen flex flex-col">
      <!-- Meeting Header -->
      <div
        class="bg-white border-b px-4 md:px-6 py-3 md:py-4 flex flex-col md:flex-row justify-between items-start md:items-center relative z-30 shadow-sm"
      >
        <div class="flex-1 mb-2 md:mb-0">
          <h1 class="text-lg md:text-xl font-semibold text-gray-900">
            Video Consultation
          </h1>
          <div
            class="flex items-center space-x-4 text-sm text-muted-foreground mt-1"
          >
            <span class="font-medium text-primary">
              {{ patientName(appointment) }}
            </span>
            <span>{{
              formatDateTime(appointment.date, appointment.slot)
            }}</span>
          </div>
        </div>
        <div
          class="flex flex-col md:flex-row items-stretch md:items-center space-y-2 md:space-y-0 md:space-x-3 w-full md:w-auto"
        >
          <Button
            @click="toggleFilePanel"
            variant="outline"
            size="sm"
            class="flex items-center justify-center space-x-2 bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700 w-full md:w-auto"
          >
            <Files class="h-4 w-4" />
            <span class="text-sm">Files</span>
          </Button>
          <Button
            @click="leaveMeeting"
            variant="destructive"
            class="flex items-center space-x-2"
          >
            <PhoneOff class="h-4 w-4" />
            <span>Leave Meeting</span>
          </Button>
        </div>
      </div>

      <!-- Meeting Content with File Panel -->
      <div class="flex-1 flex relative">
        <!-- Daily.co Video Container -->
        <div id="daily-container" class="flex-1 bg-black"></div>

        <!-- File Transfer Panel (Sidebar) -->
        <div
          v-if="showFilePanel"
          class="absolute right-0 top-0 h-full w-full md:w-96 bg-white border-l shadow-lg z-10 overflow-y-auto"
        >
          <div class="p-4 border-b bg-gray-50">
            <div class="flex items-center justify-between">
              <h3 class="font-semibold text-gray-900">File Transfer</h3>
              <Button
                @click="toggleFilePanel"
                variant="ghost"
                size="sm"
                class="h-8 w-8 p-0"
              >
                <X class="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div class="p-4">
            <FileSharePanel :callFrame="dailyFrame" />
          </div>
        </div>

        <!-- Meeting not available overlay (only covers video area, not header) -->
        <div
          v-if="!appointment.isJoinable"
          class="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20"
        >
          <Card class="w-96">
            <CardContent class="pt-6 text-center">
              <Clock class="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 class="text-lg font-semibold mb-2">
                Meeting not yet available
              </h3>
              <p
                v-if="
                  appointment.minutesUntilJoinable &&
                  appointment.minutesUntilJoinable > 0
                "
                class="text-muted-foreground"
              >
                Meeting will be available in
                {{ appointment.minutesUntilJoinable }} minutes
              </p>
              <p
                v-else-if="appointment.hasPassed"
                class="text-muted-foreground"
              >
                This meeting has already ended
              </p>
              <Button
                @click="$router.push('/appointments')"
                variant="outline"
                class="mt-4"
              >
                Back to Appointments
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>

    <!-- FALLBACK STATE - If none of the above conditions match -->
    <div
      v-else
      class="flex items-center justify-center h-screen bg-purple-500 text-white"
    >
      <div class="text-center">
        <h1 class="text-3xl font-bold">🟣 FALLBACK STATE</h1>
        <p class="mt-2">Loading: {{ loading }}</p>
        <p>Error: {{ error }}</p>
        <p>Appointment: {{ appointment ? "exists" : "null" }}</p>
        <p class="mt-4">If you see this, none of the conditions matched</p>
        <Button
          @click="$router.push('/appointments')"
          variant="outline"
          class="bg-white text-black mt-4"
        >
          Back to Appointments
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import DailyIframe, { type DailyCall } from "@daily-co/daily-js";
import { useApi } from "@/composables/useApi";
import { useDoctorAuth } from "@/composables/useDoctorAuth";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import FileSharePanel from "@/components/call/FileSharePanel.vue";

// Icons
import {
  Loader2,
  AlertTriangle,
  ArrowLeft,
  PhoneOff,
  Clock,
  Files,
  X,
} from "lucide-vue-next";

interface Appointment {
  _id: string;
  doctorId: {
    _id: string;
    name: string;
    email: string;
    specialties: string[];
  };
  patientId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  date: string;
  slot: string;
  plan: "consultation";
  status: "pending" | "confirmed" | "cancelled" | "completed";
  reason?: string;
  notes?: string;
  meetingRoomName?: string;
  meetingUrl?: string;
  isJoinable?: boolean;
  minutesUntilJoinable?: number;
  hasPassed?: boolean;
}

const route = useRoute();
const router = useRouter();
const { appointments } = useApi();
const { doctor } = useDoctorAuth();

const appointmentId = route.params.id as string;
const loading = ref(true);
const error = ref("");
const appointment = ref<Appointment | null>(null);
// Using Daily.co SDK instead of direct iframe
const dailyFrame = ref<DailyCall | null>(null);
// File transfer panel state
const showFilePanel = ref(false);

const patientName = (apt: Appointment) => {
  return (
    `${apt.patientId?.firstName || ""} ${apt.patientId?.lastName || ""}`.trim() ||
    "Unknown Patient"
  );
};

const formatDateTime = (dateString: string, slot: string) => {
  // Parse the UTC date from database and display in local time
  const date = new Date(dateString);
  return `${date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })} at ${slot}`;
};

const fetchAppointment = async () => {
  try {
    loading.value = true;
    error.value = "";

    // Check if doctor is still authenticated
    if (!doctor.value) {
      error.value = "Please log in again to access this meeting";
      return;
    }

    const response = await appointments.getById(appointmentId);
    appointment.value = response.data || response;

    // Validate that this is a consultation appointment
    if (appointment.value?.plan !== "consultation") {
      error.value = "This appointment is not a video consultation";
      return;
    }

    // Check if meeting URL exists
    if (!appointment.value?.meetingUrl) {
      error.value = "Meeting URL not available. Please contact support.";
      return;
    }

    // Check if this doctor owns the appointment
    if (appointment.value?.doctorId?._id !== doctor.value?._id) {
      error.value = "You are not authorized to join this meeting";
      return;
    }

    // Check if appointment is joinable
    if (!appointment.value?.isJoinable) {
      if (appointment.value?.hasPassed) {
        error.value = "This meeting has already ended";
      } else if (
        appointment.value?.minutesUntilJoinable &&
        appointment.value.minutesUntilJoinable > 0
      ) {
        // Let it load but show waiting state
      } else {
        error.value = "Meeting is not yet available";
      }
    }
  } catch (err) {
    console.error("Error fetching appointment:", err);
    error.value = "Failed to load appointment details";
  } finally {
    loading.value = false;
  }
};

const initializeDaily = async () => {
  if (!appointment.value?.meetingUrl || !appointment.value?.isJoinable) {
    return;
  }

  try {
    // Clean up existing Daily.co frame if any
    if (dailyFrame.value) {
      await dailyFrame.value.destroy();
      dailyFrame.value = null;
    }

    const container = document.getElementById("daily-container");
    if (!container) {
      console.error("Daily container not found");
      return;
    }

    console.log(
      "Creating Daily.co frame with URL:",
      appointment.value.meetingUrl
    );

    const meetingUrl = String(appointment.value?.meetingUrl ?? "");

    // Pre-flight validation
    if (!meetingUrl.startsWith("https://")) {
      throw new Error("Invalid meeting URL");
    }

    // 🎯 Get doctor's name for Daily.co userName parameter
    let userName = "Doctor"; // Default fallback
    try {
      if (doctor.value?.name) {
        userName = `Dr. ${doctor.value.name}`;
      } else {
        console.warn("❌ No doctor name found");
      }
    } catch (nameErr) {
      console.error("❌ Could not get doctor name:", nameErr);
    }

    // Clear container
    container.innerHTML = "";

    // ✅ Use Daily.co SDK with userName option (proper way to set user name)

    const callFrame = DailyIframe.createFrame(container, {
      userName: userName,
      showLeaveButton: false, // Disable Daily's leave button to avoid conflicts
      showLocalVideo: true,
      showFullscreenButton: false, // Disable to avoid layout conflicts
      showParticipantsBar: true,
    });

    // Join the meeting
    await callFrame.join({ url: meetingUrl });

    dailyFrame.value = callFrame;
    console.log(
      "✅ Daily.co frame created and joined successfully with userName:",
      userName
    );
  } catch (err) {
    console.error("Error initializing Daily.co:", err);
    error.value = "Failed to initialize video call";
  }
};

const leaveMeeting = async () => {
  if (dailyFrame.value) {
    try {
      await dailyFrame.value.leave();
      await dailyFrame.value.destroy();
      dailyFrame.value = null;
    } catch (err) {
      console.error("Error leaving meeting:", err);
      dailyFrame.value = null; // Force cleanup
    }
  }
  router.push("/appointments");
};

const toggleFilePanel = () => {
  showFilePanel.value = !showFilePanel.value;
};

onMounted(async () => {
  await fetchAppointment();

  // Initialize Daily.co if appointment is joinable
  if (appointment.value?.isJoinable && appointment.value?.meetingUrl) {
    await nextTick(); // Ensure DOM is ready
    await initializeDaily();
  }
});

// ✅ Proper cleanup in onBeforeUnmount
onBeforeUnmount(async () => {
  if (dailyFrame.value) {
    try {
      await dailyFrame.value.leave();
      await dailyFrame.value.destroy();
      dailyFrame.value = null;
    } catch (err) {
      console.error("Error cleaning up Daily.co frame:", err);
    }
  }
});
</script>

<style scoped>
.meeting-container {
  height: 100vh;
  overflow: hidden;
}

/* Daily.co iframe styles */
:deep(#daily-container iframe) {
  width: 100%;
  height: 100%;
  border: none;
  border-radius: 0;
}

#daily-container {
  position: relative;
  z-index: 1;
}

/* iOS safe area support */
@supports (padding: max(0px)) {
  .meeting-container {
    padding-top: max(env(safe-area-inset-top), 0px);
    padding-bottom: max(env(safe-area-inset-bottom), 0px);
    padding-left: max(env(safe-area-inset-left), 0px);
    padding-right: max(env(safe-area-inset-right), 0px);
  }
}

/* Mobile optimizations */
@media (max-width: 768px) {
  .meeting-container {
    height: 100vh;
    height: 100dvh; /* Dynamic viewport height for mobile */
  }
}

/* Capacitor iOS specific styles */
@media (max-width: 768px) and (orientation: portrait) {
  .meeting-container {
    padding-top: max(env(safe-area-inset-top), 20px);
  }
}
</style>
