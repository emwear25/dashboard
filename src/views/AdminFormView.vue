<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useDoctorAuth } from "@/composables/useDoctorAuth";
import { useDoctorApi } from "@/composables/useDoctorApi";
import ImageUploadS3 from "@/components/ImageUploadS3.vue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft } from "lucide-vue-next";
import { toast } from "vue-sonner";

interface Admin {
  _id: string;
  name: string;
  email: string;
  photoUrl: string;
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
  photoUrl: "",
  isActive: true,
  isDoctor: false,
  isAdmin: true,
  // Required fields for backend but not used for admins
  specialties: ["Administration"] as string[],
  bio: "",
});

const errors = ref<Record<string, string>>({});
const isSubmitting = ref(false);

// Computed
const isEditMode = computed(() => !!route.params.id);
const adminId = computed(() => route.params.id as string);

// Load admin for editing
const loadAdmin = async () => {
  if (!isEditMode.value) return;

  try {
    const admin = await getDoctorById(adminId.value);
    form.value = {
      name: admin.name,
      email: admin.email,
      password: "", // Don't load password
      photoUrl: admin.photoUrl || "",
      isActive: admin.isActive,
      isDoctor: false,
      isAdmin: true,
      specialties: ["Administration"],
      bio: "",
    };
  } catch (err) {
    console.error("Failed to load admin:", err);
    toast.error("Failed to load admin");
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
    errors.value.password = "Password is required for new admins";
  }

  if (form.value.password && form.value.password.length < 8) {
    errors.value.password = "Password must be at least 8 characters";
  }

  return Object.keys(errors.value).length === 0;
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
      await updateDoctor(adminId.value, payload);
      toast.success("Admin updated successfully");
    } else {
      await createDoctor(payload);
      toast.success("Admin created successfully");
    }

    router.push("/doctors?tab=admins");
  } catch (err: unknown) {
    console.error("Failed to save admin:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Failed to save admin";
    toast.error(errorMessage);
  } finally {
    isSubmitting.value = false;
  }
};

// Navigation
const goBack = () => {
  router.push("/doctors?tab=admins");
};

onMounted(() => {
  loadAdmin();
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
          {{ isEditMode ? "Edit Admin" : "Add New Admin" }}
        </h1>
        <p class="text-muted-foreground">
          {{
            isEditMode
              ? "Update admin information"
              : "Create a new admin account"
          }}
        </p>
      </div>
    </div>

    <!-- Form -->
    <Card>
      <CardHeader>
        <CardTitle>Admin Information</CardTitle>
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
                placeholder="John Doe"
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
                placeholder="admin@telemedker.com"
                :class="{ 'border-destructive': errors.email }"
              />
              <p v-if="errors.email" class="text-sm text-destructive">
                {{ errors.email }}
              </p>
            </div>

            <div class="space-y-2 md:col-span-2">
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

          <!-- Status -->
          <div class="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <label class="text-sm font-medium"> Active Status </label>
              <p class="text-xs text-muted-foreground">
                Allow this admin to log in and manage the system
              </p>
            </div>
            <Switch v-model:checked="form.isActive" />
          </div>

          <!-- Info Note -->
          <div class="p-4 bg-muted rounded-lg">
            <p class="text-sm text-muted-foreground">
              <strong>Admin Role:</strong> This account will have access to
              manage doctors, subscribers, and system settings. Admin accounts
              are not visible to patients and cannot manage appointments or
              availability.
            </p>
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
                    ? "Update Admin"
                    : "Create Admin"
              }}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  </div>
</template>
