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
              class="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold"
            >
              {{ patient.firstName?.[0] }}{{ patient.lastName?.[0] }}
            </div>
          </div>

          <!-- Patient Details -->
          <div class="flex-1 min-w-0">
            <h1 class="text-2xl font-bold text-foreground mb-2">
              {{ patient.firstName }} {{ patient.lastName }}
            </h1>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div class="flex items-center text-muted-foreground">
                <Mail class="h-4 w-4 mr-2" />
                <span>{{ patient.email }}</span>
              </div>
              <div class="flex items-center text-muted-foreground">
                <Calendar class="h-4 w-4 mr-2" />
                <span>Born {{ formatDate(patient.dateOfBirth) }}</span>
              </div>
            </div>

            <!-- Profile Completion Status -->
            <div class="mt-3">
              <div class="flex items-center space-x-2">
                <UserCheck
                  :class="[
                    'h-4 w-4',
                    patient.profileCompleted
                      ? 'text-green-600'
                      : 'text-yellow-600',
                  ]"
                />
                <span
                  :class="[
                    'text-sm font-medium',
                    patient.profileCompleted
                      ? 'text-green-600'
                      : 'text-yellow-600',
                  ]"
                >
                  {{
                    patient.profileCompleted
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
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <!-- Appointments Card -->
        <Card
          class="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100"
        >
          <CardContent class="p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-blue-600">Appointments</p>
                <p class="text-2xl font-bold text-blue-800">
                  {{ appointmentsCount }}
                </p>
              </div>
              <Calendar class="h-8 w-8 text-blue-600" />
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
              @click="activeTab = 'appointments'"
              :class="[
                'py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap',
                activeTab === 'appointments'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
              ]"
            >
              Appointments
              <span
                v-if="appointmentsCount !== undefined"
                :class="[
                  'ml-2 px-2 py-1 text-xs rounded-full',
                  activeTab === 'appointments'
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-muted text-muted-foreground',
                ]"
              >
                {{ appointmentsCount }}
              </span>
            </button>
          </nav>
        </div>

        <!-- Tab Content -->
        <div class="p-6">
          <!-- Appointments Tab -->
          <div v-if="activeTab === 'appointments'" class="space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold text-foreground">
                Appointments
              </h3>
              <Button variant="outline" size="sm">
                <Plus class="h-4 w-4 mr-2" />
                Schedule Appointment
              </Button>
            </div>

            <!-- Appointments List -->
            <div v-if="patientAppointments.length > 0" class="space-y-3">
              <div
                v-for="appointment in patientAppointments"
                :key="appointment._id"
                class="bg-card border rounded-lg p-4 hover:bg-muted/50 transition-colors"
              >
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <div class="flex items-center space-x-3 mb-2">
                      <h4 class="font-medium text-foreground">
                        {{ formatDate(appointment.date) }}
                      </h4>
                      <span
                        :class="[
                          'px-2 py-1 text-xs rounded-full',
                          appointment.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : appointment.status === 'confirmed'
                              ? 'bg-blue-100 text-blue-700'
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
                        <span
                          >{{ appointment.patientId.firstName }}
                          {{ appointment.patientId.lastName }}</span
                        >
                      </div>
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

            <!-- Empty State -->
            <div v-else class="text-center py-12">
              <div
                class="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4"
              >
                <Calendar class="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 class="text-lg font-medium text-foreground mb-2">
                No appointments yet
              </h3>
              <p class="text-muted-foreground mb-4">
                Appointments with this patient will appear here
              </p>
              <Button variant="outline">
                <Plus class="h-4 w-4 mr-2" />
                Schedule First Appointment
              </Button>
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
const error = ref<string>("");
const patient = ref<any>(null);
const patientAppointments = ref<any[]>([]);
const activeTab = ref("appointments");

// Computed properties
const appointmentsCount = computed(() => patientAppointments.value.length);

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
    patient.value = response;
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

  try {
    const response = await api.makeRequest(
      `/api/appointments/patient/${patient.value._id}`
    );
    patientAppointments.value = response || [];
  } catch (err) {
    console.error("Error fetching patient appointments:", err);
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
