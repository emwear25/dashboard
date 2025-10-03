<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useDoctorAuth } from "@/composables/useDoctorAuth";
import { useDoctorApi } from "@/composables/useDoctorApi";
import ImageUploadS3 from "@/components/ImageUploadS3.vue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Plus, X } from "lucide-vue-next";
import { toast } from "vue-sonner";

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
  isDoctor: boolean;
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
}

const route = useRoute();
const router = useRouter();
const { requireAdmin } = useDoctorAuth();
const { createDoctor, updateDoctor, getDoctorById, loading } = useDoctorApi();

// Check admin access
requireAdmin();

// Form state
const form = ref({
  name: "",
  email: "",
  password: "",
  specialties: [] as string[],
  plansOffered: [] as string[],
  bio: "",
  photoUrl: "",
  experience: 0,
  isActive: true,
  isDoctor: true,
  isAdmin: false,
});

const newSpecialty = ref("");
const errors = ref<Record<string, string>>({});
const isSubmitting = ref(false);

// Available options
const availablePlans = ["consultation"];

const commonSpecialties = [
  "General Medicine",
  "Cardiology",
  "Dermatology",
  "Neurology",
  "Pediatrics",
  "Psychiatry",
  "Orthopedics",
  "Gynecology",
  "Oncology",
  "Emergency Medicine",
];

// Computed
const isEditMode = computed(() => !!route.params.id);
const doctorId = computed(() => route.params.id as string);

// Load doctor for editing
const loadDoctor = async () => {
  if (!isEditMode.value) return;

  try {
    const doctor = await getDoctorById(doctorId.value);
    form.value = {
      name: doctor.name,
      email: doctor.email,
      password: "", // Don't load password
      specialties: [...doctor.specialties],
      plansOffered: [...doctor.plansOffered],
      bio: doctor.bio || "",
      photoUrl: doctor.photoUrl || "",
      experience: doctor.experience || 0,
      isActive: doctor.isActive,
      isDoctor: doctor.isDoctor ?? true,
      isAdmin: doctor.isAdmin,
    };
  } catch (err) {
    console.error("Failed to load doctor:", err);
    toast.error("Failed to load doctor");
    router.push("/doctors");
  }
};

// Validation
const validateForm = () => {
  errors.value = {};

  if (!form.value.name.trim()) {
    errors.value.name = "Name is required";
  }

  if (!form.value.email.trim()) {
    errors.value.email = "Email is required";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email)) {
    errors.value.email = "Valid email is required";
  }

  if (!isEditMode.value && !form.value.password.trim()) {
    errors.value.password = "Password is required for new doctors";
  }

  if (form.value.password && form.value.password.length < 8) {
    errors.value.password = "Password must be at least 8 characters";
  }

  if (form.value.specialties.length === 0) {
    errors.value.specialties = "At least one specialty is required";
  }

  if (form.value.plansOffered.length === 0) {
    errors.value.plansOffered = "At least one plan is required";
  }

  return Object.keys(errors.value).length === 0;
};

// Add specialty
const addSpecialty = (specialty?: string) => {
  const spec = specialty || newSpecialty.value.trim();
  if (spec && !form.value.specialties.includes(spec)) {
    form.value.specialties.push(spec);
    newSpecialty.value = "";
  }
};

// Remove specialty
const removeSpecialty = (index: number) => {
  form.value.specialties.splice(index, 1);
};

// Toggle plan
const togglePlan = (plan: string) => {
  const index = form.value.plansOffered.indexOf(plan);
  if (index > -1) {
    form.value.plansOffered.splice(index, 1);
  } else {
    form.value.plansOffered.push(plan);
  }
};

// Image upload handlers
const handleImageUploaded = (imageUrl: string) => {
  form.value.photoUrl = imageUrl;
};

const handleImageRemoved = () => {
  form.value.photoUrl = "";
};

// Submit form
const handleSubmit = async () => {
  if (!validateForm()) {
    toast.error("Please fix the form errors");
    return;
  }

  isSubmitting.value = true;

  try {
    const payload = {
      ...form.value,
      // Only include password if it's set
      ...(form.value.password ? { password: form.value.password } : {}),
    };

    if (isEditMode.value) {
      await updateDoctor(doctorId.value, payload);
      toast.success("Doctor updated successfully");
    } else {
      await createDoctor(payload);
      toast.success("Doctor created successfully");
    }

    router.push("/doctors");
  } catch (err: unknown) {
    console.error("Failed to save doctor:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Failed to save doctor";
    toast.error(errorMessage);
  } finally {
    isSubmitting.value = false;
  }
};

// Navigation
const goBack = () => {
  router.push("/doctors");
};

onMounted(() => {
  loadDoctor();
});
</script>

<template>
  <div class="container mx-auto p-6 max-w-4xl">
    <!-- Header -->
    <div class="flex items-center gap-4 mb-6">
      <Button variant="ghost" size="icon" @click="goBack">
        <ArrowLeft class="h-4 w-4" />
      </Button>
      <div>
        <h1 class="text-3xl font-bold tracking-tight">
          {{ isEditMode ? "Edit Doctor" : "Add New Doctor" }}
        </h1>
        <p class="text-muted-foreground">
          {{
            isEditMode
              ? "Update doctor information"
              : "Create a new doctor profile"
          }}
        </p>
      </div>
    </div>

    <!-- Form -->
    <Card>
      <CardHeader>
        <CardTitle>Doctor Information</CardTitle>
      </CardHeader>
      <CardContent>
        <form @submit.prevent="handleSubmit" class="space-y-6">
          <!-- Basic Information -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-2">
              <label for="name" class="text-sm font-medium"> Name * </label>
              <Input
                id="name"
                v-model="form.name"
                placeholder="Dr. John Doe"
                :class="{ 'border-destructive': errors.name }"
              />
              <p v-if="errors.name" class="text-sm text-destructive">
                {{ errors.name }}
              </p>
            </div>

            <div class="space-y-2">
              <label for="email" class="text-sm font-medium"> Email * </label>
              <Input
                id="email"
                v-model="form.email"
                type="email"
                placeholder="doctor@telemedker.com"
                :class="{ 'border-destructive': errors.email }"
              />
              <p v-if="errors.email" class="text-sm text-destructive">
                {{ errors.email }}
              </p>
            </div>

            <div class="space-y-2">
              <label for="password" class="text-sm font-medium">
                Password
                {{ isEditMode ? "(leave empty to keep current)" : "*" }}
              </label>
              <Input
                id="password"
                v-model="form.password"
                type="password"
                placeholder="Enter password"
                :class="{ 'border-destructive': errors.password }"
              />
              <p v-if="errors.password" class="text-sm text-destructive">
                {{ errors.password }}
              </p>
            </div>

            <div class="space-y-2">
              <label for="experience" class="text-sm font-medium">
                Experience (years)
              </label>
              <Input
                id="experience"
                v-model.number="form.experience"
                type="number"
                min="0"
                max="60"
                placeholder="10"
              />
            </div>
          </div>

          <!-- Bio -->
          <div class="space-y-2">
            <label for="bio" class="text-sm font-medium"> Biography </label>
            <Textarea
              id="bio"
              v-model="form.bio"
              placeholder="Professional background and qualifications"
              rows="3"
            />
          </div>

          <!-- Photo Upload -->
          <div class="space-y-2">
            <label class="text-sm font-medium">Profile Photo</label>
            <ImageUploadS3
              :currentImageUrl="form.photoUrl"
              @imageUploaded="handleImageUploaded"
              @imageRemoved="handleImageRemoved"
            />
          </div>

          <!-- Specialties -->
          <div class="space-y-2">
            <label class="text-sm font-medium"> Specialties * </label>

            <!-- Current Specialties -->
            <div class="flex flex-wrap gap-2 mb-2">
              <Badge
                v-for="(specialty, index) in form.specialties"
                :key="index"
                variant="secondary"
                class="cursor-pointer"
                @click="removeSpecialty(index)"
              >
                {{ specialty }}
                <X class="ml-1 h-3 w-3" />
              </Badge>
            </div>

            <!-- Add Specialty -->
            <div class="flex gap-2 mb-2">
              <Input
                v-model="newSpecialty"
                placeholder="Add custom specialty"
                @keyup.enter="addSpecialty()"
              />
              <Button type="button" @click="addSpecialty()" variant="outline">
                <Plus class="h-4 w-4" />
              </Button>
            </div>

            <!-- Common Specialties -->
            <div class="flex flex-wrap gap-2">
              <Button
                v-for="specialty in commonSpecialties"
                :key="specialty"
                type="button"
                variant="outline"
                size="sm"
                @click="addSpecialty(specialty)"
                :disabled="form.specialties.includes(specialty)"
              >
                {{ specialty }}
              </Button>
            </div>

            <p v-if="errors.specialties" class="text-sm text-destructive">
              {{ errors.specialties }}
            </p>
          </div>

          <!-- Plans Offered -->
          <div class="space-y-2">
            <label class="text-sm font-medium"> Plans Offered * </label>

            <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div
                v-for="plan in availablePlans"
                :key="plan"
                class="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-accent"
                :class="{
                  'bg-accent border-primary': form.plansOffered.includes(plan),
                }"
                @click="togglePlan(plan)"
              >
                <input
                  type="checkbox"
                  :checked="form.plansOffered.includes(plan)"
                  class="rounded"
                  readonly
                />
                <label class="capitalize cursor-pointer flex-1">
                  {{ plan }}
                </label>
              </div>
            </div>

            <p v-if="errors.plansOffered" class="text-sm text-destructive">
              {{ errors.plansOffered }}
            </p>
          </div>

          <!-- Status -->
          <div class="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <label class="text-sm font-medium"> Active Status </label>
              <p class="text-xs text-muted-foreground">
                Allow this doctor to log in and take appointments
              </p>
            </div>
            <Switch v-model:checked="form.isActive" />
          </div>

          <!-- Admin Access -->
          <div class="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <label class="text-sm font-medium"> Admin Access </label>
              <p class="text-xs text-muted-foreground">
                Grant administrative privileges (manage doctors, admins, coupons, etc.)
              </p>
            </div>
            <Switch v-model:checked="form.isAdmin" />
          </div>

          <!-- Submit Button -->
          <div class="flex justify-end gap-3">
            <Button type="button" variant="outline" @click="goBack">
              Cancel
            </Button>
            <Button type="submit" :disabled="isSubmitting || loading">
              {{
                isSubmitting
                  ? "Saving..."
                  : isEditMode
                    ? "Update Doctor"
                    : "Create Doctor"
              }}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  </div>
</template>
