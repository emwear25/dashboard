<script setup lang="ts">
import { ref, inject, onMounted } from "vue";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast/use-toast";
import { useAuthStore } from "@/stores/auth";

// Get API client from plugin
const api = inject("api") as <T>(
  endpoint: string,
  options?: RequestInit
) => Promise<T>;

const { toast } = useToast();
const authStore = useAuthStore();

// User profile data
const userProfile = ref({
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  position: "",
  image: null as File | null,
});

// Profile image preview
const imagePreview = ref<string | null>(null);
const isSubmitting = ref(false);
const isLoading = ref(true);

// Fetch user profile data
const fetchUserProfile = async () => {
  try {
    isLoading.value = true;
    const userData = await api<any>("/auth/profile");

    userProfile.value = {
      firstName: userData.firstName || "",
      lastName: userData.lastName || "",
      email: userData.email || "",
      phone: userData.phone || "",
      position: userData.position || "",
      image: null,
    };

    // Set image preview if user has a profile image
    if (userData.imageUrl) {
      imagePreview.value = userData.imageUrl;
    }
  } catch (error) {
    console.error("Error fetching user profile:", error);
    toast({
      title: "Error",
      description: "Failed to load user profile data",
      variant: "destructive",
    });
  } finally {
    isLoading.value = false;
  }
};

// Handle image upload
const handleImageUpload = (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    const file = input.files[0];
    userProfile.value.image = file;

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      imagePreview.value = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }
};

// Clear image
const clearImage = () => {
  userProfile.value.image = null;

  // If there was an existing image from the server, restore it
  if (authStore.user?.imageUrl) {
    imagePreview.value = authStore.user.imageUrl;
  } else {
    imagePreview.value = null;
  }

  // Reset file input
  const fileInput = document.getElementById(
    "profile-image"
  ) as HTMLInputElement;
  if (fileInput) {
    fileInput.value = "";
  }
};

// Save user profile
const saveUserProfile = async () => {
  try {
    isSubmitting.value = true;

    // Create FormData for file upload
    const formData = new FormData();

    // Add user data as JSON
    formData.append(
      "data",
      JSON.stringify({
        firstName: userProfile.value.firstName,
        lastName: userProfile.value.lastName,
        phone: userProfile.value.phone,
        position: userProfile.value.position,
      })
    );

    // Add image if exists
    if (userProfile.value.image) {
      formData.append("image", userProfile.value.image);
    }

    // Send to API
    const response = await api<any>("/auth/profile", {
      method: "PUT",
      body: formData,
    });

    if (response.success) {
      // Update auth store with new user data
      await authStore.refreshUserData();

      toast({
        title: "Success",
        description: "Profile updated successfully",
        variant: "default",
      });
    } else {
      throw new Error(response.message || "Failed to update profile");
    }
  } catch (error) {
    console.error("Error updating profile:", error);
    toast({
      title: "Error",
      description: "Failed to update profile",
      variant: "destructive",
    });
  } finally {
    isSubmitting.value = false;
  }
};

// Load user profile on component mount
onMounted(() => {
  fetchUserProfile();
});
</script>

<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">Profile Settings</h1>

    <Card class="max-w-2xl">
      <CardHeader>
        <CardTitle>User Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <div v-if="isLoading" class="flex justify-center py-8">
          <div
            class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"
          ></div>
        </div>

        <form v-else @submit.prevent="saveUserProfile" class="space-y-4">
          <!-- Profile Image -->
          <div class="flex flex-col items-center mb-6">
            <div class="relative mb-4">
              <div
                class="w-24 h-24 rounded-full overflow-hidden bg-muted flex items-center justify-center"
              >
                <img
                  v-if="imagePreview"
                  :src="imagePreview"
                  alt="Profile"
                  class="w-full h-full object-cover"
                />
                <svg
                  v-else
                  xmlns="http://www.w3.org/2000/svg"
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="text-muted-foreground"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
              <Button
                v-if="imagePreview"
                type="button"
                variant="destructive"
                size="icon"
                class="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                @click="clearImage"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M18 6 6 18"></path>
                  <path d="m6 6 12 12"></path>
                </svg>
              </Button>
            </div>
            <div class="mb-2">
              <label
                for="profile-image"
                class="cursor-pointer px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Upload Photo
              </label>
              <Input
                id="profile-image"
                type="file"
                accept="image/*"
                class="hidden"
                @change="handleImageUpload"
              />
            </div>
            <p class="text-xs text-muted-foreground">
              Recommended: Square image, max 5MB
            </p>
          </div>

          <!-- User Details -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-2">
              <label class="text-sm font-medium">First Name</label>
              <Input
                v-model="userProfile.firstName"
                placeholder="Enter first name"
              />
            </div>
            <div class="space-y-2">
              <label class="text-sm font-medium">Last Name</label>
              <Input
                v-model="userProfile.lastName"
                placeholder="Enter last name"
              />
            </div>
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium">Email</label>
            <Input v-model="userProfile.email" type="email" disabled />
            <p class="text-xs text-muted-foreground">Email cannot be changed</p>
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium">Phone</label>
            <Input
              v-model="userProfile.phone"
              type="tel"
              placeholder="Enter phone number"
            />
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium">Position</label>
            <Input
              v-model="userProfile.position"
              placeholder="Enter your position"
            />
          </div>

          <Button type="submit" class="mt-4" :disabled="isSubmitting">
            {{ isSubmitting ? "Saving..." : "Save Profile" }}
          </Button>
        </form>
      </CardContent>
    </Card>
  </div>
</template>
