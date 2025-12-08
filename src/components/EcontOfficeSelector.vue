<template>
  <div class="econt-office-selector">
    <!-- City Selection (hidden when office is selected) -->
    <div v-if="!selectedOffice" class="space-y-2 mb-4">
      <Label>Изберете град</Label>
      <Select v-model="selectedCityName" @update:model-value="handleCityChange">
        <SelectTrigger>
          <SelectValue placeholder="Изберете град..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="city in cities" :key="city" :value="city">
            {{ city }}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>

    <!-- Office Search (hidden when office is selected) -->
    <div v-if="selectedCityName && !selectedOffice" class="space-y-2 mb-4">
      <Label>Търсене на офис/еконтомат</Label>
      <div class="relative">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input v-model="officeSearch" placeholder="Търсене по име на офис..." class="pl-9" />
      </div>
    </div>

    <!-- Offices List (hidden when office is selected) -->
    <div
      v-if="selectedCityName && filteredOffices.length > 0 && !selectedOffice"
      class="space-y-2 max-h-[400px] overflow-y-auto border rounded-lg p-2"
    >
      <div
        v-for="office in filteredOffices"
        :key="office.id"
        class="p-3 border rounded-lg cursor-pointer hover:bg-muted transition-colors select-none"
        @click="selectOffice(office)"
        @mousedown.prevent
      >
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="font-medium">{{ office.name }}</div>
            <div class="text-sm text-muted-foreground mt-1">
              {{ office.address.city.name }},
              {{ office.address.fullAddress || office.address.street }}
            </div>
            <div v-if="office.isAPS || office.isMPS" class="text-xs text-primary mt-1">
              📦 Еконтомат
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="selectedCityName && filteredOffices.length === 0 && !selectedOffice"
      class="text-center py-8 text-sm text-muted-foreground"
    >
      Няма намерени офиси
    </div>

    <!-- Selected Office Display -->
    <div v-if="selectedOffice" class="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
      <div class="flex items-start justify-between">
        <div class="flex-1">
          <div class="font-semibold text-green-900">
            ✓ Избран {{ props.officeType === "aps" ? "еконтомат" : "офис" }}
          </div>
          <div class="text-sm font-medium mt-1">{{ selectedOffice.name }}</div>
          <div class="text-xs text-muted-foreground mt-1">
            {{ selectedOffice.address.city.name }}, {{ selectedOffice.address.fullAddress }}
          </div>
        </div>
        <Button @click="clearSelection" variant="ghost" size="sm"> Промени </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-vue-next";
import { apiGet } from "@/utils/api";

interface Office {
  id: number;
  code: string;
  name: string;
  isAPS: boolean;
  isMPS: boolean;
  address: {
    city: {
      id: number;
      name: string;
      postCode: string;
    };
    location: {
      latitude: number;
      longitude: number;
    };
    fullAddress?: string;
    street?: string;
  };
}

const props = defineProps<{
  officeType?: "office" | "aps" | "all";
}>();

const emit = defineEmits<{
  (e: "office-selected", office: Office | null): void;
}>();

const offices = ref<Office[]>([]);
const selectedCityName = ref("");
const officeSearch = ref("");
const selectedOffice = ref<Office | null>(null);
const officeTypeFilter = ref<"office" | "aps" | "all">("all");

const cities = computed(() => {
  const citySet = new Set<string>();

  // Filter by Bulgaria first
  const bulgariaOffices = offices.value.filter((o) => {
    const countryCode = o.address?.city?.country?.code3 || o.address?.countryCode;
    return countryCode === "BGR";
  });

  bulgariaOffices.forEach((office) => {
    if (office.address?.city?.name) {
      citySet.add(office.address.city.name);
    }
  });
  return Array.from(citySet).sort();
});

const filteredOffices = computed(() => {
  if (!selectedCityName.value) {
    return [];
  }

  let filtered = offices.value;

  // Filter by country - only show Bulgaria offices
  filtered = filtered.filter((o) => {
    const countryCode = o.address?.city?.country?.code3 || o.address?.countryCode;
    return countryCode === "BGR"; // Bulgaria only
  });

  // Filter by city
  filtered = filtered.filter((office) => {
    const cityName = office.address?.city?.name;
    return cityName === selectedCityName.value;
  });

  // Filter by office type
  if (officeTypeFilter.value === "office") {
    filtered = filtered.filter((o) => !o.isAPS && !o.isMPS);
  } else if (officeTypeFilter.value === "aps") {
    filtered = filtered.filter((o) => o.isAPS || o.isMPS);
  }

  // Filter by search query
  if (officeSearch.value.trim()) {
    const query = officeSearch.value.toLowerCase();
    filtered = filtered.filter(
      (office) =>
        office.name.toLowerCase().includes(query) ||
        office.address?.fullAddress?.toLowerCase().includes(query) ||
        office.address?.street?.toLowerCase().includes(query) ||
        office.address?.city?.name?.toLowerCase().includes(query)
    );
  }

  return filtered.sort((a, b) => a.name.localeCompare(b.name));
});

const fetchOffices = async () => {
  try {
    const response = await apiGet("econt/offices");
    if (response.success && response.data) {
      offices.value = response.data.map((office: any) => ({
        ...office,
        address: {
          ...office.address,
          fullAddress:
            `${office.address.city.name}, ${office.address.quarter || ""} ${office.address.street || ""}`.trim(),
        },
      }));
    }
  } catch (error) {
    console.error("Failed to fetch Econt offices:", error);
  }
};

// Watch for prop changes
watch(
  () => props.officeType,
  (newType) => {
    officeTypeFilter.value = newType || "all";
  },
  { immediate: true }
);

const handleCityChange = () => {
  officeSearch.value = "";
  selectedOffice.value = null;
  emit("office-selected", null);
};

const selectOffice = (office: Office) => {
  selectedOffice.value = office;
  emit("office-selected", office);
};

const clearSelection = () => {
  selectedOffice.value = null;
  emit("office-selected", null);
};

onMounted(() => {
  fetchOffices();
  officeTypeFilter.value = props.officeType || "all";
});

watch(
  () => props.officeType,
  (newType) => {
    officeTypeFilter.value = newType || "all";
  },
  { immediate: true }
);
</script>

<style scoped>
.econt-office-selector {
  width: 100%;
}
</style>
