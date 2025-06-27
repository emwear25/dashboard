<template>
  <div class="space-y-4">
    <!-- Current Image Display -->
    <div class="flex items-center space-x-4">
      <div
        class="h-20 w-20 rounded-full bg-muted flex items-center justify-center overflow-hidden ring-2 ring-border"
      >
        <img
          v-if="currentImageUrl"
          :src="currentImageUrl"
          alt="Profile"
          class="h-full w-full object-cover"
        />
        <User v-else class="h-10 w-10 text-muted-foreground" />
      </div>

      <div class="flex-1">
        <p class="font-medium">Profile Picture</p>
        <p class="text-sm text-muted-foreground">
          Upload a new image to update your profile picture
        </p>
      </div>
    </div>

    <!-- Upload Area -->
    <div class="space-y-3">
      <!-- File Input -->
      <div
        class="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer"
        @click="triggerFileInput"
        @drop="handleDrop"
        @dragover.prevent
        @dragenter.prevent
        :class="{ 'border-primary': isDragging }"
      >
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          @change="handleFileSelect"
          class="hidden"
        />

        <Upload class="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p class="text-sm font-medium mb-1">Click to upload or drag and drop</p>
        <p class="text-xs text-muted-foreground">PNG, JPG, GIF up to 5MB</p>
      </div>

      <!-- Upload Progress -->
      <div v-if="isUploading" class="space-y-2">
        <div class="flex items-center space-x-2">
          <Loader2 class="h-4 w-4 animate-spin" />
          <span class="text-sm">Uploading...</span>
        </div>
        <div class="w-full bg-muted rounded-full h-2">
          <div
            class="bg-primary h-2 rounded-full transition-all duration-300"
            :style="{ width: `${uploadProgress}%` }"
          ></div>
        </div>
      </div>

      <!-- Error Message -->
      <div
        v-if="error"
        class="text-sm text-destructive bg-destructive/10 p-3 rounded-lg"
      >
        {{ error }}
      </div>

      <!-- Action Buttons -->
      <div class="flex space-x-2">
        <Button @click="triggerFileInput" :disabled="isUploading" size="sm">
          <Upload class="h-4 w-4 mr-2" />
          Choose File
        </Button>

        <Button
          v-if="selectedFile"
          @click="uploadImage"
          :disabled="isUploading"
          size="sm"
        >
          <Save class="h-4 w-4 mr-2" />
          Upload
        </Button>

        <Button
          v-if="currentImageUrl && !isUploading"
          @click="removeImage"
          variant="outline"
          size="sm"
        >
          <Trash2 class="h-4 w-4 mr-2" />
          Remove
        </Button>
      </div>

      <!-- Selected File Info -->
      <div
        v-if="selectedFile"
        class="text-sm text-muted-foreground bg-muted p-3 rounded-lg"
      >
        <div class="flex items-center justify-between">
          <span>{{ selectedFile.name }}</span>
          <span>{{ formatFileSize(selectedFile.size) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { User, Upload, Save, Trash2, Loader2 } from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast/use-toast";

interface Props {
  currentImageUrl?: string;
}

interface Emits {
  (e: "imageUploaded", imageUrl: string): void;
  (e: "imageRemoved"): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();
const { toast } = useToast();

// State
const fileInput = ref<HTMLInputElement>();
const selectedFile = ref<File | null>(null);
const isUploading = ref(false);
const uploadProgress = ref(0);
const error = ref("");
const isDragging = ref(false);

// Methods
const triggerFileInput = () => {
  fileInput.value?.click();
};

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    validateAndSetFile(file);
  }
};

const handleDrop = (event: DragEvent) => {
  event.preventDefault();
  isDragging.value = false;

  const file = event.dataTransfer?.files[0];
  if (file) {
    validateAndSetFile(file);
  }
};

const validateAndSetFile = (file: File) => {
  error.value = "";

  // Validate file type
  if (!file.type.startsWith("image/")) {
    error.value = "Please select an image file";
    return;
  }

  // Validate file size (5MB)
  if (file.size > 5 * 1024 * 1024) {
    error.value = "File size must be less than 5MB";
    return;
  }

  selectedFile.value = file;
};

const uploadImage = async () => {
  if (!selectedFile.value) return;

  isUploading.value = true;
  uploadProgress.value = 0;
  error.value = "";

  try {
    const formData = new FormData();
    formData.append("profileImage", selectedFile.value);

    // Simulate progress
    const progressInterval = setInterval(() => {
      uploadProgress.value = Math.min(uploadProgress.value + 10, 90);
    }, 100);

    const API_BASE_URL =
      import.meta.env.VITE_API_URL || "http://localhost:3030";
    const response = await fetch(
      `${API_BASE_URL}/api/upload/local/doctor-profile`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("doctor_access_token")}`,
        },
        body: formData,
      }
    );

    clearInterval(progressInterval);
    uploadProgress.value = 100;

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Upload failed");
    }

    const data = await response.json();

    toast({
      title: "Upload Successful",
      description: "Your profile image has been updated.",
    });

    emit("imageUploaded", data.imageUrl);
    selectedFile.value = null;
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Upload failed";
    error.value = errorMessage;
    toast({
      title: "Upload Failed",
      description: error.value,
    });
  } finally {
    isUploading.value = false;
    uploadProgress.value = 0;
  }
};

const removeImage = async () => {
  if (!props.currentImageUrl) return;

  try {
    const API_BASE_URL =
      import.meta.env.VITE_API_URL || "http://localhost:3030";
    const response = await fetch(`${API_BASE_URL}/api/upload/local/image`, {
      method: "DELETE",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("doctor_access_token")}`,
      },
      body: JSON.stringify({ imageUrl: props.currentImageUrl }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to remove image");
    }

    toast({
      title: "Image Removed",
      description: "Your profile image has been removed.",
    });

    emit("imageRemoved");
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Failed to remove image";
    toast({
      title: "Removal Failed",
      description: errorMessage,
    });
  }
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

// Watch for file changes to auto-upload
watch(selectedFile, (newFile) => {
  if (newFile) {
    // Auto upload after file selection
    uploadImage();
  }
});
</script>
