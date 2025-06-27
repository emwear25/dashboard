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
              variant="outline"
              size="lg"
              @click="cancelEditing"
              :disabled="isSaving"
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

// Edit form
const editForm = reactive({
  name: "",
  bio: "",
  photoUrl: "",
  experience: 0,
  specialties: [] as string[],
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

  isEditing.value = true;
};

const cancelEditing = () => {
  isEditing.value = false;
  newSpecialty.value = "";
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

// Image upload handlers
const handleImageUploaded = (imageUrl: string) => {
  editForm.photoUrl = imageUrl;
};

const handleImageRemoved = () => {
  editForm.photoUrl = "";
};

// Ensure doctor data is loaded on component mount
onMounted(async () => {
  if (!doctor.value) {
    await refreshData();
  }
});
</script>
