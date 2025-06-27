<template>
  <div class="image-upload-container">
    <!-- Current Image Display -->
    <div v-if="currentImageUrl" class="current-image-section mb-4">
      <div class="image-preview">
        <img
          :src="currentImageUrl"
          alt="Current profile image"
          class="current-image"
        />
        <Button
          @click="removeImage"
          variant="destructive"
          size="sm"
          class="remove-button"
          :disabled="uploading"
        >
          <X class="h-4 w-4" />
        </Button>
      </div>
    </div>

    <!-- Upload Area -->
    <div
      class="upload-area"
      :class="{
        'drag-over': isDragOver,
        'has-image': currentImageUrl,
        uploading: uploading,
      }"
      @drop="handleDrop"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @click="triggerFileInput"
    >
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        class="hidden"
        @change="handleFileSelect"
        :disabled="uploading"
      />

      <div v-if="uploading" class="upload-state">
        <Loader2 class="h-8 w-8 animate-spin text-primary" />
        <p class="text-sm text-muted-foreground mt-2">Uploading image...</p>
        <div class="progress-bar mt-2">
          <div
            class="progress-fill"
            :style="{ width: `${uploadProgress}%` }"
          ></div>
        </div>
      </div>

      <div v-else class="upload-prompt">
        <Upload class="h-8 w-8 text-muted-foreground mb-2" />
        <p class="text-sm font-medium text-foreground">
          {{ currentImageUrl ? "Change Image" : "Upload Profile Image" }}
        </p>
        <p class="text-xs text-muted-foreground mt-1">
          Drag and drop or click to browse
        </p>
        <p class="text-xs text-muted-foreground">
          Supports: JPG, PNG, GIF, WebP (max 5MB)
        </p>
      </div>
    </div>

    <!-- Error Display -->
    <div v-if="error" class="error-message mt-2">
      <p class="text-sm text-destructive">{{ error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2 } from "lucide-vue-next";
import { useDoctorAuth } from "@/composables/useDoctorAuth";
import { toast } from "vue-sonner";

interface Props {
  currentImageUrl?: string;
}

interface Emits {
  (e: "imageUploaded", imageUrl: string): void;
  (e: "imageRemoved"): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const { makeAuthenticatedRequest } = useDoctorAuth();

// Reactive state
const fileInput = ref<HTMLInputElement>();
const isDragOver = ref(false);
const uploading = ref(false);
const uploadProgress = ref(0);
const error = ref<string | null>(null);

// File validation
const validateFile = (file: File): string | null => {
  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
  ];
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (!allowedTypes.includes(file.type)) {
    return "Please select a valid image file (JPG, PNG, GIF, WebP)";
  }

  if (file.size > maxSize) {
    return "File size must be less than 5MB";
  }

  return null;
};

// Upload image to S3
const uploadImage = async (file: File) => {
  try {
    uploading.value = true;
    uploadProgress.value = 0;
    error.value = null;

    const formData = new FormData();
    formData.append("image", file);

    // Simulate progress (since we can't track real progress with fetch)
    const progressInterval = setInterval(() => {
      if (uploadProgress.value < 90) {
        uploadProgress.value += 10;
      }
    }, 100);

    const response = await makeAuthenticatedRequest(
      "/api/upload/s3/doctor-profile",
      {
        method: "POST",
        body: formData,
      }
    );

    clearInterval(progressInterval);
    uploadProgress.value = 100;

    if (response.success) {
      emit("imageUploaded", response.imageUrl);
      toast.success("Image uploaded successfully!");
    } else {
      throw new Error(response.message || "Upload failed");
    }
  } catch (err: any) {
    console.error("Upload error:", err);
    error.value = err.message || "Failed to upload image";
    toast.error("Failed to upload image");
  } finally {
    uploading.value = false;
    uploadProgress.value = 0;
  }
};

// Remove image from S3
const removeImage = async () => {
  if (!props.currentImageUrl) return;

  try {
    await makeAuthenticatedRequest("/api/upload/s3/image", {
      method: "DELETE",
      body: JSON.stringify({ imageUrl: props.currentImageUrl }),
    });

    emit("imageRemoved");
    toast.success("Image removed successfully!");
  } catch (err: any) {
    console.error("Remove error:", err);
    toast.error("Failed to remove image");
  }
};

// File input handlers
const triggerFileInput = () => {
  if (!uploading.value) {
    fileInput.value?.click();
  }
};

const handleFileSelect = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (file) {
    processFile(file);
  }
};

// Drag and drop handlers
const handleDragOver = (event: DragEvent) => {
  event.preventDefault();
  isDragOver.value = true;
};

const handleDragLeave = () => {
  isDragOver.value = false;
};

const handleDrop = (event: DragEvent) => {
  event.preventDefault();
  isDragOver.value = false;

  const file = event.dataTransfer?.files?.[0];
  if (file) {
    processFile(file);
  }
};

// Process selected file
const processFile = (file: File) => {
  const validationError = validateFile(file);
  if (validationError) {
    error.value = validationError;
    toast.error(validationError);
    return;
  }

  uploadImage(file);
};

// Clear error when props change
watch(
  () => props.currentImageUrl,
  () => {
    error.value = null;
  }
);
</script>

<style scoped>
.image-upload-container {
  @apply w-full max-w-md mx-auto;
}

.current-image-section {
  @apply relative;
}

.image-preview {
  @apply relative inline-block;
}

.current-image {
  @apply w-32 h-32 object-cover rounded-lg border-2 border-border;
}

.remove-button {
  @apply absolute -top-2 -right-2 rounded-full w-6 h-6 p-0;
}

.upload-area {
  @apply border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer transition-all duration-200 hover:border-primary hover:bg-accent/50;
}

.upload-area.drag-over {
  @apply border-primary bg-accent/50;
}

.upload-area.has-image {
  @apply p-4;
}

.upload-area.uploading {
  @apply cursor-not-allowed;
}

.upload-state {
  @apply flex flex-col items-center;
}

.upload-prompt {
  @apply flex flex-col items-center;
}

.progress-bar {
  @apply w-full h-2 bg-muted rounded-full overflow-hidden;
}

.progress-fill {
  @apply h-full bg-primary transition-all duration-300;
}

.error-message {
  @apply p-2 bg-destructive/10 border border-destructive/20 rounded-md;
}
</style>
