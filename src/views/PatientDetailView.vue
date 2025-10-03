<template>
  <div class="space-y-6">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center p-8">
      <Loader2 class="h-8 w-8 animate-spin mr-2" />
      <span>Loading patient details...</span>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-center py-8">
      <div
        class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative flex items-center justify-center gap-2"
      >
        <AlertTriangle class="h-4 w-4" />
        <span>{{ error }}</span>
      </div>
    </div>

    <!-- Patient Not Found -->
    <div v-else-if="!patient" class="text-center py-8">
      <div
        class="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative flex items-center justify-center gap-2"
      >
        <AlertTriangle class="h-4 w-4" />
        <span>Patient not found</span>
      </div>
    </div>

    <!-- Main Content -->
    <div v-else class="space-y-6">
      <!-- Header with Patient Info -->
      <div class="bg-card rounded-lg border border-border p-6">
        <div class="flex items-center justify-between mb-6">
          <Button @click="goBack" variant="ghost" size="sm">
            <ArrowLeft class="h-4 w-4 mr-2" />
            Back to Patients
          </Button>
          <div class="flex gap-2">
            <Button @click="refreshPatient" variant="outline" size="sm">
              <RefreshCw
                :class="cn('mr-2 h-4 w-4', isLoading && 'animate-spin')"
              />
              Refresh
            </Button>
          </div>
        </div>

        <div class="flex items-start space-x-6">
          <!-- Patient Avatar -->
          <div class="flex-shrink-0">
            <div
              class="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-3xl font-bold border-4 border-white shadow-lg"
            >
              <template v-if="patient.firstName && patient.lastName">
                {{ patient.firstName[0] }}{{ patient.lastName[0] }}
              </template>
              <template v-else-if="patient.email">
                {{ patient.email[0].toUpperCase() }}
              </template>
              <template v-else>
                <User class="h-8 w-8" />
              </template>
            </div>
          </div>

          <!-- Patient Details -->
          <div class="flex-1 min-w-0">
            <h1 class="text-2xl font-bold text-foreground mb-2">
              <template v-if="patient.firstName && patient.lastName">
                {{ patient.firstName }} {{ patient.lastName }}
              </template>
              <template v-else-if="patient.email">
                {{ patient.email }}
              </template>
              <template v-else> Unknown Patient </template>
            </h1>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
              <div
                v-if="patient.email"
                class="flex items-center text-muted-foreground"
              >
                <Mail class="h-4 w-4 mr-2" />
                <span class="font-medium">{{ patient.email }}</span>
              </div>
              <div class="flex items-center text-muted-foreground">
                <Calendar class="h-4 w-4 mr-2" />
                <span>Born {{ formatDate(patient.birthday) }}</span>
              </div>
              <div
                v-if="patient.gender"
                class="flex items-center text-muted-foreground"
              >
                <User class="h-4 w-4 mr-2" />
                <span class="capitalize">{{ patient.gender }}</span>
              </div>
              <div
                v-if="patient.address"
                class="flex items-center text-muted-foreground"
              >
                <svg
                  class="h-4 w-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span>{{ formatAddress(patient.address) }}</span>
              </div>
            </div>

            <!-- Additional Patient Information -->
            <div
              v-if="patient.profileCompleted || patient.isProfileComplete"
              class="mt-4 p-4 bg-muted/50 rounded-lg"
            >
              <h3 class="text-lg font-semibold text-foreground mb-3">
                Complete Profile Information
              </h3>

              <div v-if="patient.nationalIdNumber" class="mb-2 text-sm">
                <strong>National ID:</strong> {{ patient.nationalIdNumber }}
              </div>

              <div v-if="patient.insurance" class="mb-2 text-sm">
                <strong>Insurance:</strong> {{ patient.insurance.type }} -
                {{ patient.insurance.company }}
                <span v-if="patient.insurance.number">
                  ({{ patient.insurance.number }})</span
                >
              </div>

              <div class="text-xs text-muted-foreground mt-2">
                <strong>Registration Date:</strong>
                {{ formatDate(patient.createdAt) }}
              </div>
            </div>

            <!-- Profile Completion Status -->
            <div class="mt-3">
              <div class="flex items-center space-x-2">
                <UserCheck
                  :class="[
                    'h-4 w-4',
                    patient.profileCompleted || patient.isProfileComplete
                      ? 'text-green-600'
                      : 'text-yellow-600',
                  ]"
                />
                <span
                  :class="[
                    'text-sm font-medium',
                    patient.profileCompleted || patient.isProfileComplete
                      ? 'text-green-600'
                      : 'text-yellow-600',
                  ]"
                >
                  {{
                    patient.profileCompleted || patient.isProfileComplete
                      ? "Profile Complete"
                      : "Profile Incomplete"
                  }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <!-- Total Appointments Card -->
        <Card
          class="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100"
        >
          <CardContent class="p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-blue-600">
                  Total Appointments
                </p>
                <p class="text-2xl font-bold text-blue-800">
                  {{ patient.appointmentStats?.total || 0 }}
                </p>
              </div>
              <Calendar class="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <!-- Upcoming Appointments Card -->
        <Card
          class="border-green-200 bg-gradient-to-br from-green-50 to-green-100"
        >
          <CardContent class="p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-green-600">Upcoming</p>
                <p class="text-2xl font-bold text-green-800">
                  {{ patient.appointmentStats?.upcoming || 0 }}
                </p>
              </div>
              <Calendar class="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <!-- Completed Appointments Card -->
        <Card
          class="border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100"
        >
          <CardContent class="p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-purple-600">Completed</p>
                <p class="text-2xl font-bold text-purple-800">
                  {{ patient.appointmentStats?.completed || 0 }}
                </p>
              </div>
              <Calendar class="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <!-- Cancelled Appointments Card -->
        <Card class="border-red-200 bg-gradient-to-br from-red-50 to-red-100">
          <CardContent class="p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-red-600">Cancelled</p>
                <p class="text-2xl font-bold text-red-800">
                  {{ patient.appointmentStats?.cancelled || 0 }}
                </p>
              </div>
              <Calendar class="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Content Tabs -->
      <div class="bg-card rounded-lg border border-border">
        <!-- Tab Navigation -->
        <div class="border-b border-border">
          <nav class="flex space-x-8 px-6" aria-label="Tabs">
            <button
              @click="activeTab = 'upcoming'"
              :class="[
                'py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap',
                activeTab === 'upcoming'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
              ]"
            >
              Upcoming
              <span
                v-if="patient.appointmentStats?.upcoming !== undefined"
                :class="[
                  'ml-2 px-2 py-1 text-xs rounded-full',
                  activeTab === 'upcoming'
                    ? 'bg-green-100 text-green-600'
                    : 'bg-muted text-muted-foreground',
                ]"
              >
                {{ patient.appointmentStats.upcoming }}
              </span>
            </button>

            <button
              @click="activeTab = 'history'"
              :class="[
                'py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap',
                activeTab === 'history'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
              ]"
            >
              History
              <span
                v-if="patient.appointmentStats?.completed !== undefined"
                :class="[
                  'ml-2 px-2 py-1 text-xs rounded-full',
                  activeTab === 'history'
                    ? 'bg-purple-100 text-purple-600'
                    : 'bg-muted text-muted-foreground',
                ]"
              >
                {{ patient.appointmentStats.completed }}
              </span>
            </button>
          </nav>
        </div>

        <!-- Tab Content -->
        <div class="p-6">
          <!-- Upcoming Appointments Tab -->
          <div v-if="activeTab === 'upcoming'" class="space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold text-foreground">
                Upcoming Appointments
              </h3>
              <Button variant="outline" size="sm">
                <Plus class="h-4 w-4 mr-2" />
                Schedule Appointment
              </Button>
            </div>

            <!-- Loading State -->
            <div
              v-if="isLoadingAppointments"
              class="flex items-center justify-center p-8"
            >
              <Loader2 class="h-6 w-6 animate-spin mr-2" />
              <span>Loading appointments...</span>
            </div>

            <!-- Upcoming Appointments List -->
            <div v-else-if="upcomingAppointments.length > 0" class="space-y-3">
              <div
                v-for="appointment in upcomingAppointments"
                :key="appointment._id"
                class="bg-card border rounded-lg p-4 hover:bg-muted/50 transition-colors"
              >
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <div class="flex items-center space-x-3 mb-2">
                      <h4 class="font-medium text-foreground">
                        {{ formatDate(appointment.date) }} at
                        {{ appointment.slot }}
                      </h4>
                      <span
                        class="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700"
                      >
                        {{ appointment.status }}
                      </span>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div class="flex items-center text-muted-foreground">
                        <Calendar class="h-4 w-4 mr-2" />
                        <span>{{ formatDateTime(appointment.date) }}</span>
                      </div>
                      <div class="flex items-center text-muted-foreground">
                        <User class="h-4 w-4 mr-2" />
                        <span>{{ appointment.plan || "Consultation" }}</span>
                      </div>
                    </div>

                    <div
                      v-if="appointment.reason"
                      class="mt-2 text-sm text-muted-foreground"
                    >
                      <strong>Reason:</strong> {{ appointment.reason }}
                    </div>
                  </div>

                  <div class="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      @click="viewAppointment(appointment._id)"
                    >
                      <Eye class="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Empty State for Upcoming -->
            <div v-else class="text-center py-12">
              <div
                class="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4"
              >
                <Calendar class="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 class="text-lg font-medium text-foreground mb-2">
                No upcoming appointments
              </h3>
              <p class="text-muted-foreground mb-4">
                Schedule an appointment for this patient
              </p>
              <Button variant="outline">
                <Plus class="h-4 w-4 mr-2" />
                Schedule Appointment
              </Button>
            </div>
          </div>

          <!-- History Tab -->
          <div v-if="activeTab === 'history'" class="space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold text-foreground">
                Appointment History
              </h3>
            </div>

            <!-- Loading State -->
            <div
              v-if="isLoadingAppointments"
              class="flex items-center justify-center p-8"
            >
              <Loader2 class="h-6 w-6 animate-spin mr-2" />
              <span>Loading appointments...</span>
            </div>

            <!-- History Appointments List -->
            <div v-else-if="historyAppointments.length > 0" class="space-y-3">
              <div
                v-for="appointment in historyAppointments"
                :key="appointment._id"
                class="bg-card border rounded-lg p-4 hover:bg-muted/50 transition-colors"
              >
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <div class="flex items-center space-x-3 mb-2">
                      <h4 class="font-medium text-foreground">
                        {{ formatDate(appointment.date) }} at
                        {{ appointment.slot }}
                      </h4>
                      <span
                        :class="[
                          'px-2 py-1 text-xs rounded-full',
                          appointment.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : appointment.status === 'cancelled'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700',
                        ]"
                      >
                        {{ appointment.status }}
                      </span>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div class="flex items-center text-muted-foreground">
                        <Calendar class="h-4 w-4 mr-2" />
                        <span>{{ formatDateTime(appointment.date) }}</span>
                      </div>
                      <div class="flex items-center text-muted-foreground">
                        <User class="h-4 w-4 mr-2" />
                        <span>{{ appointment.plan || "Consultation" }}</span>
                      </div>
                    </div>

                    <div
                      v-if="appointment.reason"
                      class="mt-2 text-sm text-muted-foreground"
                    >
                      <strong>Reason:</strong> {{ appointment.reason }}
                    </div>

                    <div
                      v-if="appointment.notes"
                      class="mt-2 text-sm text-muted-foreground"
                    >
                      <strong>Notes:</strong> {{ appointment.notes }}
                    </div>
                  </div>

                  <div class="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      @click="viewAppointment(appointment._id)"
                    >
                      <Eye class="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Empty State for History -->
            <div v-else class="text-center py-12">
              <div
                class="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4"
              >
                <Calendar class="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 class="text-lg font-medium text-foreground mb-2">
                No appointment history
              </h3>
              <p class="text-muted-foreground mb-4">
                Completed appointments will appear here
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useApi } from "@/composables/useApi";
import { useDoctorAuth } from "@/composables/useDoctorAuth";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// Icons
import {
  ArrowLeft,
  RefreshCw,
  Loader2,
  AlertTriangle,
  User,
  Mail,
  Calendar,
  UserCheck,
  Plus,
  Eye,
} from "lucide-vue-next";

// Utils
import { cn } from "@/lib/utils";

const route = useRoute();
const router = useRouter();
const api = useApi();
const { isAuthenticated } = useDoctorAuth();

// Reactive data
const isLoading = ref(false);
const isLoadingAppointments = ref(false);
const error = ref<string>("");
const patient = ref<any>(null);
const patientAppointments = ref<any[]>([]);
const activeTab = ref("upcoming");

// Computed properties
const appointmentsCount = computed(() => patientAppointments.value.length);

const upcomingAppointments = computed(() =>
  patientAppointments.value.filter(
    (app) => app.status === "upcoming" || app.status === "confirmed"
  )
);

const historyAppointments = computed(() =>
  patientAppointments.value.filter(
    (app) => app.status === "completed" || app.status === "cancelled"
  )
);

// Methods
const goBack = () => {
  router.push("/patients");
};

const refreshPatient = async () => {
  await fetchPatientDetails();
};

const fetchPatientDetails = async () => {
  if (!route.params.id) return;

  isLoading.value = true;
  error.value = "";

  try {
    const response = await api.makeRequest(`/api/patients/${route.params.id}`);
    console.log("Full API response:", response);

    // Extract data from response - check if it's wrapped in success/data
    if (response && response.data) {
      patient.value = response.data;
    } else {
      patient.value = response;
    }

    console.log("Patient value set to:", patient.value);
    await fetchPatientAppointments();
  } catch (err) {
    console.error("Error fetching patient details:", err);
    error.value = "Failed to fetch patient details";
  } finally {
    isLoading.value = false;
  }
};

const fetchPatientAppointments = async () => {
  if (!patient.value?._id) return;

  isLoadingAppointments.value = true;
  try {
    const response = await api.makeRequest(
      `/api/patients/${patient.value._id}/appointments`
    );
    console.log("Appointments response:", response);

    // Extract data from response - check if it's wrapped in success/data
    if (response && response.data) {
      patientAppointments.value = response.data || [];
    } else {
      patientAppointments.value = response || [];
    }
  } catch (err) {
    console.error("Error fetching patient appointments:", err);
    patientAppointments.value = [];
  } finally {
    isLoadingAppointments.value = false;
  }
};

const viewAppointment = (appointmentId: string) => {
  router.push(`/appointments/${appointmentId}`);
};

const formatDate = (dateString: string) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString();
};

const formatDateTime = (dateString: string) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return `${date.toLocaleDateString()} at ${date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
};

const formatAddress = (address: any) => {
  if (!address) return "N/A";

  if (typeof address === "string") {
    return address;
  }

  const parts = [];
  if (address.street) parts.push(address.street);
  if (address.number) parts.push(address.number);
  if (address.city) parts.push(address.city);
  if (address.postCode) parts.push(address.postCode);
  if (address.country?.name) parts.push(address.country.name);

  return parts.join(", ") || "Address not provided";
};

// Lifecycle
onMounted(() => {
  if (!isAuthenticated.value) {
    router.push("/login");
    return;
  }
  fetchPatientDetails();
});

// Watch for route changes
watch(
  () => route.params.id,
  (newId) => {
    if (newId) {
      fetchPatientDetails();
    }
  }
);
</script>
