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
  bio: string;
  photoUrl: string;
  experience?: number;
  isActive: boolean;
  isDoctor: boolean;
  isAdmin: boolean;
  countriesOfOperation?: string[];
  languages?: string[];
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
  bio: "",
  photoUrl: "",
  experience: 0,
  isActive: true,
  isDoctor: true,
  isAdmin: false,
  countriesOfOperation: [] as string[],
  languages: [] as string[],
});

const newSpecialty = ref("");
const newCountry = ref("");
const newLanguage = ref("");
const errors = ref<Record<string, string>>({});
const isSubmitting = ref(false);

// Available options
const availableCountries = [
  "Albania", "Austria", "Belgium", "Bulgaria", "Croatia", "Cyprus", "Czech Republic",
  "Denmark", "Estonia", "Finland", "France", "Germany", "Greece", "Hungary", "Ireland",
  "Italy", "Latvia", "Lithuania", "Luxembourg", "Malta", "Netherlands", "Poland",
  "Portugal", "Romania", "Slovakia", "Slovenia", "Spain", "Sweden", "Turkey", "United Kingdom"
];

const availableLanguages = [
  "Bulgarian", "Croatian", "Czech", "Danish", "Dutch", "English", "Estonian", "Finnish",
  "French", "German", "Greek", "Hungarian", "Irish", "Italian", "Latvian", "Lithuanian",
  "Maltese", "Polish", "Portuguese", "Romanian", "Slovak", "Slovenian", "Spanish", "Swedish", "Turkish"
];

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
      bio: doctor.bio || "",
      photoUrl: doctor.photoUrl || "",
      experience: doctor.experience || 0,
      isActive: doctor.isActive,
      isDoctor: doctor.isDoctor ?? true,
      isAdmin: doctor.isAdmin,
      countriesOfOperation: [...(doctor.countriesOfOperation || [])],
      languages: [...(doctor.languages || [])],
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

// Add country
const addCountry = (country?: string) => {
  const cntry = country || newCountry.value.trim();
  if (cntry && !form.value.countriesOfOperation.includes(cntry)) {
    form.value.countriesOfOperation.push(cntry);
    newCountry.value = "";
  }
};

// Remove country
const removeCountry = (index: number) => {
  form.value.countriesOfOperation.splice(index, 1);
};

// Add language
const addLanguage = (language?: string) => {
  const lang = language || newLanguage.value.trim();
  if (lang && !form.value.languages.includes(lang)) {
    form.value.languages.push(lang);
    newLanguage.value = "";
  }
};

// Remove language
const removeLanguage = (index: number) => {
  form.value.languages.splice(index, 1);
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

          <!-- Countries of Operation -->
          <div class="space-y-2">
            <label class="text-sm font-medium"> Countries of Operation </label>

            <!-- Current Countries -->
            <div class="flex flex-wrap gap-2 mb-2">
              <Badge
                v-for="(country, index) in form.countriesOfOperation"
                :key="index"
                variant="secondary"
                class="cursor-pointer"
                @click="removeCountry(index)"
              >
                {{ country }}
                <X class="ml-1 h-3 w-3" />
              </Badge>
            </div>

            <!-- Add Country -->
            <div class="flex gap-2 mb-2">
              <Input
                v-model="newCountry"
                placeholder="Search or add country"
                @keyup.enter="addCountry()"
              />
              <Button type="button" @click="addCountry()" variant="outline">
                <Plus class="h-4 w-4" />
              </Button>
            </div>

            <!-- Common Countries -->
            <div class="flex flex-wrap gap-2">
              <Button
                v-for="country in availableCountries"
                :key="country"
                type="button"
                variant="outline"
                size="sm"
                @click="addCountry(country)"
                :disabled="form.countriesOfOperation.includes(country)"
              >
                {{ country }}
              </Button>
            </div>
          </div>

          <!-- Languages -->
          <div class="space-y-2">
            <label class="text-sm font-medium"> Languages </label>

            <!-- Current Languages -->
            <div class="flex flex-wrap gap-2 mb-2">
              <Badge
                v-for="(language, index) in form.languages"
                :key="index"
                variant="secondary"
                class="cursor-pointer"
                @click="removeLanguage(index)"
              >
                {{ language }}
                <X class="ml-1 h-3 w-3" />
              </Badge>
            </div>

            <!-- Add Language -->
            <div class="flex gap-2 mb-2">
              <Input
                v-model="newLanguage"
                placeholder="Search or add language"
                @keyup.enter="addLanguage()"
              />
              <Button type="button" @click="addLanguage()" variant="outline">
                <Plus class="h-4 w-4" />
              </Button>
            </div>

            <!-- Available Languages -->
            <div class="flex flex-wrap gap-2">
              <Button
                v-for="language in availableLanguages"
                :key="language"
                type="button"
                variant="outline"
                size="sm"
                @click="addLanguage(language)"
                :disabled="form.languages.includes(language)"
              >
                {{ language }}
              </Button>
            </div>
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
                Grant administrative privileges (manage doctors, admins,
                coupons, etc.)
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
