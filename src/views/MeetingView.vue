<template>
  <div class="meeting-container">
    <div v-if="loading" class="flex items-center justify-center h-screen">
      <Loader2 class="h-8 w-8 animate-spin mr-2" />
      <span>Loading meeting...</span>
    </div>

    <div
      v-else-if="error"
      class="flex flex-col items-center justify-center h-screen space-y-4"
    >
      <AlertTriangle class="h-16 w-16 text-red-500" />
      <h2 class="text-2xl font-bold">Unable to Join Meeting</h2>
      <p class="text-muted-foreground text-center max-w-md">{{ error }}</p>
      <Button @click="$router.push('/appointments')" variant="outline">
        <ArrowLeft class="mr-2 h-4 w-4" />
        Back to Appointments
      </Button>
    </div>

    <div v-else-if="appointment" class="h-screen flex flex-col">
      <!-- Meeting Header -->
      <div
        class="bg-white border-b px-6 py-4 flex justify-between items-center"
      >
        <div class="flex-1">
          <h1 class="text-xl font-semibold">Video Consultation</h1>
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
        <Button
          @click="leaveMeeting"
          variant="destructive"
          class="flex items-center space-x-2"
        >
          <PhoneOff class="h-4 w-4" />
          <span>Leave Meeting</span>
        </Button>
      </div>

      <!-- Daily.co Video Container -->
      <div id="daily-container" class="flex-1 bg-black"></div>

      <!-- Meeting not available overlay -->
      <div
        v-if="!appointment.isJoinable"
        class="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10"
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
            <p v-else-if="appointment.hasPassed" class="text-muted-foreground">
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

// Icons
import {
  Loader2,
  AlertTriangle,
  ArrowLeft,
  PhoneOff,
  Clock,
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
  plan: "prescription" | "consultation";
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
      console.log("Destroying existing Daily.co frame...");
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
    console.log("Meeting URL:", meetingUrl);
    if (!meetingUrl.startsWith("https://")) {
      throw new Error("Invalid meeting URL");
    }

    // 🎯 Get doctor's name for Daily.co userName parameter
    let userName = "Doctor"; // Default fallback
    try {
      console.log("🔍 Doctor data:", doctor.value);
      if (doctor.value?.name) {
        userName = `Dr. ${doctor.value.name}`;
        console.log("✅ Using doctor name:", userName);
      } else {
        console.warn("❌ No doctor name found");
        console.log("🔄 Using default 'Doctor' name");
      }
    } catch (nameErr) {
      console.error("❌ Could not get doctor name:", nameErr);
      console.log("🔄 Using fallback 'Doctor' name due to error");
    }

    // Clear container
    container.innerHTML = "";

    // ✅ Use Daily.co SDK with userName option (proper way to set user name)
    console.log("🎯 Creating Daily.co frame with userName:", userName);

    const callFrame = DailyIframe.createFrame(container, {
      userName: userName,
      showLeaveButton: true,
      showLocalVideo: true,
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
  console.log("Leaving meeting...");
  if (dailyFrame.value) {
    try {
      await dailyFrame.value.leave();
      await dailyFrame.value.destroy();
      dailyFrame.value = null;
      console.log("✅ Successfully left and destroyed Daily.co frame");
    } catch (err) {
      console.error("Error leaving meeting:", err);
      dailyFrame.value = null; // Force cleanup
    }
  }
  router.push("/appointments");
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
      console.log("✅ Daily.co frame cleaned up properly");
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
</style>
