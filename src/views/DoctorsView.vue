<template>
  <div class="container mx-auto p-6 space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">Team Management</h1>
        <p class="text-muted-foreground">
          Manage doctors and administrators (Admin Only)
        </p>
      </div>

      <div v-if="isAdmin" class="flex gap-2">
        <Button @click="goToAddDoctor" class="flex items-center gap-2">
          <Plus class="h-4 w-4" />
          Add Doctor
        </Button>
        <Button
          @click="goToAddAdmin"
          variant="outline"
          class="flex items-center gap-2"
        >
          <Plus class="h-4 w-4" />
          Add Admin
        </Button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex gap-2 border-b">
      <button
        @click="activeTab = 'doctors'"
        :class="[
          'px-4 py-2 font-medium transition-colors',
          activeTab === 'doctors'
            ? 'border-b-2 border-primary text-primary'
            : 'text-muted-foreground hover:text-foreground',
        ]"
      >
        Doctors ({{ doctorsList.length }})
      </button>
      <button
        @click="activeTab = 'admins'"
        :class="[
          'px-4 py-2 font-medium transition-colors',
          activeTab === 'admins'
            ? 'border-b-2 border-primary text-primary'
            : 'text-muted-foreground hover:text-foreground',
        ]"
      >
        Admins ({{ adminsList.length }})
      </button>
      <button
        @click="activeTab = 'all'"
        :class="[
          'px-4 py-2 font-medium transition-colors',
          activeTab === 'all'
            ? 'border-b-2 border-primary text-primary'
            : 'text-muted-foreground hover:text-foreground',
        ]"
      >
        All ({{ doctors.length }})
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center py-8">
      <div
        class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"
      ></div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-center py-8">
      <div class="bg-destructive/15 text-destructive px-4 py-3 rounded-lg">
        {{ error }}
      </div>
      <Button @click="loadDoctors" class="mt-4"> Try Again </Button>
    </div>

    <!-- Team List -->
    <div v-else class="space-y-6">
      <!-- Active Users -->
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <User class="h-5 w-5" />
            {{
              activeTab === "doctors"
                ? "Active Doctors"
                : activeTab === "admins"
                  ? "Active Admins"
                  : "Active Users"
            }}
            ({{ activeFiltered.length }})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            v-if="activeFiltered.length === 0"
            class="text-center py-8 text-muted-foreground"
          >
            No active
            {{
              activeTab === "doctors"
                ? "doctors"
                : activeTab === "admins"
                  ? "admins"
                  : "users"
            }}
            found
          </div>

          <Table v-else>
            <TableHeader>
              <TableRow>
                <TableHead class="w-16">Photo</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead v-if="activeTab !== 'admins'">Specialties</TableHead>
                <TableHead v-if="activeTab !== 'admins'">Experience</TableHead>
                <TableHead>Status</TableHead>
                <TableHead v-if="isAdmin" class="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="doctor in activeFiltered" :key="doctor._id">
                <TableCell>
                  <div
                    class="w-12 h-12 rounded-full overflow-hidden bg-muted flex items-center justify-center"
                  >
                    <img
                      v-if="doctor.photoUrl"
                      :src="doctor.photoUrl"
                      :alt="doctor.name"
                      class="w-full h-full object-cover"
                    />
                    <User v-else class="w-6 h-6 text-muted-foreground" />
                  </div>
                </TableCell>
                <TableCell class="font-medium">{{ doctor.name }}</TableCell>
                <TableCell>{{ doctor.email }}</TableCell>
                <TableCell>
                  <Badge :variant="getUserRoleBadgeVariant(doctor)">
                    {{ getUserRoleLabel(doctor) }}
                  </Badge>
                </TableCell>
                <TableCell v-if="activeTab !== 'admins'">
                  <div class="flex flex-wrap gap-1">
                    <Badge
                      v-for="specialty in doctor.specialties"
                      :key="specialty"
                      variant="secondary"
                    >
                      {{ specialty }}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell v-if="activeTab !== 'admins'"
                  >{{ doctor.experience || "N/A" }} years</TableCell
                >
                <TableCell>
                  <Badge variant="default"> Active </Badge>
                </TableCell>
                <TableCell v-if="isAdmin" class="text-right">
                  <div class="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      @click="goToEdit(doctor)"
                    >
                      <Edit class="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      @click="handleDeleteDoctor(doctor)"
                    >
                      <Trash2 class="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <!-- Inactive Users (if any) -->
      <Card v-if="inactiveFiltered.length > 0">
        <CardHeader>
          <CardTitle class="flex items-center gap-2 text-muted-foreground">
            <User class="h-5 w-5" />
            Inactive
            {{
              activeTab === "doctors"
                ? "Doctors"
                : activeTab === "admins"
                  ? "Admins"
                  : "Users"
            }}
            ({{ inactiveFiltered.length }})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead class="w-16">Photo</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead v-if="activeTab !== 'admins'">Specialties</TableHead>
                <TableHead>Status</TableHead>
                <TableHead v-if="isAdmin" class="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow
                v-for="doctor in inactiveFiltered"
                :key="doctor._id"
                class="opacity-60"
              >
                <TableCell>
                  <div
                    class="w-12 h-12 rounded-full overflow-hidden bg-muted flex items-center justify-center"
                  >
                    <img
                      v-if="doctor.photoUrl"
                      :src="doctor.photoUrl"
                      :alt="doctor.name"
                      class="w-full h-full object-cover"
                    />
                    <User v-else class="w-6 h-6 text-muted-foreground" />
                  </div>
                </TableCell>
                <TableCell class="font-medium">{{ doctor.name }}</TableCell>
                <TableCell>{{ doctor.email }}</TableCell>
                <TableCell>
                  <Badge :variant="getUserRoleBadgeVariant(doctor)">
                    {{ getUserRoleLabel(doctor) }}
                  </Badge>
                </TableCell>
                <TableCell v-if="activeTab !== 'admins'">
                  <div class="flex flex-wrap gap-1">
                    <Badge
                      v-for="specialty in doctor.specialties"
                      :key="specialty"
                      variant="secondary"
                    >
                      {{ specialty }}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary"> Inactive </Badge>
                </TableCell>
                <TableCell v-if="isAdmin" class="text-right">
                  <div class="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      @click="goToEdit(doctor)"
                    >
                      <Edit class="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      @click="handleDeleteDoctor(doctor)"
                    >
                      <Trash2 class="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onActivated, computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useDoctorAuth } from "@/composables/useDoctorAuth";
import { useDoctorApi } from "@/composables/useDoctorApi";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Edit, Trash2, User } from "lucide-vue-next";
import { toast } from "vue-sonner";

const router = useRouter();
const route = useRoute();
const { isAdmin } = useDoctorAuth();
interface Doctor {
  _id: string;
  name: string;
  email: string;
  specialties: string[];
  bio: string;
  photoUrl: string;
  experience?: number;
  isActive: boolean;
  isDoctor: boolean;
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
}

const { getAllDoctors, deleteDoctor, loading, error } = useDoctorApi();

const doctors = ref<Doctor[]>([]);
const activeTab = ref<"doctors" | "admins" | "all">(
  (route.query.tab as "doctors" | "admins" | "all") || "all"
);

// Computed properties for filtering
const doctorsList = computed(() =>
  doctors.value.filter((doctor) => doctor.isDoctor && !doctor.isAdmin)
);
const adminsList = computed(() =>
  doctors.value.filter((doctor) => !doctor.isDoctor && doctor.isAdmin)
);
const bothRolesList = computed(() =>
  doctors.value.filter((doctor) => doctor.isDoctor && doctor.isAdmin)
);

// Filtered lists based on active tab
const filteredList = computed(() => {
  if (activeTab.value === "doctors") {
    return [...doctorsList.value, ...bothRolesList.value];
  } else if (activeTab.value === "admins") {
    return [...adminsList.value, ...bothRolesList.value];
  }
  return doctors.value;
});

const activeFiltered = computed(() =>
  filteredList.value.filter((doctor) => doctor.isActive)
);
const inactiveFiltered = computed(() =>
  filteredList.value.filter((doctor) => !doctor.isActive)
);

// Helper functions
const getUserRoleLabel = (doctor: Doctor) => {
  if (doctor.isDoctor && doctor.isAdmin) {
    return "Doctor & Admin";
  } else if (doctor.isDoctor) {
    return "Doctor";
  } else if (doctor.isAdmin) {
    return "Admin";
  }
  return "User";
};

const getUserRoleBadgeVariant = (doctor: Doctor) => {
  if (doctor.isDoctor && doctor.isAdmin) {
    return "default";
  } else if (doctor.isAdmin) {
    return "secondary";
  }
  return "outline";
};

// Load doctors
const loadDoctors = async () => {
  try {
    const doctorsData = await getAllDoctors();
    doctors.value = doctorsData;
    console.log("Loaded doctors:", doctorsData);
    console.log("Active tab:", activeTab.value);
    console.log("Admins list:", adminsList.value);
  } catch (err) {
    console.error("Failed to load doctors:", err);
    toast.error("Failed to load doctors");
  }
};

// Delete doctor
const handleDeleteDoctor = async (doctor: Doctor) => {
  if (!isAdmin.value) {
    toast.error("Admin access required");
    return;
  }

  if (!confirm(`Are you sure you want to delete Dr. ${doctor.name}?`)) {
    return;
  }

  try {
    await deleteDoctor(doctor._id);
    await loadDoctors();
    toast.success("Doctor deleted successfully");
  } catch (err) {
    console.error("Failed to delete doctor:", err);
    toast.error("Failed to delete doctor");
  }
};

// Navigation functions
const goToAddDoctor = () => {
  router.push("/doctors/new");
};

const goToAddAdmin = () => {
  router.push("/admins/new");
};

const goToEdit = (doctor: Doctor) => {
  // Route to appropriate form based on role
  if (!doctor.isDoctor && doctor.isAdmin) {
    // Admin only - use admin form
    router.push(`/admins/${doctor._id}/edit`);
  } else {
    // Doctor or Doctor+Admin - use doctor form
    router.push(`/doctors/${doctor._id}/edit`);
  }
};

onMounted(() => {
  loadDoctors();
});

// Refresh data when returning to this view (e.g., after creating admin)
onActivated(() => {
  loadDoctors();
});
</script>

<style scoped>
.doctor-profile-view {
  @apply p-6;
}
</style>
