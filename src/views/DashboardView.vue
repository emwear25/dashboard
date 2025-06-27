<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import { useDoctorAuth } from "@/composables/useDoctorAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  Users,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Stethoscope,
  UserCheck,
  FileText,
} from "lucide-vue-next";

interface Patient {
  _id: string;
  firstName: string;
  lastName: string;
  age: number;
  city: string;
  status: "Active" | "Inactive" | "Pending";
  lastVisit: string;
  createdAt: string;
}

interface Appointment {
  _id: string;
  patientName: string;
  doctorName: string;
  appointmentType: string;
  status: "Scheduled" | "Completed" | "Cancelled";
  date: string;
  time: string;
  createdAt: string;
}

const router = useRouter();

const { isAdmin, doctor } = useDoctorAuth();

const patients = ref<Patient[]>([]);
const appointments = ref<Appointment[]>([]);
const loading = ref(true);
const error = ref("");

const metrics = ref({
  totalPatients: 0,
  activePatients: 0,
  scheduledAppointments: 0,
  completedAppointments: 0,
});

// Format date helper
const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString();
};

// Status color mappings
const patientStatusColors = {
  Active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  Inactive: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  Pending:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
} as const;

const appointmentStatusColors = {
  Scheduled: "bg-blue-100 text-blue-800",
  Completed: "bg-green-100 text-green-800",
  Cancelled: "bg-red-100 text-red-800",
} as const;

// Navigation helpers
const viewPatient = (id: string) => {
  router.push(`/patients/${id}`);
};

const viewAppointment = (id: string) => {
  router.push(`/appointments/${id}`);
};

// Computed metrics
const computedMetrics = computed(() => [
  {
    title: "Total Patients",
    value: metrics.value.totalPatients.toString(),
    change: "+8%",
    icon: Users,
  },
  {
    title: "Active Patients",
    value: metrics.value.activePatients.toString(),
    change: "+12%",
    icon: UserCheck,
  },
  {
    title: "Scheduled Appointments",
    value: metrics.value.scheduledAppointments.toString(),
    change: "+5%",
    icon: Calendar,
  },
  {
    title: "Completed Today",
    value: metrics.value.completedAppointments.toString(),
    change: "+15%",
    icon: CheckCircle2,
  },
]);

onMounted(async () => {
  if (isAdmin.value) {
    try {
      // Mock data for now - in real app, these would be API calls
      // Fetch patients
      const patientsData = {
        patients: [
          {
            _id: "1",
            firstName: "Петър",
            lastName: "Петров",
            age: 45,
            city: "София",
            status: "Active" as const,
            lastVisit: "2024-01-15",
            createdAt: "2024-01-10",
          },
          {
            _id: "2",
            firstName: "Мария",
            lastName: "Иванова",
            age: 32,
            city: "Пловдив",
            status: "Pending" as const,
            lastVisit: "2024-01-14",
            createdAt: "2024-01-09",
          },
          {
            _id: "3",
            firstName: "Иван",
            lastName: "Стоянов",
            age: 67,
            city: "Варна",
            status: "Active" as const,
            lastVisit: "2024-01-13",
            createdAt: "2024-01-08",
          },
        ],
      };
      patients.value = patientsData.patients.slice(0, 5);

      // Calculate patient metrics
      metrics.value.totalPatients = patientsData.patients.length;
      metrics.value.activePatients = patientsData.patients.filter(
        (p) => p.status === "Active"
      ).length;

      // Fetch appointments
      const appointmentsData = {
        appointments: [
          {
            _id: "1",
            patientName: "Петър Петров",
            doctorName: "Д-р Стоянова",
            appointmentType: "Консултация",
            status: "Scheduled" as const,
            date: "2024-01-16",
            time: "10:00",
            createdAt: "2024-01-15",
          },
          {
            _id: "2",
            patientName: "Мария Иванова",
            doctorName: "Д-р Георгиев",
            appointmentType: "Преглед",
            status: "Completed" as const,
            date: "2024-01-15",
            time: "14:30",
            createdAt: "2024-01-14",
          },
        ],
      };
      appointments.value = appointmentsData.appointments.slice(0, 5);
      metrics.value.scheduledAppointments =
        appointmentsData.appointments.filter(
          (a) => a.status === "Scheduled"
        ).length;
      metrics.value.completedAppointments =
        appointmentsData.appointments.filter(
          (a) => a.status === "Completed"
        ).length;
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      error.value =
        err instanceof Error ? err.message : "Failed to load dashboard data";
    } finally {
      loading.value = false;
    }
  } else {
    loading.value = false;
  }
});
</script>

<template>
  <div class="container mx-auto p-4">
    <h1 class="text-3xl font-bold mb-8">Medical Dashboard</h1>

    <!-- Welcome Message -->
    <div class="text-center mb-8">
      <h1 class="text-4xl font-bold text-primary mb-4">
        Welcome to Telemediker Dashboard
      </h1>
      <p class="text-muted-foreground text-lg">
        {{ doctor?.name ? `Hello, Dr. ${doctor.name}!` : "Hello, Doctor!" }}
      </p>
      <p class="text-sm text-muted-foreground mt-2">
        Telemedicine Platform for Bulgarian Healthcare Professionals
      </p>
    </div>

    <div v-if="error" class="mb-6">
      <div
        class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative flex items-center gap-2"
      >
        <AlertTriangle class="h-4 w-4" />
        <span>{{ error }}</span>
      </div>
    </div>

    <div v-if="loading" class="text-center py-8">
      <div
        class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"
      ></div>
      <p class="mt-4 text-muted-foreground">
        Loading medical dashboard data...
      </p>
    </div>

    <div v-else-if="!isAdmin" class="text-center">
      <Card class="max-w-2xl mx-auto">
        <CardContent class="p-6">
          <div class="mb-4">
            <Stethoscope class="h-12 w-12 mx-auto text-primary mb-4" />
            <h2 class="text-2xl font-semibold mb-2">
              Your Telemediker Dashboard
            </h2>
            <p class="text-muted-foreground">
              Welcome to your telemedicine dashboard for Bulgarian doctors.
              Contact your administrator for access to additional features and
              patient data.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>

    <div v-else class="space-y-6">
      <!-- Metrics Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card v-for="metric in computedMetrics" :key="metric.title">
          <CardHeader
            class="flex flex-row items-center justify-between space-y-0 pb-2"
          >
            <CardTitle class="text-sm font-medium">{{
              metric.title
            }}</CardTitle>
            <component
              :is="metric.icon"
              class="h-4 w-4 text-muted-foreground"
            />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">{{ metric.value }}</div>
            <div
              class="flex items-center space-x-2 text-xs text-muted-foreground"
            >
              <TrendingUp class="h-3 w-3" />
              <span>{{ metric.change }} from last month</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Tables Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Latest Patients -->
        <Card>
          <CardHeader>
            <CardTitle>Recent Patients</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Visit</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="patient in patients" :key="patient._id">
                  <TableCell
                    >{{ patient.firstName || "Not Available!" }}
                    {{ patient.lastName || "" }}</TableCell
                  >
                  <TableCell>{{ patient.age || "N/A" }}</TableCell>
                  <TableCell>{{ patient.city || "Not Available!" }}</TableCell>
                  <TableCell>
                    <span
                      class="px-2 py-1 rounded-full text-xs font-medium"
                      :class="
                        patientStatusColors[patient.status] ||
                        'bg-gray-100 text-gray-800'
                      "
                    >
                      {{ patient.status || "Not Available!" }}
                    </span>
                  </TableCell>
                  <TableCell>{{
                    patient.lastVisit ? formatDate(patient.lastVisit) : "Never"
                  }}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      @click="viewPatient(patient._id)"
                    >
                      <Eye class="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <!-- Latest Appointments -->
        <Card>
          <CardHeader>
            <CardTitle>Recent Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow
                  v-for="appointment in appointments"
                  :key="appointment._id"
                >
                  <TableCell>{{
                    appointment.patientName || "Not Available!"
                  }}</TableCell>
                  <TableCell>{{
                    appointment.doctorName || "Not Available!"
                  }}</TableCell>
                  <TableCell>{{
                    appointment.appointmentType || "Not Available!"
                  }}</TableCell>
                  <TableCell>
                    <span
                      class="px-2 py-1 rounded-full text-xs font-medium"
                      :class="
                        appointmentStatusColors[appointment.status] ||
                        'bg-gray-100 text-gray-800'
                      "
                    >
                      {{ appointment.status || "Not Available!" }}
                    </span>
                  </TableCell>
                  <TableCell
                    >{{ appointment.date || "Not Available!" }}
                    {{ appointment.time || "" }}</TableCell
                  >
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      @click="viewAppointment(appointment._id)"
                    >
                      <Eye class="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <!-- Quick Actions -->
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button class="h-20 flex flex-col space-y-2" variant="outline">
              <Calendar class="h-6 w-6" />
              <span>Schedule Appointment</span>
            </Button>
            <Button class="h-20 flex flex-col space-y-2" variant="outline">
              <Users class="h-6 w-6" />
              <span>Add New Patient</span>
            </Button>
            <Button class="h-20 flex flex-col space-y-2" variant="outline">
              <FileText class="h-6 w-6" />
              <span>Medical Reports</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
