<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-3xl font-bold">Appointment Management</h1>
        <p class="text-muted-foreground">
          Manage your patient appointments and schedule
        </p>
      </div>
      <div class="flex gap-2">
        <Button @click="refreshAppointments" variant="outline" size="sm">
          <RefreshCw :class="cn('mr-2 h-4 w-4', isLoading && 'animate-spin')" />
          Refresh
        </Button>
      </div>
    </div>

    <!-- Tabs -->
    <Card>
      <CardHeader>
        <div class="flex items-center gap-2 border-b">
          <Button
            :variant="activeFilter === 'upcoming' ? 'default' : 'ghost'"
            @click="activeFilter = 'upcoming'"
            class="rounded-b-none"
          >
            Upcoming
            <Badge class="ml-2" variant="secondary">{{ stats.upcoming }}</Badge>
          </Button>
          <Button
            :variant="activeFilter === 'completed' ? 'default' : 'ghost'"
            @click="activeFilter = 'completed'"
            class="rounded-b-none"
          >
            Completed
            <Badge class="ml-2" variant="secondary">{{
              stats.completed
            }}</Badge>
          </Button>
          <Button
            :variant="activeFilter === 'cancelled' ? 'default' : 'ghost'"
            @click="activeFilter = 'cancelled'"
            class="rounded-b-none"
          >
            Cancelled
            <Badge class="ml-2" variant="secondary">{{
              stats.cancelled
            }}</Badge>
          </Button>
          <Button
            :variant="activeFilter === 'all' ? 'default' : 'ghost'"
            @click="activeFilter = 'all'"
            class="rounded-b-none"
          >
            Total
            <Badge class="ml-2" variant="secondary">{{ stats.total }}</Badge>
          </Button>
        </div>
      </CardHeader>
    </Card>

    <!-- Appointments Table -->
    <Card>
      <CardHeader>
        <CardTitle>Appointments</CardTitle>
      </CardHeader>
      <CardContent>
        <div v-if="isLoading" class="flex items-center justify-center p-8">
          <Loader2 class="h-8 w-8 animate-spin" />
          <span class="ml-2">Loading appointments...</span>
        </div>

        <div
          v-else-if="filteredAppointments.length === 0"
          class="text-center py-8"
        >
          <Calendar class="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p class="text-lg font-semibold">No appointments found</p>
          <p class="text-muted-foreground">
            Adjust your filters or check back later
          </p>
        </div>

        <div v-else class="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead class="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow
                v-for="appointment in filteredAppointments"
                :key="appointment._id"
                class="cursor-pointer hover:bg-muted/50"
                @click="navigateToAppointment(appointment._id)"
              >
                <TableCell>
                  <div>
                    <p class="font-medium">{{ patientName(appointment) }}</p>
                    <p class="text-sm text-muted-foreground">
                      {{ patientEmail(appointment) }}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <p class="font-medium">
                      {{ formatDate(appointmentDate(appointment)) }}
                    </p>
                    <p class="text-sm text-muted-foreground">
                      {{ formatTime(appointmentTime(appointment)) }}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    :variant="getTypeVariant(appointmentType(appointment))"
                  >
                    {{ appointmentType(appointment) }}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge :variant="getStatusVariant(appointment.status)">
                    {{ appointment.status }}
                  </Badge>
                </TableCell>
                <TableCell>
                  <p
                    class="text-sm max-w-xs truncate"
                    :title="appointment.notes"
                  >
                    {{ appointment.notes || "No notes" }}
                  </p>
                </TableCell>
                <TableCell class="text-right" @click.stop>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal class="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        v-if="
                          appointment.plan === 'consultation' &&
                          appointment.isJoinable
                        "
                        @click="joinMeeting(appointment)"
                      >
                        <Video class="mr-2 h-4 w-4" />
                        Join Meeting
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        v-else-if="
                          appointment.plan === 'consultation' &&
                          appointment.minutesUntilJoinable &&
                          appointment.minutesUntilJoinable > 0
                        "
                        disabled
                      >
                        <Clock class="mr-2 h-4 w-4" />
                        Available in {{ appointment.minutesUntilJoinable }}min
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        v-if="appointment.status === 'upcoming'"
                        @click="showCancelModal(appointment)"
                      >
                        <XCircle class="mr-2 h-4 w-4" />
                        Cancel
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>

    <!-- Cancel Appointment Dialog -->
    <Dialog v-model:open="showCancelDialog">
      <DialogContent class="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Cancel Appointment</DialogTitle>
          <DialogDescription>
            Please provide a reason for cancelling this appointment. This will
            be shared with the patient.
          </DialogDescription>
        </DialogHeader>

        <form @submit.prevent="confirmCancelAppointment" class="space-y-4">
          <div class="space-y-2">
            <Label for="cancelReason">Reason for cancellation *</Label>
            <Textarea
              id="cancelReason"
              v-model="cancelReason"
              placeholder="Please explain why you need to cancel this appointment..."
              rows="4"
              maxlength="500"
              required
              :class="{ 'border-red-500': cancelError }"
            />
            <div class="text-sm text-gray-500 text-right">
              {{ cancelReason.length }}/500
            </div>
            <div v-if="cancelError" class="text-sm text-red-500">
              {{ cancelError }}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" @click="hideCancelModal">
              Keep Appointment
            </Button>
            <Button
              type="submit"
              variant="destructive"
              :disabled="isCancelling || !cancelReason.trim()"
            >
              <span v-if="isCancelling">Cancelling...</span>
              <span v-else>Cancel Appointment</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { useApi } from "@/composables/useApi";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Icons
import {
  RefreshCw,
  Calendar,
  Clock,
  XCircle,
  MoreHorizontal,
  Loader2,
  Video,
} from "lucide-vue-next";

import { cn } from "@/lib/utils";

// Types
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
  status: "upcoming" | "cancelled" | "completed";
  reason?: string;
  notes?: string;
  cancelledBy?: "patient" | "doctor";
  cancelReason?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
  meetingRoomName?: string;
  meetingUrl?: string;
  isJoinable?: boolean;
  minutesUntilJoinable?: number;
  hasPassed?: boolean;
}

// State
const router = useRouter();
const appointments = ref<Appointment[]>([]);
const isLoading = ref(false);

// Cancel modal state
const showCancelDialog = ref(false);
const selectedCancelAppointment = ref<Appointment | null>(null);
const cancelReason = ref("");
const cancelError = ref("");
const isCancelling = ref(false);

// Filters
const activeFilter = ref<"all" | "upcoming" | "completed" | "cancelled">(
  "upcoming"
);

// API
const { appointments: appointmentsApi } = useApi();

// Computed
const filteredAppointments = computed(() => {
  let filtered = appointments.value;

  if (activeFilter.value !== "all") {
    filtered = filtered.filter((apt) => apt.status === activeFilter.value);
  }

  return filtered.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
});

const stats = computed(() => {
  const total = appointments.value.length;
  const upcoming = appointments.value.filter(
    (apt) => apt.status === "upcoming"
  ).length;
  const completed = appointments.value.filter(
    (apt) => apt.status === "completed"
  ).length;
  const cancelled = appointments.value.filter(
    (apt) => apt.status === "cancelled"
  ).length;

  return { total, upcoming, completed, cancelled };
});

// Methods
const fetchAppointments = async () => {
  try {
    isLoading.value = true;
    const response = await appointmentsApi.getAll();
    appointments.value = response.data || response;
  } catch (error) {
    console.error("Failed to fetch appointments:", error);
  } finally {
    isLoading.value = false;
  }
};

const refreshAppointments = () => {
  fetchAppointments();
};

const navigateToAppointment = (appointmentId: string) => {
  router.push(`/appointments/${appointmentId}`);
};

const joinMeeting = (appointment: Appointment) => {
  if (!appointment.meetingUrl) {
    alert("Meeting URL not available. Please contact support.");
    return;
  }

  // Navigate to the meeting page
  router.push(`/meeting/${appointment._id}`);
};

// Cancel modal methods
const showCancelModal = (appointment: Appointment) => {
  selectedCancelAppointment.value = appointment;
  cancelReason.value = "";
  cancelError.value = "";
  showCancelDialog.value = true;
};

const hideCancelModal = () => {
  showCancelDialog.value = false;
  selectedCancelAppointment.value = null;
  cancelReason.value = "";
  cancelError.value = "";
};

const confirmCancelAppointment = async () => {
  if (!selectedCancelAppointment.value) return;

  if (!cancelReason.value.trim()) {
    cancelError.value = "Please provide a reason for cancellation";
    return;
  }

  if (cancelReason.value.trim().length < 10) {
    cancelError.value = "Reason must be at least 10 characters long";
    return;
  }

  isCancelling.value = true;
  cancelError.value = "";

  try {
    await appointmentsApi.cancel(
      selectedCancelAppointment.value._id,
      cancelReason.value.trim()
    );
    await fetchAppointments();
    hideCancelModal();
  } catch (error) {
    console.error("Failed to cancel appointment:", error);
    cancelError.value = "Failed to cancel appointment. Please try again.";
  } finally {
    isCancelling.value = false;
  }
};

const formatDate = (dateString: string) => {
  // Parse the UTC date from database and display in local time
  return new Date(dateString).toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatTime = (timeString: string) => {
  return timeString;
};

const getStatusVariant = (status: string) => {
  switch (status) {
    case "pending":
      return "secondary";
    case "confirmed":
      return "default";
    case "completed":
      return "default";
    case "cancelled":
      return "destructive";
    default:
      return "default";
  }
};

const getTypeVariant = (type: string) => {
  switch (type) {
    case "consultation":
      return "default";
    case "follow-up":
      return "secondary";
    case "emergency":
      return "destructive";
    default:
      return "default";
  }
};

// Computed properties for UI
const patientName = (appointment: Appointment) => {
  if (!appointment.patientId) return "Unknown Patient";
  return `${appointment.patientId.firstName || "Unknown"} ${appointment.patientId.lastName || "Patient"}`;
};
const patientEmail = (appointment: Appointment) =>
  appointment.patientId?.email || "No email";
const appointmentDate = (appointment: Appointment) => appointment.date;
const appointmentTime = (appointment: Appointment) => appointment.slot;
const appointmentType = (appointment: Appointment) => appointment.plan;

// Timer for real-time updates
let updateTimer: number | null = null;

const startUpdateTimer = () => {
  if (updateTimer) {
    clearInterval(updateTimer);
  }

  // Disable auto-refresh in production to prevent page reloading issues
  if (import.meta.env.DEV) {
    // Only enable auto-refresh in development
    updateTimer = setInterval(() => {
      fetchAppointments();
    }, 120000); // Every 2 minutes in development only
    console.log("📅 Auto-refresh enabled in development mode");
  } else {
    console.log("📅 Auto-refresh disabled in production");
  }
};

const stopUpdateTimer = () => {
  if (updateTimer) {
    clearInterval(updateTimer);
    updateTimer = null;
  }
};

// Lifecycle
onMounted(() => {
  fetchAppointments();
  startUpdateTimer();
});

onUnmounted(() => {
  stopUpdateTimer();
});
</script>

<style scoped>
.appointments-view {
  @apply p-6;
}
</style>
