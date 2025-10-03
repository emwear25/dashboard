<template>
  <div class="p-6">
    <!-- Profile Header -->
    <div
      class="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-8 mb-6 text-white"
    >
      <div class="flex items-center space-x-6">
        <!-- Profile Picture -->
        <div
          class="h-24 w-24 rounded-full bg-white/20 flex items-center justify-center overflow-hidden ring-4 ring-white/30"
        >
          <img
            v-if="doctor?.photoUrl"
            :src="doctor.photoUrl"
            alt="Profile"
            class="h-full w-full object-cover"
          />
          <User v-else class="h-12 w-12 text-white" />
        </div>

        <!-- Profile Info -->
        <div class="flex-1">
          <h1 class="text-3xl font-bold mb-2">
            {{ doctor?.name || "Loading..." }}
          </h1>
          <p class="text-blue-100 text-lg mb-1">
            {{ doctor?.email || "Loading..." }}
          </p>
          <div class="flex items-center space-x-4">
            <div class="flex items-center space-x-2">
              <Badge
                variant="secondary"
                class="bg-white/20 text-white border-white/30"
              >
                {{ doctor?.isAdmin ? "Admin Doctor" : "Doctor" }}
              </Badge>
              <Badge
                :variant="doctor?.isActive ? 'default' : 'secondary'"
                class="bg-white/20 text-white border-white/30"
              >
                {{ doctor?.isActive ? "Active" : "Inactive" }}
              </Badge>
            </div>
          </div>
        </div>

        <!-- Edit/Save/Cancel Buttons -->
        <div class="flex space-x-2">
          <Button
            v-if="!isEditing"
            variant="secondary"
            size="lg"
            @click="startEditing"
          >
            <Edit class="h-4 w-4 mr-2" />
            Edit Profile
          </Button>

          <template v-else>
            <Button
              variant="secondary"
              size="lg"
              @click="saveProfile"
              :disabled="isSaving"
            >
              <Save class="h-4 w-4 mr-2" />
              {{ isSaving ? "Saving..." : "Save" }}
            </Button>
            <Button
              variant="secondary"
              size="lg"
              @click="cancelEditing"
              :disabled="isSaving"
              class="bg-white/20 hover:bg-white/30 text-white border-white/30"
            >
              <X class="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </template>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Left Column - Personal Info -->
      <div class="lg:col-span-2 space-y-6">
        <!-- Professional Information -->
        <Card>
          <CardHeader>
            <CardTitle class="flex items-center gap-2">
              <Stethoscope class="h-5 w-5" />
              Professional Information
            </CardTitle>
          </CardHeader>
          <CardContent class="space-y-4">
            <!-- Name (Edit Mode) -->
            <div v-if="isEditing">
              <Label for="name" class="text-sm font-medium">Full Name</Label>
              <Input
                id="name"
                v-model="editForm.name"
                class="mt-1"
                placeholder="Enter your full name"
              />
            </div>

            <!-- Bio (Edit Mode) -->
            <div v-if="isEditing">
              <Label for="bio" class="text-sm font-medium">Bio</Label>
              <Textarea
                id="bio"
                v-model="editForm.bio"
                class="mt-1"
                rows="4"
                placeholder="Tell us about yourself..."
              />
            </div>

            <!-- Photo Upload (Edit Mode) -->
            <div v-if="isEditing">
              <Label class="text-sm font-medium">Profile Photo</Label>
              <div class="mt-2">
                <ImageUploadS3
                  :currentImageUrl="editForm.photoUrl"
                  @imageUploaded="handleImageUploaded"
                  @imageRemoved="handleImageRemoved"
                />
              </div>
            </div>

            <!-- Experience (Edit Mode) -->
            <div v-if="isEditing">
              <Label for="experience" class="text-sm font-medium"
                >Experience (Years)</Label
              >
              <Input
                id="experience"
                v-model.number="editForm.experience"
                type="number"
                min="0"
                max="50"
                class="mt-1"
                placeholder="Years of experience"
              />
            </div>

            <!-- Specialties -->
            <div>
              <h3
                class="font-medium text-sm text-muted-foreground uppercase tracking-wide mb-2"
              >
                Specialties
              </h3>

              <div v-if="!isEditing" class="flex flex-wrap gap-2">
                <Badge
                  v-for="specialty in doctor?.specialties || []"
                  :key="specialty"
                  variant="outline"
                  class="px-3 py-1"
                >
                  {{ specialty }}
                </Badge>
                <span
                  v-if="!doctor?.specialties?.length"
                  class="text-muted-foreground italic"
                >
                  No specialties added
                </span>
              </div>

              <div v-else class="space-y-2">
                <div class="flex flex-wrap gap-2">
                  <Badge
                    v-for="(specialty, index) in editForm.specialties"
                    :key="index"
                    variant="outline"
                    class="px-3 py-1 flex items-center gap-1"
                  >
                    {{ specialty }}
                    <X
                      class="h-3 w-3 cursor-pointer"
                      @click="removeSpecialty(index)"
                    />
                  </Badge>
                </div>
                <div class="flex gap-2">
                  <Input
                    v-model="newSpecialty"
                    placeholder="Add specialty"
                    @keydown.enter="addSpecialty"
                    class="flex-1"
                  />
                  <Button @click="addSpecialty" size="sm">Add</Button>
                </div>
              </div>
            </div>

            <!-- Countries of Operation -->
            <div>
              <h3
                class="font-medium text-sm text-muted-foreground uppercase tracking-wide mb-2"
              >
                Countries of Operation
              </h3>

              <div v-if="!isEditing" class="flex flex-wrap gap-2">
                <Badge
                  v-for="country in doctor?.countriesOfOperation || []"
                  :key="country"
                  variant="outline"
                  class="px-3 py-1"
                >
                  {{ country }}
                </Badge>
                <span
                  v-if="!doctor?.countriesOfOperation?.length"
                  class="text-muted-foreground italic"
                >
                  No countries added
                </span>
              </div>

              <div v-else class="space-y-2">
                <div class="flex flex-wrap gap-2">
                  <Badge
                    v-for="(country, index) in editForm.countriesOfOperation"
                    :key="index"
                    variant="outline"
                    class="px-3 py-1 flex items-center gap-1"
                  >
                    {{ country }}
                    <X
                      class="h-3 w-3 cursor-pointer"
                      @click="removeCountry(index)"
                    />
                  </Badge>
                </div>
                <div class="flex gap-2">
                  <Input
                    v-model="newCountry"
                    placeholder="Add country"
                    @keydown.enter="addCountry"
                    class="flex-1"
                  />
                  <Button @click="addCountry" size="sm">Add</Button>
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
                    :disabled="editForm.countriesOfOperation.includes(country)"
                    class="flex items-center gap-1"
                  >
                    <Plus class="h-3 w-3" />
                    {{ country }}
                  </Button>
                </div>
              </div>
            </div>

            <!-- Languages -->
            <div>
              <h3
                class="font-medium text-sm text-muted-foreground uppercase tracking-wide mb-2"
              >
                Languages
              </h3>

              <div v-if="!isEditing" class="flex flex-wrap gap-2">
                <Badge
                  v-for="language in doctor?.languages || []"
                  :key="language"
                  variant="outline"
                  class="px-3 py-1"
                >
                  {{ language }}
                </Badge>
                <span
                  v-if="!doctor?.languages?.length"
                  class="text-muted-foreground italic"
                >
                  No languages added
                </span>
              </div>

              <div v-else class="space-y-2">
                <div class="flex flex-wrap gap-2">
                  <Badge
                    v-for="(language, index) in editForm.languages"
                    :key="index"
                    variant="outline"
                    class="px-3 py-1 flex items-center gap-1"
                  >
                    {{ language }}
                    <X
                      class="h-3 w-3 cursor-pointer"
                      @click="removeLanguage(index)"
                    />
                  </Badge>
                </div>
                <div class="flex gap-2">
                  <Input
                    v-model="newLanguage"
                    placeholder="Add language"
                    @keydown.enter="addLanguage"
                    class="flex-1"
                  />
                  <Button @click="addLanguage" size="sm">Add</Button>
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
                    :disabled="editForm.languages.includes(language)"
                    class="flex items-center gap-1"
                  >
                    <Plus class="h-3 w-3" />
                    {{ language }}
                  </Button>
                </div>
              </div>
            </div>

            <!-- Experience (View Mode) -->
            <div v-if="!isEditing">
              <h3
                class="font-medium text-sm text-muted-foreground uppercase tracking-wide mb-2"
              >
                Experience
              </h3>
              <p class="text-lg font-medium">
                {{
                  doctor?.experience
                    ? `${doctor.experience} years`
                    : "Not specified"
                }}
              </p>
            </div>

            <!-- Bio (View Mode) -->
            <div v-if="!isEditing">
              <h3
                class="font-medium text-sm text-muted-foreground uppercase tracking-wide mb-2"
              >
                Bio
              </h3>
              <p class="text-muted-foreground leading-relaxed">
                {{ doctor?.bio || "No bio available" }}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Right Column - Account Info -->
      <div class="space-y-6">
        <!-- Account Details -->
        <Card>
          <CardHeader>
            <CardTitle class="flex items-center gap-2">
              <Settings class="h-5 w-5" />
              Account Details
            </CardTitle>
          </CardHeader>
          <CardContent class="space-y-4">
            <div>
              <h3
                class="font-medium text-sm text-muted-foreground uppercase tracking-wide mb-2"
              >
                Doctor ID
              </h3>
              <p class="font-mono text-sm bg-muted px-2 py-1 rounded">
                {{ doctor?._id || "Loading..." }}
              </p>
            </div>

            <div>
              <h3
                class="font-medium text-sm text-muted-foreground uppercase tracking-wide mb-2"
              >
                Email
              </h3>
              <p class="text-sm">
                {{ doctor?.email || "Loading..." }}
              </p>
            </div>

            <div>
              <h3
                class="font-medium text-sm text-muted-foreground uppercase tracking-wide mb-2"
              >
                Member Since
              </h3>
              <p class="text-sm">
                {{ formatDate(doctor?.createdAt) }}
              </p>
            </div>

            <div>
              <h3
                class="font-medium text-sm text-muted-foreground uppercase tracking-wide mb-2"
              >
                Last Updated
              </h3>
              <p class="text-sm">
                {{ formatDate(doctor?.updatedAt) }}
              </p>
            </div>
          </CardContent>
        </Card>

        <!-- Rating Stats -->
        <Card>
          <CardHeader>
            <CardTitle class="flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                />
              </svg>
              Your Ratings
            </CardTitle>
          </CardHeader>
          <CardContent class="space-y-4">
            <div
              v-if="loadingRating"
              class="text-center text-muted-foreground py-4"
            >
              Loading ratings...
            </div>
            <div
              v-else-if="ratingError"
              class="text-center text-destructive py-4"
            >
              {{ ratingError }}
            </div>
            <div v-else class="space-y-4">
              <!-- Average Rating -->
              <div class="text-center">
                <div class="text-4xl font-bold text-primary mb-2">
                  {{ rating?.averageRating?.toFixed(1) || "0.0" }}
                </div>
                <div class="flex justify-center gap-1 mb-2">
                  <svg
                    v-for="star in 5"
                    :key="star"
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-5 w-5"
                    :class="
                      star <= Math.round(rating?.averageRating || 0)
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-gray-300'
                    "
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                    />
                  </svg>
                </div>
                <p class="text-sm text-muted-foreground">
                  Based on {{ rating?.totalRatings || 0 }}
                  {{ rating?.totalRatings === 1 ? "rating" : "ratings" }}
                </p>
              </div>

              <!-- Rating Distribution -->
              <div v-if="rating && rating.totalRatings > 0" class="space-y-2">
                <div
                  v-for="star in [5, 4, 3, 2, 1]"
                  :key="star"
                  class="flex items-center gap-2"
                >
                  <span class="text-sm w-12">{{ star }} stars</span>
                  <div class="flex-1 bg-muted rounded-full h-2">
                    <div
                      class="bg-primary h-2 rounded-full transition-all"
                      :style="{
                        width: `${(rating.ratingDistribution[star] / rating.totalRatings) * 100}%`,
                      }"
                    ></div>
                  </div>
                  <span class="text-sm text-muted-foreground w-8 text-right">
                    {{ rating.ratingDistribution[star] }}
                  </span>
                </div>
              </div>

              <div v-else class="text-center text-muted-foreground py-4">
                No ratings yet
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- Quick Stats -->
        <Card>
          <CardHeader>
            <CardTitle class="flex items-center gap-2">
              <BarChart3 class="h-5 w-5" />
              Quick Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div class="space-y-3">
              <div class="flex justify-between items-center">
                <span class="text-sm text-muted-foreground">Specialties</span>
                <span class="font-medium">{{
                  doctor?.specialties?.length || 0
                }}</span>
              </div>

              <div class="flex justify-between items-center">
                <span class="text-sm text-muted-foreground">Countries</span>
                <span class="font-medium">{{
                  doctor?.countriesOfOperation?.length || 0
                }}</span>
              </div>

              <div class="flex justify-between items-center">
                <span class="text-sm text-muted-foreground">Languages</span>
                <span class="font-medium">{{
                  doctor?.languages?.length || 0
                }}</span>
              </div>

              <div class="flex justify-between items-center">
                <span class="text-sm text-muted-foreground"
                  >Account Status</span
                >
                <Badge
                  :variant="doctor?.isActive ? 'default' : 'secondary'"
                  class="text-xs"
                >
                  {{ doctor?.isActive ? "Active" : "Inactive" }}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- Debug Info (Remove this in production) -->
        <Card v-if="!doctor" class="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle class="text-yellow-800">Debug Info</CardTitle>
          </CardHeader>
          <CardContent>
            <p class="text-yellow-700 text-sm">
              Doctor data not loaded. Check authentication or API connection.
            </p>
            <Button
              @click="refreshData"
              variant="outline"
              size="sm"
              class="mt-2"
            >
              Refresh Data
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import {
  User,
  Settings,
  Edit,
  Stethoscope,
  BarChart3,
  Save,
  X,
  Plus,
} from "lucide-vue-next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

import { useToast } from "@/components/ui/toast/use-toast";
import { useDoctorAuth } from "@/composables/useDoctorAuth";
import { useDoctorApi } from "@/composables/useDoctorApi";
import ImageUploadS3 from "@/components/ImageUploadS3.vue";

const { doctor, getCurrentDoctor } = useDoctorAuth();
const { updateProfile } = useDoctorApi();
const { toast } = useToast();

// Edit state
const isEditing = ref(false);
const isSaving = ref(false);
const newSpecialty = ref("");
const newCountry = ref("");
const newLanguage = ref("");

// Available options
const availableCountries = [
  "Albania",
  "Austria",
  "Belgium",
  "Bulgaria",
  "Croatia",
  "Cyprus",
  "Czech Republic",
  "Denmark",
  "Estonia",
  "Finland",
  "France",
  "Germany",
  "Greece",
  "Hungary",
  "Ireland",
  "Italy",
  "Latvia",
  "Lithuania",
  "Luxembourg",
  "Malta",
  "Netherlands",
  "Poland",
  "Portugal",
  "Romania",
  "Slovakia",
  "Slovenia",
  "Spain",
  "Sweden",
  "Turkey",
  "United Kingdom",
];

const availableLanguages = [
  "Bulgarian",
  "Croatian",
  "Czech",
  "Danish",
  "Dutch",
  "English",
  "Estonian",
  "Finnish",
  "French",
  "German",
  "Greek",
  "Hungarian",
  "Irish",
  "Italian",
  "Latvian",
  "Lithuanian",
  "Maltese",
  "Polish",
  "Portuguese",
  "Romanian",
  "Slovak",
  "Slovenian",
  "Spanish",
  "Swedish",
  "Turkish",
];

// Rating data
const rating = ref<any>(null);
const loadingRating = ref(false);
const ratingError = ref("");

// Edit form
const editForm = reactive({
  name: "",
  bio: "",
  photoUrl: "",
  experience: 0,
  specialties: [] as string[],
  countriesOfOperation: [] as string[],
  languages: [] as string[],
});

const formatDate = (dateString?: string) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const refreshData = async () => {
  try {
    await getCurrentDoctor();
  } catch (error) {
    console.error("Failed to refresh doctor data:", error);
  }
};

const startEditing = () => {
  if (!doctor.value) return;

  // Populate edit form with current data
  editForm.name = doctor.value.name || "";
  editForm.bio = doctor.value.bio || "";
  editForm.photoUrl = doctor.value.photoUrl || "";
  editForm.experience = doctor.value.experience || 0;
  editForm.specialties = [...(doctor.value.specialties || [])];
  editForm.countriesOfOperation = [
    ...(doctor.value.countriesOfOperation || []),
  ];
  editForm.languages = [...(doctor.value.languages || [])];

  isEditing.value = true;
};

const cancelEditing = () => {
  isEditing.value = false;
  newSpecialty.value = "";
  newCountry.value = "";
  newLanguage.value = "";
};

const saveProfile = async () => {
  if (!doctor.value) return;

  isSaving.value = true;

  try {
    const updateData = {
      name: editForm.name,
      bio: editForm.bio,
      photoUrl: editForm.photoUrl,
      experience: editForm.experience,
      specialties: editForm.specialties,
      countriesOfOperation: editForm.countriesOfOperation,
      languages: editForm.languages,
    };

    await updateProfile(updateData);
    await getCurrentDoctor(); // Refresh data

    toast({
      title: "Profile Updated",
      description: "Your profile has been successfully updated.",
    });

    isEditing.value = false;
  } catch (error) {
    console.error("Failed to update profile:", error);
    toast({
      title: "Update Failed",
      description: "Failed to update your profile. Please try again.",
    });
  } finally {
    isSaving.value = false;
  }
};

const addSpecialty = () => {
  if (
    newSpecialty.value.trim() &&
    !editForm.specialties.includes(newSpecialty.value.trim())
  ) {
    editForm.specialties.push(newSpecialty.value.trim());
    newSpecialty.value = "";
  }
};

const removeSpecialty = (index: number) => {
  editForm.specialties.splice(index, 1);
};

const addCountry = (country?: string) => {
  const cntry = country || newCountry.value.trim();
  if (cntry && !editForm.countriesOfOperation.includes(cntry)) {
    editForm.countriesOfOperation.push(cntry);
    newCountry.value = "";
  }
};

const removeCountry = (index: number) => {
  editForm.countriesOfOperation.splice(index, 1);
};

const addLanguage = (language?: string) => {
  const lang = language || newLanguage.value.trim();
  if (lang && !editForm.languages.includes(lang)) {
    editForm.languages.push(lang);
    newLanguage.value = "";
  }
};

const removeLanguage = (index: number) => {
  editForm.languages.splice(index, 1);
};

// Image upload handlers
const handleImageUploaded = (imageUrl: string) => {
  editForm.photoUrl = imageUrl;
};

const handleImageRemoved = () => {
  editForm.photoUrl = "";
};

// Fetch doctor rating
const fetchRating = async () => {
  if (!doctor.value?._id) return;

  loadingRating.value = true;
  ratingError.value = "";

  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL || "http://localhost:3030"}/api/ratings/doctor/${doctor.value._id}`
    );

    const data = await response.json();

    if (data.success) {
      rating.value = data.data;
    } else {
      ratingError.value = "Failed to load ratings";
    }
  } catch (error) {
    console.error("Error fetching rating:", error);
    ratingError.value = "Failed to load ratings";
  } finally {
    loadingRating.value = false;
  }
};

// Ensure doctor data is loaded on component mount
onMounted(async () => {
  if (!doctor.value) {
    await refreshData();
  }
  // Fetch rating after doctor data is loaded
  await fetchRating();
});
</script>
