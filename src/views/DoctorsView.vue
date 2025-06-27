<template>
  <div class="container mx-auto p-6 space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">Doctors Management</h1>
        <p class="text-muted-foreground">
          Manage all doctors in the system (Admin Only)
        </p>
      </div>

      <Button
        v-if="isAdmin"
        @click="goToAddDoctor"
        class="flex items-center gap-2"
      >
        <Plus class="h-4 w-4" />
        Add Doctor
      </Button>
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

    <!-- Doctors List -->
    <div v-else class="space-y-6">
      <!-- Active Doctors -->
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <User class="h-5 w-5" />
            Active Doctors ({{ activeDoctors.length }})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            v-if="activeDoctors.length === 0"
            class="text-center py-8 text-muted-foreground"
          >
            No active doctors found
          </div>

          <Table v-else>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Specialties</TableHead>
                <TableHead>Plans Offered</TableHead>
                <TableHead>Experience</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead v-if="isAdmin" class="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="doctor in activeDoctors" :key="doctor._id">
                <TableCell class="font-medium">{{ doctor.name }}</TableCell>
                <TableCell>{{ doctor.email }}</TableCell>
                <TableCell>
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
                  <div class="flex flex-wrap gap-1">
                    <Badge
                      v-for="plan in doctor.plansOffered"
                      :key="plan"
                      variant="outline"
                    >
                      {{ plan }}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>{{ doctor.experience || "N/A" }} years</TableCell>
                <TableCell>
                  <Badge v-if="doctor.isAdmin" variant="default"> Admin </Badge>
                  <span v-else class="text-muted-foreground">User</span>
                </TableCell>
                <TableCell v-if="isAdmin" class="text-right">
                  <div class="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      @click="goToEditDoctor(doctor._id)"
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

      <!-- Inactive Doctors (if any) -->
      <Card v-if="inactiveDoctors.length > 0">
        <CardHeader>
          <CardTitle class="flex items-center gap-2 text-muted-foreground">
            <User class="h-5 w-5" />
            Inactive Doctors ({{ inactiveDoctors.length }})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Specialties</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead v-if="isAdmin" class="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow
                v-for="doctor in inactiveDoctors"
                :key="doctor._id"
                class="opacity-60"
              >
                <TableCell class="font-medium">{{ doctor.name }}</TableCell>
                <TableCell>{{ doctor.email }}</TableCell>
                <TableCell>
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
                  <Badge v-if="doctor.isAdmin" variant="default"> Admin </Badge>
                  <span v-else class="text-muted-foreground">User</span>
                </TableCell>
                <TableCell v-if="isAdmin" class="text-right">
                  <div class="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      @click="goToEditDoctor(doctor._id)"
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
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
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
const { isAdmin } = useDoctorAuth();
interface Doctor {
  _id: string;
  name: string;
  email: string;
  specialties: string[];
  plansOffered: string[];
  bio: string;
  photoUrl: string;
  experience?: number;
  isActive: boolean;
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
}

const { getAllDoctors, deleteDoctor, loading, error } = useDoctorApi();

const doctors = ref<Doctor[]>([]);

// Computed properties
const activeDoctors = computed(() =>
  doctors.value.filter((doctor) => doctor.isActive)
);
const inactiveDoctors = computed(() =>
  doctors.value.filter((doctor) => !doctor.isActive)
);

// Load doctors
const loadDoctors = async () => {
  try {
    doctors.value = await getAllDoctors();
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

const goToEditDoctor = (doctorId: string) => {
  router.push(`/doctors/${doctorId}/edit`);
};

onMounted(() => {
  loadDoctors();
});
</script>

<style scoped>
.doctor-profile-view {
  @apply p-6;
}
</style>
