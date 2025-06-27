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

    <!-- Filters -->
    <Card>
      <CardHeader>
        <CardTitle>Filter Appointments</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label for="status-filter">Status</Label>
            <Select v-model="filters.status">
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label for="date-filter">Date Range</Label>
            <Select v-model="filters.dateRange">
              <SelectTrigger>
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="tomorrow">Tomorrow</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="flex items-end">
            <Button @click="applyFilters" class="w-full">
              <Search class="mr-2 h-4 w-4" />
              Apply Filters
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Statistics -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardContent class="pt-6">
          <div class="flex items-center space-x-2">
            <Calendar class="h-8 w-8 text-blue-600" />
            <div>
              <p class="text-2xl font-bold">{{ stats.total }}</p>
              <p class="text-sm text-muted-foreground">Total Appointments</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent class="pt-6">
          <div class="flex items-center space-x-2">
            <Clock class="h-8 w-8 text-yellow-600" />
            <div>
              <p class="text-2xl font-bold">{{ stats.pending }}</p>
              <p class="text-sm text-muted-foreground">Pending</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent class="pt-6">
          <div class="flex items-center space-x-2">
            <CheckCircle class="h-8 w-8 text-green-600" />
            <div>
              <p class="text-2xl font-bold">{{ stats.confirmed }}</p>
              <p class="text-sm text-muted-foreground">Confirmed</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent class="pt-6">
          <div class="flex items-center space-x-2">
            <CheckCircle class="h-8 w-8 text-blue-600" />
            <div>
              <p class="text-2xl font-bold">{{ stats.completed }}</p>
              <p class="text-sm text-muted-foreground">Completed</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent class="pt-6">
          <div class="flex items-center space-x-2">
            <XCircle class="h-8 w-8 text-red-600" />
            <div>
              <p class="text-2xl font-bold">{{ stats.cancelled }}</p>
              <p class="text-sm text-muted-foreground">Cancelled</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

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
                <TableCell class="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal class="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem @click="viewAppointment(appointment)">
                        <Eye class="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        v-if="
                          appointment.plan === 'consultation' &&
                          appointment.status === 'confirmed' &&
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
                          appointment.status === 'confirmed' &&
                          appointment.minutesUntilJoinable &&
                          appointment.minutesUntilJoinable > 0
                        "
                        disabled
                      >
                        <Clock class="mr-2 h-4 w-4" />
                        Available in {{ appointment.minutesUntilJoinable }}min
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        v-if="appointment.status === 'pending'"
                        @click="confirmAppointment(appointment)"
                      >
                        <CheckCircle class="mr-2 h-4 w-4" />
                        Confirm Appointment
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        v-if="
                          appointment.status === 'pending' ||
                          appointment.status === 'confirmed'
                        "
                        @click="startAppointment(appointment)"
                      >
                        <Play class="mr-2 h-4 w-4" />
                        Start Appointment
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        v-if="
                          appointment.status === 'pending' ||
                          appointment.status === 'confirmed'
                        "
                        @click="completeAppointment(appointment)"
                      >
                        <CheckCircle class="mr-2 h-4 w-4" />
                        Mark Complete
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        v-if="
                          appointment.status === 'pending' ||
                          appointment.status === 'confirmed'
                        "
                        @click="cancelAppointment(appointment)"
                      >
                        <XCircle class="mr-2 h-4 w-4" />
                        Cancel
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        v-if="
                          appointment.status === 'pending' ||
                          appointment.status === 'confirmed'
                        "
                        @click="markNoShow(appointment)"
                      >
                        <UserX class="mr-2 h-4 w-4" />
                        Mark No Show
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

    <!-- Appointment Details Modal -->
    <Dialog v-model:open="showDetailsModal">
      <DialogContent class="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Appointment Details</DialogTitle>
        </DialogHeader>
        <div v-if="selectedAppointment" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <Label class="text-sm font-medium">Patient Name</Label>
              <p class="text-sm">{{ patientName(selectedAppointment) }}</p>
            </div>
            <div>
              <Label class="text-sm font-medium">Email</Label>
              <p class="text-sm">{{ patientEmail(selectedAppointment) }}</p>
            </div>
            <div>
              <Label class="text-sm font-medium">Phone</Label>
              <p class="text-sm">Not provided</p>
            </div>
            <div>
              <Label class="text-sm font-medium">Date of Birth</Label>
              <p class="text-sm">Not provided</p>
            </div>
            <div>
              <Label class="text-sm font-medium">Date</Label>
              <p class="text-sm">
                {{ formatDate(appointmentDate(selectedAppointment)) }}
              </p>
            </div>
            <div>
              <Label class="text-sm font-medium">Time</Label>
              <p class="text-sm">
                {{ formatTime(appointmentTime(selectedAppointment)) }}
              </p>
            </div>
            <div>
              <Label class="text-sm font-medium">Type</Label>
              <Badge
                :variant="getTypeVariant(appointmentType(selectedAppointment))"
              >
                {{ appointmentType(selectedAppointment) }}
              </Badge>
            </div>
            <div>
              <Label class="text-sm font-medium">Status</Label>
              <Badge :variant="getStatusVariant(selectedAppointment.status)">
                {{ selectedAppointment.status }}
              </Badge>
            </div>
          </div>
          <div>
            <Label class="text-sm font-medium">Reason for Visit</Label>
            <p class="text-sm">
              {{ selectedAppointment.reason || "Not provided" }}
            </p>
          </div>
          <div>
            <Label class="text-sm font-medium">Notes</Label>
            <p class="text-sm">{{ selectedAppointment.notes || "No notes" }}</p>
          </div>
        </div>
        <div class="flex justify-end space-x-2 mt-6">
          <Button variant="outline" @click="showDetailsModal = false"
            >Close</Button
          >
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useApi } from "@/composables/useApi";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Icons
import {
  RefreshCw,
  Search,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  MoreHorizontal,
  Eye,
  Play,
  UserX,
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
  plan: "prescription" | "consultation";
  status: "pending" | "confirmed" | "cancelled" | "completed";
  reason?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  meetingRoomName?: string;
  meetingUrl?: string;
  isJoinable?: boolean;
  minutesUntilJoinable?: number;
  hasPassed?: boolean;
}

// State
const appointments = ref<Appointment[]>([]);
const isLoading = ref(false);
const showDetailsModal = ref(false);
const selectedAppointment = ref<Appointment | null>(null);

// Filters
const filters = ref({
  status: "all",
  dateRange: "all",
});

// API
const { appointments: appointmentsApi } = useApi();

// Computed
const filteredAppointments = computed(() => {
  let filtered = appointments.value;

  if (filters.value.status && filters.value.status !== "all") {
    filtered = filtered.filter((apt) => apt.status === filters.value.status);
  }

  if (filters.value.dateRange && filters.value.dateRange !== "all") {
    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

    filtered = filtered.filter((apt) => {
      const aptDate = new Date(apt.date);

      switch (filters.value.dateRange) {
        case "today":
          return (
            aptDate >= startOfDay &&
            aptDate < new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)
          );
        case "tomorrow":
          const tomorrow = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
          return (
            aptDate >= tomorrow &&
            aptDate < new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000)
          );
        case "week":
          const weekEnd = new Date(
            startOfDay.getTime() + 7 * 24 * 60 * 60 * 1000
          );
          return aptDate >= startOfDay && aptDate < weekEnd;
        case "month":
          const monthEnd = new Date(
            today.getFullYear(),
            today.getMonth() + 1,
            1
          );
          return aptDate >= startOfDay && aptDate < monthEnd;
        default:
          return true;
      }
    });
  }

  return filtered.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
});

const stats = computed(() => {
  const total = appointments.value.length;
  const pending = appointments.value.filter(
    (apt) => apt.status === "pending"
  ).length;
  const confirmed = appointments.value.filter(
    (apt) => apt.status === "confirmed"
  ).length;
  const completed = appointments.value.filter(
    (apt) => apt.status === "completed"
  ).length;
  const cancelled = appointments.value.filter(
    (apt) => apt.status === "cancelled"
  ).length;

  return { total, pending, confirmed, completed, cancelled };
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

const applyFilters = () => {
  // Filters are applied through computed property
};

const viewAppointment = (appointment: Appointment) => {
  selectedAppointment.value = appointment;
  showDetailsModal.value = true;
};

const startAppointment = async (appointment: Appointment) => {
  // This would typically redirect to a video call interface
  console.log("Starting appointment:", appointment._id);
  // For now, just show an alert
  alert("Video call feature will be integrated here");
};

const joinMeeting = (appointment: Appointment) => {
  if (!appointment.meetingUrl) {
    alert("Meeting URL not available. Please contact support.");
    return;
  }

  // Navigate to the meeting page
  window.location.href = `/meeting/${appointment._id}`;
};

const confirmAppointment = async (appointment: Appointment) => {
  try {
    await appointmentsApi.confirm(appointment._id);
    await fetchAppointments();
  } catch (error) {
    console.error("Failed to confirm appointment:", error);
    alert("Failed to confirm appointment. Please try again.");
  }
};

const completeAppointment = async (appointment: Appointment) => {
  try {
    await appointmentsApi.complete(appointment._id);
    await fetchAppointments();
  } catch (error) {
    console.error("Failed to complete appointment:", error);
  }
};

const cancelAppointment = async (appointment: Appointment) => {
  try {
    await appointmentsApi.cancel(appointment._id);
    await fetchAppointments();
  } catch (error) {
    console.error("Failed to cancel appointment:", error);
  }
};

const markNoShow = async (appointment: Appointment) => {
  try {
    await appointmentsApi.updateStatus(appointment._id, "no-show");
    await fetchAppointments();
  } catch (error) {
    console.error("Failed to mark no show:", error);
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
const patientName = (appointment: Appointment) =>
  `${appointment.patientId.firstName} ${appointment.patientId.lastName}`;
const patientEmail = (appointment: Appointment) => appointment.patientId.email;
const appointmentDate = (appointment: Appointment) => appointment.date;
const appointmentTime = (appointment: Appointment) => appointment.slot;
const appointmentType = (appointment: Appointment) => appointment.plan;

// Lifecycle
onMounted(() => {
  fetchAppointments();
});
</script>

<style scoped>
.appointments-view {
  @apply p-6;
}
</style>
