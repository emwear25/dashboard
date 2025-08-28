<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-3xl font-bold text-foreground">My Patients</h1>
        <p class="text-muted-foreground">
          Manage your patients and their medical records
        </p>
      </div>
      <div class="flex gap-2">
        <Button @click="refreshPatients" variant="outline" size="sm">
          <RefreshCw :class="cn('mr-2 h-4 w-4', isLoading && 'animate-spin')" />
          Refresh
        </Button>
      </div>
    </div>

    <!-- Search and Filters -->
    <Card
      class="p-6 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800"
    >
      <div class="space-y-4">
        <!-- Search Bar -->
        <div class="relative">
          <Search
            class="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4"
          />
          <Input
            v-model="searchQuery"
            placeholder="Search patients by name or email..."
            class="pl-10"
          />
        </div>

        <!-- Filters -->
        <div class="flex flex-wrap gap-4">
          <div class="flex items-center space-x-2">
            <label class="text-sm font-medium text-foreground"
              >Filter by:</label
            >
            <Select v-model="selectedFilter">
              <SelectTrigger class="w-40">
                <SelectValue placeholder="All Patients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Patients</SelectItem>
                <SelectItem value="recent">Recent (30 days)</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="needs_attention">Needs Attention</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="flex items-center space-x-2">
            <label class="text-sm font-medium text-foreground">Sort by:</label>
            <Select v-model="sortBy">
              <SelectTrigger class="w-40">
                <SelectValue placeholder="Last Visit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lastAppointment">Last Visit</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="appointmentCount"
                  >Appointment Count</SelectItem
                >
                <SelectItem value="firstAppointment">First Visit</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            v-if="searchQuery || selectedFilter !== 'all'"
            @click="clearFilters"
            variant="ghost"
            size="sm"
            class="text-muted-foreground"
          >
            <X class="h-4 w-4 mr-1" />
            Clear Filters
          </Button>
        </div>
      </div>
    </Card>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center p-8">
      <Loader2 class="h-8 w-8 animate-spin" />
      <span class="ml-2 text-muted-foreground">Loading patients...</span>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-center py-8">
      <div
        class="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded relative flex items-center justify-center gap-2"
      >
        <AlertTriangle class="h-4 w-4" />
        <span>{{ error }}</span>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="patients.length === 0" class="text-center py-8">
      <Users class="h-12 w-12 text-muted-foreground mx-auto mb-4" />
      <p class="text-lg font-semibold text-foreground">No patients found</p>
      <p class="text-muted-foreground">
        Patients will appear here once you have appointments
      </p>
    </div>

    <!-- Main Content -->
    <div v-else class="space-y-6">
      <!-- Patients Overview -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader
            class="flex flex-row items-center justify-between space-y-0 pb-2"
          >
            <CardTitle class="text-sm font-medium">Total Patients</CardTitle>
            <Users class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">{{ patients.length }}</div>
            <p class="text-xs text-muted-foreground">
              Unique patients from appointments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            class="flex flex-row items-center justify-between space-y-0 pb-2"
          >
            <CardTitle class="text-sm font-medium"
              >Recent Appointments</CardTitle
            >
            <Calendar class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">{{ recentAppointmentsCount }}</div>
            <p class="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            class="flex flex-row items-center justify-between space-y-0 pb-2"
          >
            <CardTitle class="text-sm font-medium">Active Patients</CardTitle>
            <UserCheck class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">{{ activePatients }}</div>
            <p class="text-xs text-muted-foreground">With recent activity</p>
          </CardContent>
        </Card>
      </div>

      <!-- Patients Grid -->
      <div class="space-y-6">
        <!-- Results Summary -->
        <div class="flex items-center justify-between">
          <div class="text-sm text-muted-foreground">
            Showing {{ filteredAndSortedPatients.length }} of
            {{ patients.length }} patients
          </div>
        </div>

        <!-- Patients Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            v-for="patient in filteredAndSortedPatients"
            :key="patient._id"
            class="bg-card rounded-lg border border-border hover:border-blue-300 hover:shadow-lg transition-all duration-200 cursor-pointer"
            @click="navigateToPatient(patient._id)"
          >
            <div class="p-6">
              <!-- Patient Header -->
              <div class="flex items-start space-x-4 mb-4">
                <div class="flex-shrink-0">
                  <div
                    class="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center"
                  >
                    <User class="h-6 w-6 text-white" />
                  </div>
                </div>
                <div class="flex-1 min-w-0">
                  <h3 class="text-lg font-semibold text-foreground truncate">
                    {{ patient.firstName }} {{ patient.lastName }}
                  </h3>
                  <p class="text-sm text-muted-foreground truncate">
                    {{ patient.email }}
                  </p>
                  <div class="flex items-center mt-1">
                    <div
                      class="flex items-center text-xs text-green-600 bg-green-50 dark:bg-green-950/20 px-2 py-1 rounded-full"
                    >
                      <div
                        class="w-1.5 h-1.5 bg-green-500 rounded-full mr-1"
                      ></div>
                      Active Patient
                    </div>
                  </div>
                </div>
              </div>

              <!-- Patient Stats -->
              <div class="space-y-3 mb-4">
                <div class="flex items-center text-sm text-muted-foreground">
                  <Calendar class="h-4 w-4 mr-2 text-blue-500" />
                  <span class="font-medium">Last Visit:</span>
                  <span class="ml-1">{{
                    formatDate(patient.lastAppointment)
                  }}</span>
                </div>
                <div class="flex items-center text-sm text-muted-foreground">
                  <UserCheck class="h-4 w-4 mr-2 text-green-500" />
                  <span class="font-medium">Total Visits:</span>
                  <span class="ml-1">{{ patient.appointmentCount }}</span>
                </div>
              </div>

              <!-- Quick Actions -->
              <div
                class="grid grid-cols-3 gap-2 pt-4 border-t border-border"
              ></div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div
          v-if="filteredAndSortedPatients.length === 0 && !isLoading"
          class="text-center py-12"
        >
          <div
            class="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4"
          >
            <Users class="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 class="text-lg font-medium text-foreground mb-2">
            No patients found
          </h3>
          <p class="text-muted-foreground mb-4">
            {{
              searchQuery
                ? "Try adjusting your search criteria."
                : "Your patients will appear here once you have appointments."
            }}
          </p>
          <Button
            v-if="searchQuery || selectedFilter !== 'all'"
            @click="clearFilters"
            variant="outline"
          >
            Clear Filters
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useApi } from "@/composables/useApi";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Icons
import {
  RefreshCw,
  Loader2,
  AlertTriangle,
  Users,
  Calendar,
  UserCheck,
  User,
  Search,
  X,
} from "lucide-vue-next";

import { cn } from "@/lib/utils";

// Types
interface Patient {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  appointmentCount: number;
  lastAppointment: string;
  firstAppointment: string;
}

interface Appointment {
  _id: string;
  patientId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  date: string;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  createdAt: string;
  updatedAt: string;
}

// State
const patients = ref<Patient[]>([]);
const appointments = ref<Appointment[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);

// Search and Filter State
const searchQuery = ref("");
const selectedFilter = ref("all");
const sortBy = ref("lastAppointment");

// API
const { appointments: appointmentsApi } = useApi();

// Router
const router = useRouter();

// Computed properties
const recentAppointmentsCount = computed(() => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  return appointments.value.filter((apt) => new Date(apt.date) >= thirtyDaysAgo)
    .length;
});

const activePatients = computed(() => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  return patients.value.filter(
    (patient) => new Date(patient.lastAppointment) >= thirtyDaysAgo
  ).length;
});

// Filtered and sorted patients
const filteredAndSortedPatients = computed(() => {
  let filtered = patients.value;

  // Apply search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(
      (patient) =>
        patient.firstName.toLowerCase().includes(query) ||
        patient.lastName.toLowerCase().includes(query) ||
        patient.email.toLowerCase().includes(query)
    );
  }

  // Apply status filter
  if (selectedFilter.value !== "all") {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    switch (selectedFilter.value) {
      case "recent":
        filtered = filtered.filter(
          (patient) => new Date(patient.lastAppointment) >= thirtyDaysAgo
        );
        break;
      case "active":
        filtered = filtered.filter(
          (patient) => new Date(patient.lastAppointment) >= thirtyDaysAgo
        );
        break;
      case "needs_attention":
        // Patients with no recent activity (older than 30 days)
        filtered = filtered.filter(
          (patient) => new Date(patient.lastAppointment) < thirtyDaysAgo
        );
        break;
    }
  }

  // Apply sorting
  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy.value) {
      case "name":
        return `${a.firstName} ${a.lastName}`.localeCompare(
          `${b.firstName} ${b.lastName}`
        );
      case "appointmentCount":
        return b.appointmentCount - a.appointmentCount;
      case "firstAppointment":
        return (
          new Date(a.firstAppointment).getTime() -
          new Date(b.firstAppointment).getTime()
        );
      case "lastAppointment":
      default:
        return (
          new Date(b.lastAppointment).getTime() -
          new Date(a.lastAppointment).getTime()
        );
    }
  });

  return sorted;
});

// Methods
const fetchPatients = async () => {
  try {
    isLoading.value = true;
    error.value = null;

    // Fetch all appointments for this doctor
    const response = await appointmentsApi.getAll();
    appointments.value = response.data || response;

    // Extract unique patients from appointments
    const patientsMap = new Map<string, Patient>();

    appointments.value.forEach((appointment) => {
      const patientId = appointment.patientId._id;

      if (!patientsMap.has(patientId)) {
        patientsMap.set(patientId, {
          _id: patientId,
          firstName: appointment.patientId.firstName,
          lastName: appointment.patientId.lastName,
          email: appointment.patientId.email,
          appointmentCount: 1,
          lastAppointment: appointment.date,
          firstAppointment: appointment.date,
        });
      } else {
        const existingPatient = patientsMap.get(patientId)!;
        existingPatient.appointmentCount++;

        // Update last appointment if this one is more recent
        if (
          new Date(appointment.date) > new Date(existingPatient.lastAppointment)
        ) {
          existingPatient.lastAppointment = appointment.date;
        }

        // Update first appointment if this one is earlier
        if (
          new Date(appointment.date) <
          new Date(existingPatient.firstAppointment)
        ) {
          existingPatient.firstAppointment = appointment.date;
        }
      }
    });

    patients.value = Array.from(patientsMap.values()).sort(
      (a, b) =>
        new Date(b.lastAppointment).getTime() -
        new Date(a.lastAppointment).getTime()
    );
  } catch (err) {
    console.error("Failed to fetch patients:", err);
    error.value = "Failed to load patients. Please try again.";
  } finally {
    isLoading.value = false;
  }
};

const refreshPatients = () => {
  fetchPatients();
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// Search and Filter Methods
const clearFilters = () => {
  searchQuery.value = "";
  selectedFilter.value = "all";
  sortBy.value = "lastAppointment";
};

// Navigation Methods
const navigateToPatient = (patientId: string) => {
  router.push(`/patients/${patientId}`);
};

const navigateToPatientTab = (patientId: string, tab: string) => {
  router.push(`/patients/${patientId}?tab=${tab}`);
};

// Lifecycle
onMounted(() => {
  fetchPatients();
});
</script>
