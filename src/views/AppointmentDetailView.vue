<template>
  <div class="appointment-detail">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-4">
        <Button variant="ghost" size="icon" @click="goBack">
          <ArrowLeft class="h-5 w-5" />
        </Button>
        <div>
          <h1 class="text-3xl font-bold tracking-tight">Appointment Details</h1>
          <p class="text-muted-foreground mt-1">
            View and manage appointment information
          </p>
        </div>
      </div>
      <Button variant="outline" @click="refreshAppointment" :disabled="loading">
        <RefreshCw :class="['h-4 w-4 mr-2', { 'animate-spin': loading }]" />
        Refresh
      </Button>
    </div>

    <!-- Loading State -->
    <Card v-if="loading && !appointment" class="p-12">
      <div class="flex flex-col items-center justify-center space-y-4">
        <Loader2 class="h-12 w-12 animate-spin text-primary" />
        <p class="text-muted-foreground">Loading appointment details...</p>
      </div>
    </Card>

    <!-- Error State -->
    <Card v-else-if="error" class="p-12 border-destructive">
      <div class="flex flex-col items-center justify-center space-y-4">
        <XCircle class="h-12 w-12 text-destructive" />
        <div class="text-center">
          <h3 class="text-lg font-semibold mb-2">Failed to Load Appointment</h3>
          <p class="text-muted-foreground">{{ error }}</p>
        </div>
        <Button @click="goBack" variant="outline">Go Back</Button>
      </div>
    </Card>

    <!-- Appointment Details -->
    <div v-else-if="appointment" class="space-y-6">
      <!-- Status and Actions -->
      <Card>
        <CardHeader>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              <Badge
                :variant="getStatusVariant(appointment.status)"
                class="text-base px-3 py-1"
              >
                {{ appointment.status }}
              </Badge>
              <Badge
                :variant="getTypeVariant(appointment.plan)"
                class="text-base px-3 py-1"
              >
                {{ appointment.plan }}
              </Badge>
            </div>
            <div class="flex items-center gap-2">
              <Button
                v-if="
                  appointment.status === 'upcoming' && appointment.isJoinable
                "
                @click="joinMeeting"
                class="gap-2"
              >
                <Video class="h-4 w-4" />
                Join Meeting
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <MoreHorizontal class="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    v-if="appointment.status === 'upcoming'"
                    @click="openCancelDialog"
                    class="text-destructive focus:text-destructive"
                  >
                    <XCircle class="mr-2 h-4 w-4" />
                    Cancel Appointment
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    v-if="
                      appointment.status === 'upcoming' &&
                      !appointment.hasPassed
                    "
                    @click="openCompleteDialog"
                  >
                    <CheckCircle class="mr-2 h-4 w-4" />
                    Mark as Completed
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
      </Card>

      <!-- Patient Information -->
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <User class="h-5 w-5" />
            Patient Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-1">
              <Label class="text-sm font-medium text-muted-foreground"
                >Name</Label
              >
              <p class="text-base font-medium">
                {{ getPatientName(appointment.patientId) }}
              </p>
            </div>
            <div class="space-y-1">
              <Label class="text-sm font-medium text-muted-foreground"
                >Email</Label
              >
              <p class="text-base">
                {{ getPatientEmail(appointment.patientId) }}
              </p>
            </div>
            <div class="space-y-1">
              <Label class="text-sm font-medium text-muted-foreground"
                >Patient ID</Label
              >
              <p class="text-base font-mono text-sm">
                {{
                  typeof appointment.patientId === "string"
                    ? appointment.patientId
                    : appointment.patientId?._id
                }}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Appointment Information -->
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <Calendar class="h-5 w-5" />
            Appointment Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-1">
              <Label class="text-sm font-medium text-muted-foreground"
                >Date</Label
              >
              <p class="text-base font-medium">
                {{ formatDate(appointment.date) }}
              </p>
            </div>
            <div class="space-y-1">
              <Label class="text-sm font-medium text-muted-foreground"
                >Time</Label
              >
              <p class="text-base font-medium flex items-center gap-2">
                <Clock class="h-4 w-4" />
                {{ appointment.slot }}
              </p>
            </div>
            <div class="space-y-1">
              <Label class="text-sm font-medium text-muted-foreground"
                >Type</Label
              >
              <p class="text-base capitalize">{{ appointment.plan }}</p>
            </div>
            <div class="space-y-1">
              <Label class="text-sm font-medium text-muted-foreground"
                >Created</Label
              >
              <p class="text-base">
                {{ formatDateTime(appointment.createdAt) }}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Reason -->
      <Card v-if="appointment.reason">
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <FileText class="h-5 w-5" />
            Reason for Visit
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p class="text-base">{{ appointment.reason }}</p>
        </CardContent>
      </Card>

      <!-- Notes -->
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <FileText class="h-5 w-5" />
            Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p class="text-base" v-if="appointment.notes">
            {{ appointment.notes }}
          </p>
          <p class="text-muted-foreground" v-else>No notes added</p>
        </CardContent>
      </Card>

      <!-- Cancellation Information -->
      <Card
        v-if="appointment.status === 'cancelled' && appointment.cancelReason"
        class="border-destructive"
      >
        <CardHeader>
          <CardTitle class="flex items-center gap-2 text-destructive">
            <XCircle class="h-5 w-5" />
            Cancellation Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div class="space-y-4">
            <div class="flex items-center gap-4">
              <Badge variant="outline">
                Cancelled by:
                {{
                  appointment.cancelledBy === "doctor" ? "Doctor" : "Patient"
                }}
              </Badge>
              <span
                class="text-sm text-muted-foreground"
                v-if="appointment.cancelledAt"
              >
                {{ formatDateTime(appointment.cancelledAt) }}
              </span>
            </div>
            <div
              class="bg-destructive/10 border border-destructive/20 rounded-lg p-4"
            >
              <p class="text-sm font-medium text-destructive mb-2">Reason:</p>
              <p class="text-sm">{{ appointment.cancelReason }}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Cancel Dialog -->
    <Dialog v-model:open="showCancelDialog">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel Appointment</DialogTitle>
          <DialogDescription>
            Please provide a reason for cancelling this appointment.
          </DialogDescription>
        </DialogHeader>
        <div class="space-y-4 py-4">
          <Textarea
            v-model="cancelReason"
            placeholder="Enter cancellation reason..."
            :class="{ 'border-destructive': cancelError }"
          />
          <p v-if="cancelError" class="text-sm text-destructive">
            {{ cancelError }}
          </p>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            @click="closeCancelDialog"
            :disabled="isCancelling"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            @click="confirmCancel"
            :disabled="isCancelling"
          >
            <Loader2 v-if="isCancelling" class="mr-2 h-4 w-4 animate-spin" />
            Confirm Cancellation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Complete Dialog -->
    <Dialog v-model:open="showCompleteDialog">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Complete Appointment</DialogTitle>
          <DialogDescription>
            Mark this appointment as completed. You can add optional notes.
          </DialogDescription>
        </DialogHeader>
        <div class="space-y-4 py-4">
          <Textarea
            v-model="completeNotes"
            placeholder="Add completion notes (optional)..."
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            @click="closeCompleteDialog"
            :disabled="isCompleting"
          >
            Cancel
          </Button>
          <Button @click="confirmComplete" :disabled="isCompleting">
            <Loader2 v-if="isCompleting" class="mr-2 h-4 w-4 animate-spin" />
            Mark as Completed
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  RefreshCw,
  Loader2,
  XCircle,
  CheckCircle,
  Calendar,
  Clock,
  User,
  FileText,
  Video,
  MoreHorizontal,
} from "lucide-vue-next";
import { useApi } from "@/composables/useApi";
import { toast } from "vue-sonner";

interface Appointment {
  _id: string;
  patientId: any;
  doctorId: any;
  date: string;
  slot: string;
  plan: string;
  status: string;
  reason?: string;
  notes?: string;
  cancelledBy?: string;
  cancelReason?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
  meetingUrl?: string;
  isJoinable?: boolean;
  hasPassed?: boolean;
}

const router = useRouter();
const route = useRoute();
const api = useApi();

const appointment = ref<Appointment | null>(null);
const loading = ref(false);
const error = ref("");

// Cancel dialog
const showCancelDialog = ref(false);
const cancelReason = ref("");
const cancelError = ref("");
const isCancelling = ref(false);

// Complete dialog
const showCompleteDialog = ref(false);
const completeNotes = ref("");
const isCompleting = ref(false);

const goBack = () => {
  router.push("/calendar");
};

const refreshAppointment = async () => {
  await fetchAppointment();
};

const fetchAppointment = async () => {
  const appointmentId = route.params.id as string;
  if (!appointmentId) {
    error.value = "Invalid appointment ID";
    return;
  }

  loading.value = true;
  error.value = "";

  try {
    const response = await api.appointments.getById(appointmentId);
    appointment.value = (response as any).data || response;
  } catch (err: any) {
    console.error("Error fetching appointment:", err);
    error.value = err.message || "Failed to load appointment";
    toast.error("Failed to load appointment details");
  } finally {
    loading.value = false;
  }
};

const getPatientName = (patientId: any) => {
  if (!patientId) return "Unknown Patient";
  if (typeof patientId === "string") return `Patient ${patientId.slice(0, 8)}`;
  return (
    `${patientId.firstName || ""} ${patientId.lastName || ""}`.trim() ||
    "Unknown Patient"
  );
};

const getPatientEmail = (patientId: any) => {
  if (!patientId) return "N/A";
  if (typeof patientId === "string") return "N/A";
  return patientId.email || "N/A";
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getStatusVariant = (
  status: string
): "default" | "secondary" | "destructive" => {
  switch (status.toLowerCase()) {
    case "upcoming":
      return "default";
    case "completed":
      return "secondary";
    case "cancelled":
      return "destructive";
    default:
      return "default";
  }
};

const getTypeVariant = (type: string): "default" | "secondary" | "outline" => {
  switch (type.toLowerCase()) {
    case "consultation":
      return "default";
    case "prescription":
      return "secondary";
    case "follow-up":
      return "outline";
    default:
      return "default";
  }
};

const joinMeeting = () => {
  if (appointment.value?._id) {
    router.push(`/meeting/${appointment.value._id}`);
  }
};

const openCancelDialog = () => {
  cancelReason.value = "";
  cancelError.value = "";
  showCancelDialog.value = true;
};

const closeCancelDialog = () => {
  showCancelDialog.value = false;
  cancelReason.value = "";
  cancelError.value = "";
};

const confirmCancel = async () => {
  if (!cancelReason.value.trim()) {
    cancelError.value = "Please provide a cancellation reason";
    return;
  }

  if (!appointment.value) return;

  isCancelling.value = true;
  cancelError.value = "";

  try {
    await api.appointments.cancel(appointment.value._id, cancelReason.value);
    toast.success("Appointment cancelled successfully");
    closeCancelDialog();
    await fetchAppointment();
  } catch (err: any) {
    console.error("Error cancelling appointment:", err);
    cancelError.value = err.message || "Failed to cancel appointment";
    toast.error("Failed to cancel appointment");
  } finally {
    isCancelling.value = false;
  }
};

const openCompleteDialog = () => {
  completeNotes.value = "";
  showCompleteDialog.value = true;
};

const closeCompleteDialog = () => {
  showCompleteDialog.value = false;
  completeNotes.value = "";
};

const confirmComplete = async () => {
  if (!appointment.value) return;

  isCompleting.value = true;

  try {
    await api.appointments.complete(appointment.value._id, completeNotes.value);
    toast.success("Appointment marked as completed");
    closeCompleteDialog();
    await fetchAppointment();
  } catch (err: any) {
    console.error("Error completing appointment:", err);
    toast.error("Failed to mark appointment as completed");
  } finally {
    isCompleting.value = false;
  }
};

onMounted(() => {
  fetchAppointment();
});
</script>
