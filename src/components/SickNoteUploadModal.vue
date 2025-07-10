<template>
  <Dialog v-model:open="isOpen">
    <DialogContent class="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <ClipboardList class="h-5 w-5 text-purple-600" />
          Issue Sick Note
        </DialogTitle>
        <DialogDescription class="flex items-center gap-2">
          <div class="flex items-center">
            <div
              class="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-2"
            >
              <User class="h-4 w-4 text-white" />
            </div>
            <span
              >Creating medical certificate for
              <strong>{{ patientName }}</strong></span
            >
          </div>
        </DialogDescription>
      </DialogHeader>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <!-- Title -->
        <div>
          <Label for="title">Title *</Label>
          <Input
            id="title"
            v-model="form.title"
            placeholder="e.g., Work Incapacity Certificate"
            required
          />
          <p v-if="errors.title" class="text-sm text-red-500 mt-1">
            {{ errors.title }}
          </p>
        </div>

        <!-- Description -->
        <div>
          <Label for="description">Description</Label>
          <Textarea
            id="description"
            v-model="form.description"
            placeholder="Additional notes about the sick note"
            rows="3"
          />
        </div>

        <!-- Date Range -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <Label for="validFrom">Valid From *</Label>
            <Input
              id="validFrom"
              v-model="form.validFrom"
              type="date"
              required
            />
            <p v-if="errors.validFrom" class="text-sm text-red-500 mt-1">
              {{ errors.validFrom }}
            </p>
          </div>
          <div>
            <Label for="validTo">Valid To *</Label>
            <Input id="validTo" v-model="form.validTo" type="date" required />
            <p v-if="errors.validTo" class="text-sm text-red-500 mt-1">
              {{ errors.validTo }}
            </p>
          </div>
        </div>

        <!-- Diagnoses -->
        <div>
          <ICD10DiagnosisSearch
            v-model="form.diagnoses"
            label="Diagnoses"
            placeholder="Search and add multiple ICD-10 diagnoses..."
            :multiple="true"
            :max-diagnoses="5"
            required
            :error-message="errors.diagnoses"
          />
        </div>

        <!-- Restrictions -->
        <div>
          <Label for="restrictions">Work Restrictions</Label>
          <Textarea
            id="restrictions"
            v-model="form.restrictions"
            placeholder="Any specific work restrictions or recommendations"
            rows="2"
          />
        </div>

        <!-- File Upload -->
        <div>
          <Label for="pdf">PDF File *</Label>
          <div class="mt-2">
            <Input
              id="pdf"
              type="file"
              accept=".pdf"
              @change="handleFileChange"
              required
            />
            <p class="text-sm text-gray-500 mt-1">Upload PDF file (max 10MB)</p>
          </div>
          <p v-if="errors.pdf" class="text-sm text-red-500 mt-1">
            {{ errors.pdf }}
          </p>
        </div>

        <!-- Error Message -->
        <div
          v-if="errorMessage"
          class="p-3 bg-red-100 border border-red-400 text-red-700 rounded"
        >
          {{ errorMessage }}
        </div>

        <!-- Success Message -->
        <div
          v-if="successMessage"
          class="p-4 bg-green-50 border border-green-200 text-green-800 rounded-lg"
        >
          <div class="flex items-center gap-2">
            <div
              class="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center"
            >
              <Check class="h-3 w-3 text-white" />
            </div>
            <div>
              <p class="font-medium">Sick note issued successfully!</p>
              <p class="text-sm text-green-600">
                Medical certificate for {{ patientName }} has been created and
                stored.
              </p>
            </div>
          </div>
        </div>

        <!-- Buttons -->
        <div class="flex justify-end space-x-2 pt-4">
          <Button
            type="button"
            variant="outline"
            @click="closeModal"
            :disabled="isUploading"
          >
            Cancel
          </Button>
          <Button type="submit" :disabled="isUploading">
            <Loader2 v-if="isUploading" class="mr-2 h-4 w-4 animate-spin" />
            <Upload v-else class="mr-2 h-4 w-4" />
            {{ isUploading ? "Uploading..." : "Upload Sick Note" }}
          </Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed } from "vue";
import { useDoctorAuth } from "@/composables/useDoctorAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ClipboardList, Upload, Loader2, User, Check } from "lucide-vue-next";
import ICD10DiagnosisSearch from "./ICD10DiagnosisSearch.vue";

interface Props {
  open: boolean;
  patientId: string;
  patientName: string;
}

interface Emits {
  (e: "update:open", value: boolean): void;
  (e: "success"): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const { makeAuthenticatedRequest } = useDoctorAuth();

const isOpen = computed({
  get: () => props.open,
  set: (value) => emit("update:open", value),
});

const form = reactive({
  title: "",
  description: "",
  validFrom: "",
  validTo: "",
  diagnoses: [],
  restrictions: "",
});

const selectedFile = ref<File | null>(null);
const isUploading = ref(false);
const errorMessage = ref("");
const successMessage = ref("");
const errors = reactive({
  title: "",
  validFrom: "",
  validTo: "",
  diagnoses: "",
  pdf: "",
});

const resetForm = () => {
  form.title = "";
  form.description = "";
  form.validFrom = "";
  form.validTo = "";
  form.diagnoses = [];
  form.restrictions = "";
  selectedFile.value = null;
  errorMessage.value = "";
  successMessage.value = "";
  Object.keys(errors).forEach((key) => {
    errors[key as keyof typeof errors] = "";
  });
};

const validateForm = () => {
  let isValid = true;

  // Reset errors
  Object.keys(errors).forEach((key) => {
    errors[key as keyof typeof errors] = "";
  });

  // Validate title
  if (!form.title.trim()) {
    errors.title = "Title is required";
    isValid = false;
  }

  // Validate dates
  if (!form.validFrom) {
    errors.validFrom = "Valid from date is required";
    isValid = false;
  }

  if (!form.validTo) {
    errors.validTo = "Valid to date is required";
    isValid = false;
  }

  if (form.validFrom && form.validTo && form.validFrom > form.validTo) {
    errors.validTo = "Valid to date must be after valid from date";
    isValid = false;
  }

  // Validate diagnoses
  if (!form.diagnoses || form.diagnoses.length === 0) {
    errors.diagnoses = "At least one diagnosis is required";
    isValid = false;
  }

  // Validate file
  if (!selectedFile.value) {
    errors.pdf = "PDF file is required";
    isValid = false;
  } else if (selectedFile.value.type !== "application/pdf") {
    errors.pdf = "Only PDF files are allowed";
    isValid = false;
  } else if (selectedFile.value.size > 10 * 1024 * 1024) {
    errors.pdf = "File size must be less than 10MB";
    isValid = false;
  }

  return isValid;
};

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    selectedFile.value = target.files[0];
  }
};

const handleSubmit = async () => {
  if (!validateForm()) {
    return;
  }

  isUploading.value = true;
  errorMessage.value = "";
  successMessage.value = "";

  try {
    const formData = new FormData();
    formData.append("patientId", props.patientId);
    formData.append("title", form.title);
    formData.append("description", form.description);
    formData.append("validFrom", form.validFrom);
    formData.append("validTo", form.validTo);
    formData.append("diagnoses", JSON.stringify(form.diagnoses));
    formData.append("restrictions", form.restrictions);
    formData.append("pdf", selectedFile.value!);

    const response = await makeAuthenticatedRequest("/api/sick-notes/upload", {
      method: "POST",
      body: formData,
    });

    if (response.success) {
      successMessage.value = "Sick note uploaded successfully!";
      // Emit success immediately and close modal after showing success message
      emit("success");
      setTimeout(() => {
        closeModal();
      }, 1500);
    } else {
      errorMessage.value = response.message || "Failed to upload sick note";
    }
  } catch (error: unknown) {
    console.error("Upload error:", error);
    errorMessage.value =
      error instanceof Error ? error.message : "Failed to upload sick note";
  } finally {
    isUploading.value = false;
  }
};

const closeModal = () => {
  if (!isUploading.value) {
    resetForm();
    isOpen.value = false;
  }
};

// Reset form when modal opens
watch(isOpen, (newValue) => {
  if (newValue) {
    resetForm();
  }
});
</script>
