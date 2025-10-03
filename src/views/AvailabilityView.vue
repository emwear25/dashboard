<template>
  <div class="availability-view">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">My Availability</h1>
        <p class="text-muted-foreground">
          Set your available dates and time slots for appointments
        </p>
      </div>
      <Button @click="openCreateModal" class="flex items-center gap-2">
        <Plus class="h-4 w-4" />
        Add Availability
      </Button>
    </div>

    <!-- Quick Actions -->
    <Card class="mb-6">
      <CardContent class="pt-6">
        <div class="flex gap-4 items-center flex-wrap">
          <div>
            <Label for="date-filter">Filter by Date</Label>
            <Input
              id="date-filter"
              type="date"
              v-model="filters.date"
              class="w-40"
            />
          </div>

          <div class="flex gap-2 pt-6">
            <Button
              variant="outline"
              @click="refreshData"
              :disabled="loading"
              class="flex items-center gap-2"
            >
              <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
              Refresh
            </Button>
            <Button variant="outline" @click="clearFilters"
              >Clear Filter</Button
            >
            <Button @click="addWeeklySchedule" variant="outline">
              <Calendar class="h-4 w-4 mr-2" />
              Add Weekly Schedule
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Tabs -->
    <div class="mb-6">
      <div class="border-b">
        <nav class="flex space-x-8" aria-label="Tabs">
          <button
            @click="activeTab = 'current'"
            :class="[
              activeTab === 'current'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
              'whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors',
            ]"
          >
            Current & Future
            <span
              v-if="currentAvailabilities.length > 0"
              :class="[
                activeTab === 'current'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground',
                'ml-2 rounded-full px-2 py-0.5 text-xs',
              ]"
            >
              {{ currentAvailabilities.length }}
            </span>
          </button>
          <button
            @click="activeTab = 'past'"
            :class="[
              activeTab === 'past'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
              'whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors',
            ]"
          >
            History
            <span
              v-if="pastAvailabilities.length > 0"
              :class="[
                activeTab === 'past'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground',
                'ml-2 rounded-full px-2 py-0.5 text-xs',
              ]"
            >
              {{ pastAvailabilities.length }}
            </span>
          </button>
        </nav>
      </div>
    </div>

    <!-- Availability List -->
    <Card>
      <CardHeader>
        <CardTitle>
          {{ activeTab === "current" ? "Current & Future" : "History" }}
        </CardTitle>
        <CardDescription>
          {{ filteredAvailabilities.length }} availability slot{{
            filteredAvailabilities.length !== 1 ? "s" : ""
          }}
          found
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div class="relative">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Day</TableHead>
                <TableHead>Available Slots</TableHead>
                <TableHead>Status</TableHead>
                <TableHead class="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="slot in filteredAvailabilities" :key="slot._id">
                <TableCell>
                  <div class="font-medium">{{ formatDate(slot.date) }}</div>
                </TableCell>
                <TableCell>
                  <div class="text-sm text-muted-foreground">
                    {{ getDayOfWeek(slot.date) }}
                  </div>
                </TableCell>
                <TableCell>
                  <div class="flex flex-wrap gap-1">
                    <Badge
                      v-for="timeSlot in slot.slots"
                      :key="timeSlot"
                      variant="outline"
                      class="text-xs"
                    >
                      {{ timeSlot }}
                    </Badge>
                  </div>
                  <div class="text-sm text-muted-foreground mt-1">
                    {{ slot.slots.length }} slot{{
                      slot.slots.length !== 1 ? "s" : ""
                    }}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge :variant="slot.isActive ? 'default' : 'secondary'">
                    {{ slot.isActive ? "Active" : "Inactive" }}
                  </Badge>
                </TableCell>
                <TableCell class="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" class="h-8 w-8 p-0">
                        <MoreHorizontal class="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem @click="editAvailability(slot)">
                        <Edit class="mr-2 h-4 w-4" />
                        Edit Slots
                      </DropdownMenuItem>
                      <DropdownMenuItem @click="addSlotToAvailability(slot)">
                        <Plus class="mr-2 h-4 w-4" />
                        Add Slot
                      </DropdownMenuItem>
                      <DropdownMenuItem @click="toggleAvailabilityStatus(slot)">
                        <ToggleLeft class="mr-2 h-4 w-4" />
                        {{ slot.isActive ? "Deactivate" : "Activate" }}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        @click="deleteAvailability(slot)"
                        class="text-destructive focus:text-destructive"
                      >
                        <Trash2 class="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>

          <!-- Loading overlay -->
          <div
            v-if="loading"
            class="absolute inset-0 bg-background/50 flex items-center justify-center"
          >
            <div class="text-center">
              <RefreshCw class="h-8 w-8 animate-spin mx-auto mb-2" />
              <p class="text-sm text-muted-foreground">
                Loading availability...
              </p>
            </div>
          </div>

          <!-- Empty state -->
          <div
            v-if="!loading && filteredAvailabilities.length === 0"
            class="text-center py-12"
          >
            <Calendar class="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 class="text-lg font-medium mb-2">
              {{
                activeTab === "current"
                  ? "No current or upcoming availability"
                  : "No past availability"
              }}
            </h3>
            <p class="text-muted-foreground mb-4">
              {{
                activeTab === "current"
                  ? "Start by adding your available dates and times for appointments."
                  : "Your past availability slots will appear here."
              }}
            </p>
            <Button v-if="activeTab === 'current'" @click="openCreateModal">
              <Plus class="h-4 w-4 mr-2" />
              Add your first availability
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Create/Edit Modal -->
    <Dialog v-model:open="showModal">
      <DialogContent class="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle
            >{{
              editingAvailability ? "Edit" : "Add"
            }}
            Availability</DialogTitle
          >
          <DialogDescription>
            {{
              editingAvailability
                ? "Update your availability slots"
                : "Set your available date and time slots"
            }}
          </DialogDescription>
        </DialogHeader>

        <form @submit.prevent="saveAvailability" class="space-y-4">
          <div class="space-y-2">
            <Label for="date">Date *</Label>
            <Input
              id="date"
              type="date"
              v-model="form.date"
              :min="today"
              :disabled="!!editingAvailability"
            />
          </div>

          <div class="space-y-2">
            <Label>Time Slots *</Label>
            <div class="flex flex-wrap gap-2 mb-2">
              <Badge
                v-for="(slot, index) in form.slots"
                :key="index"
                variant="outline"
                class="cursor-pointer"
                @click="removeSlot(index)"
              >
                {{ slot }}
                <X class="ml-1 h-3 w-3" />
              </Badge>
            </div>
            <div class="flex gap-2 mb-2">
              <Input
                v-model="newSlot"
                type="time"
                placeholder="Add time slot"
              />
              <Button type="button" @click="addSlot" variant="outline"
                >Add</Button
              >
            </div>
            <div class="grid grid-cols-4 gap-2 mt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                v-for="preset in presetSlots"
                :key="preset"
                @click="addPresetSlot(preset)"
              >
                {{ preset }}
              </Button>
            </div>
          </div>

          <div v-if="editingAvailability" class="flex items-center space-x-2">
            <Switch id="isActive" v-model:checked="form.isActive" />
            <Label for="isActive">Active</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" @click="closeModal"
              >Cancel</Button
            >
            <Button type="submit" :disabled="formLoading">
              <Loader2 v-if="formLoading" class="mr-2 h-4 w-4 animate-spin" />
              {{ editingAvailability ? "Update" : "Create" }} Availability
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Add Single Slot Modal -->
    <Dialog v-model:open="showAddSlotModal">
      <DialogContent class="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Add Time Slot</DialogTitle>
          <DialogDescription>
            Add a single time slot to
            {{
              selectedAvailability ? formatDate(selectedAvailability.date) : ""
            }}
          </DialogDescription>
        </DialogHeader>

        <form @submit.prevent="addSingleSlot" class="space-y-4">
          <div class="space-y-2">
            <Label for="single-slot">Time Slot *</Label>
            <Input id="single-slot" v-model="singleSlot" type="time" />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" @click="closeAddSlotModal"
              >Cancel</Button
            >
            <Button type="submit" :disabled="formLoading">
              <Loader2 v-if="formLoading" class="mr-2 h-4 w-4 animate-spin" />
              Add Slot
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Weekly Schedule Modal -->
    <Dialog v-model:open="showWeeklyModal">
      <DialogContent class="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add Weekly Schedule</DialogTitle>
          <DialogDescription>
            Quickly add availability for multiple days with the same time slots
          </DialogDescription>
        </DialogHeader>

        <form @submit.prevent="saveWeeklySchedule" class="space-y-4">
          <div class="space-y-2">
            <Label>Start Date *</Label>
            <Input type="date" v-model="weeklyForm.startDate" :min="today" />
          </div>

          <div class="space-y-2">
            <Label>Number of weeks *</Label>
            <Input
              type="number"
              v-model.number="weeklyForm.weeks"
              min="1"
              max="8"
            />
          </div>

          <div class="space-y-2">
            <Label>Days of the week</Label>
            <div class="grid grid-cols-7 gap-2">
              <div
                v-for="(day, index) in daysOfWeek"
                :key="day"
                class="flex items-center space-x-2"
              >
                <input
                  :id="day"
                  type="checkbox"
                  :value="index"
                  v-model="weeklyForm.selectedDays"
                  class="rounded border-gray-300"
                />
                <Label :for="day" class="text-sm">{{ day }}</Label>
              </div>
            </div>
          </div>

          <div class="space-y-2">
            <Label>Time Slots *</Label>
            <div class="flex flex-wrap gap-2 mb-2">
              <Badge
                v-for="(slot, index) in weeklyForm.slots"
                :key="index"
                variant="outline"
                class="cursor-pointer"
                @click="removeWeeklySlot(index)"
              >
                {{ slot }}
                <X class="ml-1 h-3 w-3" />
              </Badge>
            </div>
            <div class="flex gap-2 mb-2">
              <Input
                v-model="newWeeklySlot"
                type="time"
                placeholder="Add time slot"
              />
              <Button type="button" @click="addWeeklySlot" variant="outline"
                >Add</Button
              >
            </div>
            <div class="grid grid-cols-4 gap-2 mt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                v-for="preset in presetSlots"
                :key="preset"
                @click="addWeeklyPresetSlot(preset)"
              >
                {{ preset }}
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" @click="closeWeeklyModal"
              >Cancel</Button
            >
            <Button type="submit" :disabled="formLoading">
              <Loader2 v-if="formLoading" class="mr-2 h-4 w-4 animate-spin" />
              Create Weekly Schedule
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch, computed } from "vue";
import { toast } from "vue-sonner";
import { useApi } from "@/composables/useApi";

// UI Components
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Icons
import {
  Plus,
  RefreshCw,
  Calendar,
  Edit,
  Trash2,
  MoreHorizontal,
  X,
  Loader2,
  ToggleLeft,
} from "lucide-vue-next";

interface Availability {
  _id: string;
  doctorId: {
    _id: string;
    name: string;
    email: string;
    specialties: string[];
  };
  date: string;
  slots: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

const api = useApi();
const availability = ref<Availability[]>([]);
const loading = ref(false);
const formLoading = ref(false);

// Get today's date in YYYY-MM-DD format
const today = computed(() => new Date().toISOString().split("T")[0]);

// Tab state
const activeTab = ref<"current" | "past">("current");

// Days of the week
const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Filters
const filters = reactive({
  date: "",
});

// Filter availabilities by date
const currentAvailabilities = computed(() => {
  const todayDate = new Date(today.value);
  todayDate.setHours(0, 0, 0, 0);

  return availability.value
    .filter((slot) => {
      const slotDate = new Date(slot.date);
      slotDate.setHours(0, 0, 0, 0);
      return slotDate >= todayDate;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
});

const pastAvailabilities = computed(() => {
  const todayDate = new Date(today.value);
  todayDate.setHours(0, 0, 0, 0);

  return availability.value
    .filter((slot) => {
      const slotDate = new Date(slot.date);
      slotDate.setHours(0, 0, 0, 0);
      return slotDate < todayDate;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
});

const filteredAvailabilities = computed(() => {
  return activeTab.value === "current"
    ? currentAvailabilities.value
    : pastAvailabilities.value;
});

// Modal state
const showModal = ref(false);
const showAddSlotModal = ref(false);
const showWeeklyModal = ref(false);
const editingAvailability = ref<Availability | null>(null);
const selectedAvailability = ref<Availability | null>(null);
const newSlot = ref("");
const singleSlot = ref("");
const newWeeklySlot = ref("");

// Preset time slots
const presetSlots = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
];

// Form data
const form = reactive({
  date: "",
  slots: [] as string[],
  isActive: true,
});

// Weekly form data
const weeklyForm = reactive({
  startDate: "",
  weeks: 1,
  selectedDays: [] as number[],
  slots: [] as string[],
});

// Fetch availability (for current doctor)
const fetchAvailability = async () => {
  try {
    loading.value = true;
    const params: Record<string, string> = {};

    if (filters.date) params.date = filters.date;

    const response = await api.availability.getDoctorAvailability(params);
    availability.value = (response as any).data || [];
  } catch (error) {
    console.error("Error fetching availability:", error);
    toast.error("Failed to fetch availability");
  } finally {
    loading.value = false;
  }
};

// Format date
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// Get day of week
const getDayOfWeek = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", { weekday: "long" });
};

// Refresh data
const refreshData = () => {
  fetchAvailability();
};

// Clear filters
const clearFilters = () => {
  filters.date = "";
};

// Watch filters
watch(
  () => filters.date,
  () => {
    fetchAvailability();
  }
);

// Reset form
const resetForm = () => {
  Object.assign(form, {
    date: "",
    slots: [],
    isActive: true,
  });
  newSlot.value = "";
};

// Reset weekly form
const resetWeeklyForm = () => {
  Object.assign(weeklyForm, {
    startDate: "",
    weeks: 1,
    selectedDays: [1, 2, 3, 4, 5], // Monday to Friday by default
    slots: [],
  });
  newWeeklySlot.value = "";
};

// Open create modal
const openCreateModal = () => {
  editingAvailability.value = null;
  resetForm();
  showModal.value = true;
};

// Edit availability
const editAvailability = (slot: Availability) => {
  editingAvailability.value = slot;
  Object.assign(form, {
    date: slot.date.split("T")[0], // Convert to YYYY-MM-DD format
    slots: [...slot.slots],
    isActive: slot.isActive,
  });
  showModal.value = true;
};

// Close modal
const closeModal = () => {
  showModal.value = false;
  editingAvailability.value = null;
  resetForm();
};

// Add slot
const addSlot = () => {
  const slot = newSlot.value.trim();
  if (slot && !form.slots.includes(slot)) {
    form.slots.push(slot);
    form.slots.sort();
    newSlot.value = "";
  }
};

// Add preset slot
const addPresetSlot = (slot: string) => {
  if (!form.slots.includes(slot)) {
    form.slots.push(slot);
    form.slots.sort();
  }
};

// Remove slot
const removeSlot = (index: number) => {
  form.slots.splice(index, 1);
};

// Weekly schedule functions
const addWeeklySchedule = () => {
  resetWeeklyForm();
  showWeeklyModal.value = true;
};

const closeWeeklyModal = () => {
  showWeeklyModal.value = false;
  resetWeeklyForm();
};

const addWeeklySlot = () => {
  const slot = newWeeklySlot.value.trim();
  if (slot && !weeklyForm.slots.includes(slot)) {
    weeklyForm.slots.push(slot);
    weeklyForm.slots.sort();
    newWeeklySlot.value = "";
  }
};

const addWeeklyPresetSlot = (slot: string) => {
  if (!weeklyForm.slots.includes(slot)) {
    weeklyForm.slots.push(slot);
    weeklyForm.slots.sort();
  }
};

const removeWeeklySlot = (index: number) => {
  weeklyForm.slots.splice(index, 1);
};

// Save availability
const saveAvailability = async () => {
  if (!form.date) {
    toast.error("Please select a date");
    return;
  }

  if (form.slots.length === 0) {
    toast.error("Please add at least one time slot");
    return;
  }

  try {
    formLoading.value = true;

    let response;
    if (editingAvailability.value) {
      response = await api.availability.update(editingAvailability.value._id, {
        slots: form.slots,
        isActive: form.isActive,
      });

      if (response && (response.success || response.data)) {
        toast.success("Availability updated successfully");
        closeModal();
        fetchAvailability();
      } else {
        throw new Error(response.message || "Failed to update availability");
      }
    } else {
      response = await api.availability.create({
        date: form.date,
        slots: form.slots,
      });

      if (response && (response.success || response.data)) {
        toast.success("Availability created successfully");
        closeModal();
        fetchAvailability();
      } else {
        throw new Error(response.message || "Failed to create availability");
      }
    }
  } catch (error: any) {
    console.error("Error saving availability:", error);

    // Extract the actual error message from the API response
    let errorMessage = "Failed to save availability";

    if (error?.message) {
      errorMessage = error.message;
    } else if (typeof error === "object" && error !== null) {
      // Try to extract message from nested error structure
      errorMessage =
        error.error?.message || error.data?.message || errorMessage;
    }

    toast.error(errorMessage);
  } finally {
    formLoading.value = false;
  }
};

// Save weekly schedule
const saveWeeklySchedule = async () => {
  if (!weeklyForm.startDate) {
    toast.error("Please select a start date");
    return;
  }

  if (!weeklyForm.weeks || weeklyForm.weeks < 1 || weeklyForm.weeks > 8) {
    toast.error("Please enter a valid number of weeks (1-8)");
    return;
  }

  if (weeklyForm.selectedDays.length === 0) {
    toast.error("Please select at least one day");
    return;
  }

  if (weeklyForm.slots.length === 0) {
    toast.error("Please add at least one time slot");
    return;
  }

  try {
    formLoading.value = true;

    const startDate = new Date(weeklyForm.startDate);
    const promises = [];

    for (let week = 0; week < weeklyForm.weeks; week++) {
      for (const dayIndex of weeklyForm.selectedDays) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + week * 7 + dayIndex);

        promises.push(
          api.availability.create({
            date: date.toISOString().split("T")[0],
            slots: weeklyForm.slots,
          })
        );
      }
    }

    const results = await Promise.allSettled(promises);
    const successCount = results.filter((r) => r.status === "fulfilled").length;
    const failCount = results.filter((r) => r.status === "rejected").length;

    if (successCount > 0) {
      if (failCount > 0) {
        toast.warning(
          `Weekly schedule partially created: ${successCount} slot(s) added, ${failCount} failed (may already exist)`
        );
      } else {
        toast.success(
          `Weekly schedule created successfully: ${successCount} availability slot(s) added`
        );
      }
      closeWeeklyModal();
      fetchAvailability();
    } else {
      toast.error(
        "Failed to create weekly schedule. Some dates may already have availability."
      );
    }
  } catch (error: any) {
    console.error("Error saving weekly schedule:", error);

    // Extract the actual error message
    let errorMessage = "Failed to save weekly schedule";
    if (error?.message) {
      errorMessage = error.message;
    } else if (typeof error === "object" && error !== null) {
      errorMessage =
        error.error?.message || error.data?.message || errorMessage;
    }

    toast.error(errorMessage);
  } finally {
    formLoading.value = false;
  }
};

// Add slot to availability
const addSlotToAvailability = (slot: Availability) => {
  selectedAvailability.value = slot;
  singleSlot.value = "";
  showAddSlotModal.value = true;
};

// Close add slot modal
const closeAddSlotModal = () => {
  showAddSlotModal.value = false;
  selectedAvailability.value = null;
  singleSlot.value = "";
};

// Add single slot
const addSingleSlot = async () => {
  if (!selectedAvailability.value || !singleSlot.value) {
    toast.error("Please enter a time slot");
    return;
  }

  try {
    formLoading.value = true;
    const response = await api.availability.addSlot(
      selectedAvailability.value._id,
      singleSlot.value
    );

    if (response && (response.success || response.data)) {
      toast.success("Time slot added successfully");
      closeAddSlotModal();
      fetchAvailability();
    } else {
      throw new Error(response.message || "Failed to add time slot");
    }
  } catch (error: any) {
    console.error("Error adding slot:", error);

    // Extract the actual error message
    let errorMessage = "Failed to add time slot";
    if (error?.message) {
      errorMessage = error.message;
    } else if (typeof error === "object" && error !== null) {
      errorMessage =
        error.error?.message || error.data?.message || errorMessage;
    }

    toast.error(errorMessage);
  } finally {
    formLoading.value = false;
  }
};

// Toggle availability status
const toggleAvailabilityStatus = async (slot: Availability) => {
  try {
    const response = await api.availability.update(slot._id, {
      isActive: !slot.isActive,
    });

    if (response && (response.success || response.data)) {
      toast.success(
        `Availability ${slot.isActive ? "deactivated" : "activated"} successfully`
      );
      fetchAvailability();
    } else {
      throw new Error(
        response.message || "Failed to update availability status"
      );
    }
  } catch (error: any) {
    console.error("Error toggling availability status:", error);

    // Extract the actual error message
    let errorMessage = "Failed to update availability status";
    if (error?.message) {
      errorMessage = error.message;
    } else if (typeof error === "object" && error !== null) {
      errorMessage =
        error.error?.message || error.data?.message || errorMessage;
    }

    toast.error(errorMessage);
  }
};

// Delete availability
const deleteAvailability = async (slot: Availability) => {
  if (
    !confirm(
      `Are you sure you want to delete availability for ${formatDate(slot.date)}? This action cannot be undone.`
    )
  ) {
    return;
  }

  try {
    const response = await api.availability.delete(slot._id);

    if (response && (response.success || response.data)) {
      toast.success("Availability deleted successfully");
      fetchAvailability();
    } else {
      throw new Error(response.message || "Failed to delete availability");
    }
  } catch (error: any) {
    console.error("Error deleting availability:", error);

    // Extract the actual error message
    let errorMessage = "Failed to delete availability";
    if (error?.message) {
      errorMessage = error.message;
    } else if (typeof error === "object" && error !== null) {
      errorMessage =
        error.error?.message || error.data?.message || errorMessage;
    }

    toast.error(errorMessage);
  }
};

// Initialize
onMounted(() => {
  fetchAvailability();
});
</script>

<style scoped>
.availability-view {
  @apply p-6;
}
</style>
