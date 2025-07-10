<template>
  <div
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
  >
    <div
      class="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4"
    >
      <div class="p-6">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-2xl font-bold text-gray-900">Upload Prescription</h2>
          <button
            @click="closeModal"
            class="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <form @submit.prevent="uploadPrescription" class="space-y-6">
          <!-- Title -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Prescription Title *
            </label>
            <input
              v-model="form.title"
              type="text"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Chronic Pain Management, Hypertension Treatment"
            />
          </div>

          <!-- Diagnoses -->
          <div>
            <ICD10DiagnosisSearch
              v-model="form.diagnoses"
              label="Diagnoses"
              placeholder="Search and add multiple ICD-10 diagnoses..."
              :multiple="true"
              :max-diagnoses="5"
            />
          </div>

          <!-- Free Prescription -->
          <div>
            <div class="flex items-center mb-4">
              <input
                v-model="form.isFreePresc"
                type="checkbox"
                id="isFreePresc"
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label for="isFreePresc" class="ml-2 block text-sm text-gray-900">
                Free Text Prescription
              </label>
            </div>

            <div v-if="form.isFreePresc">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Free Text Prescription
              </label>
              <textarea
                v-model="form.freePrescriptionNotes"
                rows="3"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Free prescription details..."
              ></textarea>
            </div>
          </div>

          <!-- Medications -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Medications
            </label>
            <div class="space-y-4">
              <div
                v-for="(medication, index) in form.medications"
                :key="index"
                class="border border-gray-200 rounded-lg p-4 bg-gray-50"
              >
                <div class="flex justify-between items-center mb-4">
                  <h3 class="text-lg font-medium text-gray-900">
                    Medication {{ index + 1 }}
                  </h3>
                  <button
                    v-if="form.medications.length > 1"
                    @click="removeMedication(index)"
                    type="button"
                    class="text-red-500 hover:text-red-700 text-sm"
                  >
                    Remove
                  </button>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">
                      Medication Name *
                    </label>
                    <input
                      v-model="medication.name"
                      type="text"
                      required
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Ibuprofen"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">
                      Dosage *
                    </label>
                    <input
                      v-model="medication.dosage"
                      type="text"
                      required
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., 200mg"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">
                      Frequency *
                    </label>
                    <input
                      v-model="medication.frequency"
                      type="text"
                      required
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Twice daily"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">
                      Duration *
                    </label>
                    <input
                      v-model="medication.duration"
                      type="text"
                      required
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., 7 days"
                    />
                  </div>
                </div>

                <div class="mt-4">
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    Instructions
                  </label>
                  <textarea
                    v-model="medication.instructions"
                    rows="2"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Take with food, avoid alcohol"
                  ></textarea>
                </div>
              </div>
            </div>

            <button
              @click="addMedication"
              type="button"
              class="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Add Medication
            </button>
          </div>

          <!-- General Instructions -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              General Instructions
            </label>
            <textarea
              v-model="form.generalInstructions"
              rows="3"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="General instructions for the patient..."
            ></textarea>
          </div>

          <!-- Valid Until Date -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Valid Until *
            </label>
            <input
              v-model="form.validUntil"
              type="date"
              required
              :min="minDate"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <!-- Pharmacy Information -->
          <div>
            <h3 class="text-lg font-medium text-gray-900 mb-4">
              Pharmacy Information (Optional)
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Pharmacy Name
                </label>
                <input
                  v-model="form.pharmacyName"
                  type="text"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., CVS Pharmacy"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Pharmacy Phone
                </label>
                <input
                  v-model="form.pharmacyPhone"
                  type="tel"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., (555) 123-4567"
                />
              </div>
            </div>
            <div class="mt-4">
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Pharmacy Address
              </label>
              <textarea
                v-model="form.pharmacyAddress"
                rows="2"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Full pharmacy address..."
              ></textarea>
            </div>
          </div>

          <!-- Notes -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Additional Notes
            </label>
            <textarea
              v-model="form.notes"
              rows="3"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Any additional notes..."
            ></textarea>
          </div>

          <!-- File Upload -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Prescription PDF *
            </label>
            <input
              ref="fileInput"
              type="file"
              accept=".pdf"
              required
              @change="handleFileSelect"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p class="text-sm text-gray-500 mt-1">
              Only PDF files are allowed. Maximum size: 10MB.
            </p>
          </div>

          <!-- Action Buttons -->
          <div class="flex justify-end space-x-4 pt-6">
            <button
              type="button"
              @click="closeModal"
              class="px-6 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="isUploading"
              class="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400"
            >
              <span v-if="isUploading">Uploading...</span>
              <span v-else>Upload Prescription</span>
            </button>
          </div>
        </form>

        <!-- Success Message -->
        <div
          v-if="successMessage"
          class="mt-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-md"
        >
          {{ successMessage }}
        </div>

        <!-- Error Message -->
        <div
          v-if="errorMessage"
          class="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md"
        >
          {{ errorMessage }}
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { useDoctorAuth } from "@/composables/useDoctorAuth";
import ICD10DiagnosisSearch from "./ICD10DiagnosisSearch.vue";

export default {
  name: "PrescriptionUploadModal",
  components: {
    ICD10DiagnosisSearch,
  },
  props: {
    patientId: {
      type: String,
      required: true,
    },
  },
  emits: ["close", "success"],
  setup() {
    const { makeAuthenticatedRequest } = useDoctorAuth();
    return { makeAuthenticatedRequest };
  },
  data() {
    return {
      form: {
        title: "",
        diagnoses: [],
        isFreePresc: false,
        freePrescriptionNotes: "",
        medications: [
          {
            name: "",
            dosage: "",
            frequency: "",
            duration: "",
            instructions: "",
          },
        ],
        generalInstructions: "",
        validUntil: "",
        pharmacyName: "",
        pharmacyAddress: "",
        pharmacyPhone: "",
        notes: "",
      },
      selectedFile: null as File | null,
      isUploading: false,
      successMessage: "",
      errorMessage: "",
    };
  },
  computed: {
    minDate() {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split("T")[0];
    },
  },
  mounted() {
    // Set default valid until date (30 days from now)
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 30);
    this.form.validUntil = defaultDate.toISOString().split("T")[0];
  },
  methods: {
    addMedication() {
      this.form.medications.push({
        name: "",
        dosage: "",
        frequency: "",
        duration: "",
        instructions: "",
      });
    },
    removeMedication(index: number) {
      this.form.medications.splice(index, 1);
    },
    handleFileSelect(event: Event) {
      const target = event.target as HTMLInputElement;
      this.selectedFile = target.files?.[0] || null;
      this.errorMessage = "";
    },
    async uploadPrescription() {
      if (!this.selectedFile) {
        this.errorMessage = "Please select a PDF file";
        return;
      }

      this.isUploading = true;
      this.errorMessage = "";
      this.successMessage = "";

      try {
        const formData = new FormData();
        formData.append("pdf", this.selectedFile);
        formData.append("patientId", this.patientId);
        formData.append("title", this.form.title);
        formData.append("diagnoses", JSON.stringify(this.form.diagnoses));
        formData.append("medications", JSON.stringify(this.form.medications));
        formData.append("generalInstructions", this.form.generalInstructions);
        formData.append("validUntil", this.form.validUntil);
        formData.append("isFreePresc", String(this.form.isFreePresc));
        formData.append(
          "freePrescriptionNotes",
          this.form.freePrescriptionNotes
        );
        formData.append("pharmacyName", this.form.pharmacyName);
        formData.append("pharmacyAddress", this.form.pharmacyAddress);
        formData.append("pharmacyPhone", this.form.pharmacyPhone);
        formData.append("notes", this.form.notes);

        const response = await this.makeAuthenticatedRequest(
          "/api/prescriptions/upload",
          {
            method: "POST",
            body: formData,
          }
        );

        if (response.success) {
          this.successMessage = "Prescription uploaded successfully!";
          this.$emit("success", response.prescription);

          // Close modal after showing success message
          setTimeout(() => {
            this.closeModal();
          }, 1500);
        } else {
          this.errorMessage =
            response.message || "Failed to upload prescription";
        }
      } catch (error) {
        console.error("Upload error:", error);
        this.errorMessage = "Network error. Please try again.";
      } finally {
        this.isUploading = false;
      }
    },
    closeModal() {
      this.$emit("close");
    },
  },
};
</script>
