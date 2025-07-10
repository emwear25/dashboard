<template>
  <div class="relative">
    <label v-if="label" class="block text-sm font-medium text-gray-700 mb-2">
      {{ label }}
      <span v-if="required" class="text-red-500">*</span>
    </label>

    <!-- Selected Diagnoses (Multiple Mode) -->
    <div v-if="multiple && selectedDiagnoses.length > 0" class="mb-3">
      <div class="flex flex-wrap gap-2">
        <span
          v-for="(diagnosis, index) in selectedDiagnoses"
          :key="diagnosis.code"
          class="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 border border-blue-200"
        >
          {{ diagnosis.code }} - {{ diagnosis.description }}
          <button
            @click="removeDiagnosis(index)"
            type="button"
            class="ml-2 inline-flex items-center justify-center w-4 h-4 text-blue-600 hover:text-blue-800 hover:bg-blue-200 rounded-full"
          >
            ×
          </button>
        </span>
      </div>
    </div>

    <!-- Search Input -->
    <div class="relative">
      <input
        ref="searchInput"
        v-model="searchQuery"
        :placeholder="getPlaceholder()"
        :disabled="multiple && selectedDiagnoses.length >= maxDiagnoses"
        @input="handleInput"
        @focus="showDropdown = true"
        @blur="handleBlur"
        @keydown.down.prevent="navigateDown"
        @keydown.up.prevent="navigateUp"
        @keydown.enter.prevent="selectCurrent"
        @keydown.escape="hideDropdown"
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
        :class="{
          'border-red-500': hasError,
          'bg-gray-50': multiple && selectedDiagnoses.length >= maxDiagnoses,
        }"
        autocomplete="off"
      />
      <div class="absolute inset-y-0 right-0 flex items-center pr-3">
        <svg
          class="h-4 w-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
    </div>

    <!-- Dropdown -->
    <div
      v-show="showDropdown && filteredDiagnoses.length > 0"
      class="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto"
    >
      <div
        v-for="(diagnosis, index) in filteredDiagnoses"
        :key="diagnosis.code"
        @mousedown.prevent="selectDiagnosis(diagnosis)"
        :class="{
          'bg-blue-100': index === selectedIndex,
          'hover:bg-gray-100': index !== selectedIndex,
          'opacity-50': isAlreadySelected(diagnosis.code),
        }"
        class="px-3 py-2 cursor-pointer border-b border-gray-100 last:border-b-0"
      >
        <div class="font-medium text-sm text-gray-900">
          {{ diagnosis.code }} - {{ diagnosis.description }}
          <span
            v-if="isAlreadySelected(diagnosis.code)"
            class="text-xs text-gray-500 ml-2"
          >
            (Already selected)
          </span>
        </div>
      </div>
      <div
        v-if="filteredDiagnoses.length === 0 && searchQuery.length > 0"
        class="px-3 py-2 text-sm text-gray-500"
      >
        No diagnoses found
      </div>
    </div>

    <!-- Error message -->
    <p v-if="errorMessage" class="text-sm text-red-500 mt-1">
      {{ errorMessage }}
    </p>

    <!-- Single Selected diagnosis display (Single Mode) -->
    <div
      v-if="!multiple && selectedDiagnoses.length > 0 && !isEditing"
      class="mt-2 p-2 bg-gray-50 border border-gray-200 rounded-md"
    >
      <div class="flex items-center justify-between">
        <span class="text-sm font-medium text-gray-900">
          {{ selectedDiagnoses[0].code }} -
          {{ selectedDiagnoses[0].description }}
        </span>
        <button
          @click="clearAll"
          type="button"
          class="text-gray-400 hover:text-gray-600"
        >
          <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clip-rule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>

    <!-- Max diagnoses warning -->
    <p
      v-if="multiple && selectedDiagnoses.length >= maxDiagnoses"
      class="text-sm text-orange-600 mt-1"
    >
      Maximum {{ maxDiagnoses }} diagnoses allowed
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from "vue";
import icd10Data from "@/data/icd-10.json";

interface ICD10Diagnosis {
  code: string;
  description: string;
}

interface Props {
  modelValue?: string | string[];
  label?: string;
  placeholder?: string;
  required?: boolean;
  errorMessage?: string;
  multiple?: boolean;
  maxDiagnoses?: number;
}

interface Emits {
  (e: "update:modelValue", value: string | string[]): void;
}

const props = withDefaults(defineProps<Props>(), {
  label: "Diagnosis",
  placeholder: "Search for ICD-10 diagnosis...",
  required: false,
  multiple: false,
  maxDiagnoses: 10,
});

const emit = defineEmits<Emits>();

// Reactive data
const searchQuery = ref("");
const showDropdown = ref(false);
const selectedIndex = ref(-1);
const selectedDiagnoses = ref<ICD10Diagnosis[]>([]);
const isEditing = ref(false);
const searchInput = ref<HTMLInputElement | null>(null);

// Computed
const hasError = computed(() => !!props.errorMessage);

const filteredDiagnoses = computed(() => {
  if (!searchQuery.value || searchQuery.value.length < 2) {
    return [];
  }

  const query = searchQuery.value.toLowerCase();
  return (icd10Data as ICD10Diagnosis[])
    .filter(
      (diagnosis) =>
        diagnosis.code.toLowerCase().includes(query) ||
        diagnosis.description.toLowerCase().includes(query)
    )
    .slice(0, 50); // Limit to 50 results for performance
});

// Methods
const getPlaceholder = () => {
  if (props.multiple && selectedDiagnoses.value.length >= props.maxDiagnoses) {
    return "Maximum diagnoses reached";
  }
  return props.placeholder;
};

const isAlreadySelected = (code: string) => {
  return selectedDiagnoses.value.some((d) => d.code === code);
};

const handleInput = () => {
  isEditing.value = true;
  selectedIndex.value = -1;
  showDropdown.value = true;
};

const handleBlur = () => {
  // Delay hiding dropdown to allow for clicks
  setTimeout(() => {
    showDropdown.value = false;
    searchQuery.value = "";
  }, 200);
};

const selectDiagnosis = (diagnosis: ICD10Diagnosis) => {
  // Check if already selected
  if (isAlreadySelected(diagnosis.code)) {
    return;
  }

  // Check max limit for multiple mode
  if (props.multiple && selectedDiagnoses.value.length >= props.maxDiagnoses) {
    return;
  }

  if (props.multiple) {
    selectedDiagnoses.value.push(diagnosis);
    emitUpdate();
  } else {
    selectedDiagnoses.value = [diagnosis];
    emitUpdate();
    isEditing.value = false;
  }

  searchQuery.value = "";
  showDropdown.value = false;
  selectedIndex.value = -1;
};

const removeDiagnosis = (index: number) => {
  selectedDiagnoses.value.splice(index, 1);
  emitUpdate();
  nextTick(() => {
    searchInput.value?.focus();
  });
};

const clearAll = () => {
  selectedDiagnoses.value = [];
  searchQuery.value = "";
  isEditing.value = true;
  emitUpdate();
  nextTick(() => {
    searchInput.value?.focus();
  });
};

const navigateDown = () => {
  if (selectedIndex.value < filteredDiagnoses.value.length - 1) {
    selectedIndex.value++;
  }
};

const navigateUp = () => {
  if (selectedIndex.value > 0) {
    selectedIndex.value--;
  }
};

const selectCurrent = () => {
  if (
    selectedIndex.value >= 0 &&
    filteredDiagnoses.value[selectedIndex.value]
  ) {
    selectDiagnosis(filteredDiagnoses.value[selectedIndex.value]);
  }
};

const hideDropdown = () => {
  showDropdown.value = false;
  selectedIndex.value = -1;
  searchQuery.value = "";
};

const emitUpdate = () => {
  if (props.multiple) {
    emit(
      "update:modelValue",
      selectedDiagnoses.value.map((d) => d.code)
    );
  } else {
    emit(
      "update:modelValue",
      selectedDiagnoses.value.length > 0 ? selectedDiagnoses.value[0].code : ""
    );
  }
};

// Initialize with existing value
const initializeValue = () => {
  selectedDiagnoses.value = [];

  if (props.modelValue) {
    const values = Array.isArray(props.modelValue)
      ? props.modelValue
      : [props.modelValue];

    values.forEach((value) => {
      if (value) {
        const diagnosis = (icd10Data as ICD10Diagnosis[]).find(
          (d) => d.code === value
        );
        if (diagnosis) {
          selectedDiagnoses.value.push(diagnosis);
        }
      }
    });
  }

  isEditing.value = selectedDiagnoses.value.length === 0;
};

// Watch for external changes
watch(
  () => props.modelValue,
  () => {
    initializeValue();
  }
);

onMounted(() => {
  initializeValue();
});
</script>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
}
</style>
