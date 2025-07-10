<template>
  <div
    class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
  >
    <div
      class="relative top-20 mx-auto p-5 border w-2/3 max-w-5xl shadow-lg rounded-md bg-white"
    >
      <div class="mt-3">
        <!-- Header -->
        <div class="flex items-center justify-between border-b pb-3">
          <h3 class="text-lg font-semibold text-gray-900">Upload Document</h3>
          <button @click="closeModal" class="text-gray-400 hover:text-gray-600">
            <svg
              class="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              ></path>
            </svg>
          </button>
        </div>

        <!-- Form -->
        <form @submit.prevent="uploadDocument" class="mt-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Left Column -->
            <div class="space-y-4">
              <!-- Category Selection -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2"
                  >Document Category *</label
                >
                <select
                  v-model="form.category"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Category</option>
                  <option value="medical-reports">Medical Reports</option>
                  <option value="lab-results">Lab Results</option>
                  <option value="radiology-reports">Radiology Reports</option>
                  <option value="insurance-documents">
                    Insurance Documents
                  </option>
                </select>
              </div>

              <!-- Document Title -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2"
                  >Document Title *</label
                >
                <input
                  type="text"
                  v-model="form.title"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter document title"
                />
              </div>

              <!-- Document Description -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2"
                  >Description</label
                >
                <textarea
                  v-model="form.description"
                  rows="3"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Brief description of the document"
                ></textarea>
              </div>

              <!-- File Upload -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2"
                  >Select File *</label
                >
                <input
                  type="file"
                  ref="fileInput"
                  @change="handleFileChange"
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.xls,.xlsx,.csv,.ppt,.pptx,.xml,.json"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p class="text-xs text-gray-500 mt-1">
                  Supported formats: PDF, DOC, DOCX, images, spreadsheets, etc.
                  Max size: 25MB
                </p>
              </div>

              <!-- Document Date -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2"
                  >Document Date</label
                >
                <input
                  type="date"
                  v-model="form.documentDate"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <!-- Right Column - Category-specific metadata -->
            <div class="space-y-4">
              <h4 class="text-md font-medium text-gray-700 border-b pb-2">
                Additional Information
              </h4>

              <!-- Medical Reports specific fields -->
              <div v-if="form.category === 'medical-reports'" class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2"
                    >Report Type</label
                  >
                  <select
                    v-model="form.metadata.reportType"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Type</option>
                    <option value="consultation">Consultation Report</option>
                    <option value="surgery">Surgery Report</option>
                    <option value="discharge">Discharge Summary</option>
                    <option value="follow-up">Follow-up Report</option>
                    <option value="specialist">Specialist Report</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <ICD10DiagnosisSearch
                    v-model="form.metadata.diagnoses"
                    label="Diagnoses"
                    placeholder="Search and add multiple ICD-10 diagnoses..."
                    :multiple="true"
                    :max-diagnoses="5"
                  />
                </div>
              </div>

              <!-- Lab Results specific fields -->
              <div v-if="form.category === 'lab-results'" class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2"
                    >Test Type</label
                  >
                  <select
                    v-model="form.metadata.testType"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Test Type</option>
                    <option value="blood-work">Blood Work</option>
                    <option value="urine-analysis">Urine Analysis</option>
                    <option value="hormone-levels">Hormone Levels</option>
                    <option value="lipid-panel">Lipid Panel</option>
                    <option value="liver-function">Liver Function</option>
                    <option value="kidney-function">Kidney Function</option>
                    <option value="thyroid-function">Thyroid Function</option>
                    <option value="cardiac-markers">Cardiac Markers</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <!-- Radiology Reports specific fields -->
              <div
                v-if="form.category === 'radiology-reports'"
                class="space-y-4"
              >
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2"
                    >Radiology Center</label
                  >
                  <input
                    type="text"
                    v-model="form.metadata.radiologyCenter"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Name of the radiology center"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2"
                    >Exam Type</label
                  >
                  <select
                    v-model="form.metadata.examType"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Exam Type</option>
                    <option value="x-ray">X-Ray</option>
                    <option value="ct-scan">CT Scan</option>
                    <option value="mri">MRI</option>
                    <option value="ultrasound">Ultrasound</option>
                    <option value="mammography">Mammography</option>
                    <option value="nuclear-medicine">Nuclear Medicine</option>
                    <option value="pet-scan">PET Scan</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <!-- Insurance Documents specific fields -->
              <div
                v-if="form.category === 'insurance-documents'"
                class="space-y-4"
              >
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2"
                    >Insurance Provider</label
                  >
                  <input
                    type="text"
                    v-model="form.metadata.insuranceProvider"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Name of insurance provider"
                  />
                </div>
              </div>

              <!-- Common metadata fields -->
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">{{
                    form.category === "insurance-documents"
                      ? "Insurance Number"
                      : "Reference Number"
                  }}</label>
                  <input
                    type="text"
                    v-model="form.metadata.referenceNumber"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    :placeholder="
                      form.category === 'insurance-documents'
                        ? 'Insurance ID number'
                        : 'Reference or ID number'
                    "
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2"
                    >Priority</label
                  >
                  <select
                    v-model="form.metadata.priority"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2"
                    >Additional Notes</label
                  >
                  <textarea
                    v-model="form.metadata.notes"
                    rows="2"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Any additional notes or observations"
                  ></textarea>
                </div>
              </div>
            </div>
          </div>

          <!-- Submit buttons -->
          <div class="flex justify-end space-x-3 mt-6 pt-4 border-t">
            <button
              type="button"
              @click="closeModal"
              class="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="isUploading"
              class="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <span v-if="isUploading">Uploading...</span>
              <span v-else>Upload Document</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import ICD10DiagnosisSearch from "./ICD10DiagnosisSearch.vue";

export default {
  name: "DocumentUploadModal",
  components: {
    ICD10DiagnosisSearch,
  },
  props: {
    patientId: {
      type: String,
      required: true,
    },
  },
  emits: ["close", "document-uploaded"],
  data() {
    return {
      isUploading: false,
      selectedFile: null as File | null,
      form: {
        category: "",
        title: "",
        description: "",
        documentDate: new Date().toISOString().split("T")[0],
        metadata: {
          // Common fields
          referenceNumber: "",
          priority: "normal",
          notes: "",
          // Medical reports
          reportType: "",
          diagnoses: [],
          // Lab results
          testType: "",
          // Radiology reports
          radiologyCenter: "",
          examType: "",
          // Insurance documents
          insuranceProvider: "",
        },
      },
    };
  },
  methods: {
    closeModal() {
      this.$emit("close");
    },

    handleFileChange(event: Event) {
      const target = event.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        // Validate file size (25MB)
        if (file.size > 25 * 1024 * 1024) {
          alert("File size must be less than 25MB");
          target.value = "";
          return;
        }
        this.selectedFile = file;
      }
    },

    async uploadDocument() {
      if (!this.selectedFile) {
        alert("Please select a file to upload");
        return;
      }

      this.isUploading = true;

      try {
        const formData = new FormData();
        formData.append("document", this.selectedFile);
        formData.append("patientId", this.patientId);
        formData.append("category", this.form.category);
        formData.append("title", this.form.title);
        formData.append("description", this.form.description);
        formData.append(
          "metadata",
          JSON.stringify({
            ...this.form.metadata,
            documentDate: this.form.documentDate,
          })
        );

        const response = await fetch(
          `${import.meta.env.VITE_API_URL || "http://localhost:3030"}/api/documents/upload`,
          {
            method: "POST",
            body: formData,
            headers: {
              Authorization: `Bearer ${localStorage.getItem("doctor_access_token")}`,
            },
          }
        );

        const result = await response.json();

        if (result.success) {
          this.$emit("document-uploaded", result.data.document);
          this.closeModal();
          this.resetForm();
        } else {
          console.error("Upload failed:", result);
          alert(result.message || "Upload failed");
        }
      } catch (error) {
        console.error("Upload error:", error);
        alert("An error occurred during upload");
      } finally {
        this.isUploading = false;
      }
    },

    resetForm() {
      this.form = {
        category: "",
        title: "",
        description: "",
        documentDate: new Date().toISOString().split("T")[0],
        metadata: {
          referenceNumber: "",
          priority: "normal",
          notes: "",
          reportType: "",
          diagnoses: [],
          testType: "",
          radiologyCenter: "",
          examType: "",
          insuranceProvider: "",
        },
      };
      this.selectedFile = null;
      if (this.$refs.fileInput) {
        (this.$refs.fileInput as HTMLInputElement).value = "";
      }
    },
  },
};
</script>

<style scoped>
/* Custom scrollbar for webkit browsers */
.overflow-y-auto::-webkit-scrollbar {
  width: 8px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 4px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #555;
}
</style>
