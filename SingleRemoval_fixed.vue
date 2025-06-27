<script setup lang="ts">
import { ref, onMounted, inject } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Globe,
  Home,
  Phone,
  Mail,
  User,
  Truck,
  Ruler,
  PoundSterling,
  ScrollText,
  CheckCircle2,
  Truck as TruckIcon,
  Clock,
  Ban,
  Pencil,
  Trash2,
  FileText,
  Receipt,
  ClipboardSignature,
} from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast/use-toast";
import RemovalChat from "@/components/RemovalChat.vue";
import RemovalMap from "@/components/RemovalMap.vue";
import DocumentUpload from "@/components/DocumentUpload.vue";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Define types for our API
interface Removal {
  id: string;
  status: string;
  stage: string;
  createdBy?: string;
  quoteNumber: string;
  name: string;
  email: string;
  telephoneNumber: string;
  leadOperator: string;
  collectionDate: string;
  collectionHour: string;
  collectionCity: string;
  collectionCountry: string;
  collectionAddress: string;
  collectionPostCode: string;
  deliveryDate: string;
  deliveryHour: string;
  deliveryCity: string;
  deliveryCountry: string;
  deliveryAddress: string;
  deliveryPostCode: string;
  vehicleType?: string;
  serviceType?: string;
  contractNumber?: string;
  invoiceNumber?: string;
  signedRemoval?: boolean;
  loadSizeCubic: number;
  loadSizeWeight: number;
  price: number;
  distance: number;
  currency: string;
  additionalServices?: string;
  additionalNotes?: string;
}

type ApiFunction = <T>(endpoint: string, options?: RequestInit) => Promise<T>;

const route = useRoute();
const router = useRouter();
const removal = ref<Removal | null>(null);
const loading = ref(true);
const api = inject("api") as ApiFunction;

const { toast } = useToast();

const formatDate = (dateStr: string | null) => {
  if (!dateStr || dateStr === '') return "Not Available";
  const date = new Date(dateStr);
  return date.toLocaleDateString();
};

// Update formatValue function with proper typing
const formatValue = (value: string | number | null | undefined, unit: string = '') => {
  if (value === null || value === undefined || value === '') {
    return "Not Available";
  }
  return `${value}${unit}`;
};

// First, update the status options to match exactly with backend
const statusOptions = [
  { value: "Pending", label: "Pending" },
  { value: "Transit", label: "Transit" },
  { value: "Delivered", label: "Delivered" },
];

const stageOptions = [
  { value: "N/A", label: "N/A" },
  { value: "Payment Pending", label: "Payment Pending" },
  { value: "50/50 Payment", label: "50/50 Payment" },
  { value: "Deposit Paid", label: "Deposit Paid" },
];

// Update the update methods to handle the case properly
const updateStatus = async (newStatus: string) => {
  try {
    console.log("Updating status to:", newStatus);

    await api(`/data/removals/${route.params.id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: newStatus }),
    });

    removal.value!.status = newStatus;

    toast({
      title: "Success",
      description: "Status updated successfully",
    });
  } catch (error) {
    console.error("Error updating status:", error);
    toast({
      title: "Error",
      description: "Failed to update status",
    });
  }
};

const updateStage = async (newStage: string) => {
  try {
    await api(`/data/removals/${route.params.id}/stage`, {
      method: "PATCH",
      body: JSON.stringify({ stage: newStage }),
    });

    removal.value!.stage = newStage;

    toast({
      title: "Success",
      description: "Stage updated successfully",
    });
  } catch (error) {
    console.error("Error updating stage:", error);
    toast({
      title: "Error",
      description: "Failed to update stage",
    });
  }
};

// Add new state for editing
const editingField = ref<keyof Removal | null>(null);
const editingValue = ref<string>("");
const isEditMode = ref(false);

// Add new function to handle edit mode
const startEditing = (field: keyof Removal, value: string) => {
  if (!removal.value) return;
  editingField.value = field;
  editingValue.value = value;
};

// Add function to save edited value
const saveEdit = async (field: keyof Removal) => {
  try {
    if (!removal.value) return;

    let valueToSave: string | number | boolean = editingValue.value;
    
    // Convert to number for numeric fields
    if (["loadSizeCubic", "loadSizeWeight", "price", "distance"].includes(field)) {
      valueToSave = parseFloat(editingValue.value);
      if (isNaN(valueToSave)) {
        throw new Error("Please enter a valid number");
      }
    }

    // Format dates for date fields
    if (["collectionDate", "deliveryDate"].includes(field)) {
      const date = new Date(editingValue.value);
      if (isNaN(date.getTime())) {
        throw new Error("Please enter a valid date");
      }
      valueToSave = date.toISOString().split('T')[0];
    }
    
    // Handle boolean for signedRemoval
    if (field === "signedRemoval") {
      valueToSave = editingValue.value === "true";
    }

    // Make the API call with the field name as part of the endpoint
    await api(`/data/removals/${route.params.id}/${field}`, {
      method: "PATCH",
      body: JSON.stringify({ [field]: valueToSave }),
    });

    // Update local state
    if (removal.value) {
      if (["loadSizeCubic", "loadSizeWeight", "price", "distance"].includes(field)) {
        (removal.value[field] as number) = valueToSave as number;
      } else if (field === "signedRemoval") {
        (removal.value[field] as boolean) = valueToSave as boolean;
      } else {
        (removal.value[field] as string) = valueToSave as string;
      }
    }

    // Reset editing state
    editingField.value = null;
    editingValue.value = "";

    toast({
      title: "Success",
      description: "Field updated successfully",
    });
  } catch (error) {
    console.error("Error updating field:", error);
    toast({
      title: "Error",
      description: error instanceof Error ? error.message : "Failed to update field",
    });
  }
};

// Add function to cancel editing
const cancelEdit = () => {
  editingField.value = null;
  editingValue.value = "";
};

// Add new state for delete modal
const showDeleteModal = ref(false);

// Add delete function
const deleteRemoval = async () => {
  try {
    await api(`/data/removals/${route.params.id}`, {
      method: "DELETE",
    });

    toast({
      title: "Success",
      description: "Removal deleted successfully",
    });

    // Close the modal
    showDeleteModal.value = false;

    // Navigate back to the removals list
    router.push("/removals");
  } catch (error) {
    console.error("Error deleting removal:", error);
    toast({
      title: "Error",
      description: "Failed to delete removal",
    });
  }
};

onMounted(async () => {
  try {
    const id =
      typeof route.params.id === "string"
        ? route.params.id
        : route.params.id[0];
    console.log("Fetching removal with ID:", id);
    const data = await api<{ removal: Removal }>(`/data/removals/${id}`);
    console.log("Fetched removal data:", data);
    console.log("Status value:", data.removal.status);
    removal.value = data.removal;
  } catch (error) {
    console.error("Error fetching removal:", error);
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="container mx-auto px-4 py-6">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <Button variant="ghost" @click="$router.back()">
        <ArrowLeft class="h-4 w-4 mr-2" />
        Back
      </Button>
      <div class="flex items-center gap-2">
        <Button
          variant="outline"
          @click="isEditMode = !isEditMode"
          :class="{ 'bg-accent': isEditMode }"
        >
          <Pencil class="h-4 w-4 mr-2" />
          {{ isEditMode ? 'Exit Edit Mode' : 'Enter Edit Mode' }}
        </Button>
        <Button
          variant="destructive"
          @click="showDeleteModal = true"
        >
          <Trash2 class="h-4 w-4 mr-2" />
          Delete Removal
        </Button>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <Dialog :open="showDeleteModal" @update:open="showDeleteModal = false">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Removal</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this removal? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" @click="showDeleteModal = false">Cancel</Button>
          <Button variant="destructive" @click="deleteRemoval">Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <div v-if="loading" class="text-center">Loading...</div>

    <template v-else-if="removal">
      <div class="grid gap-6 md:grid-cols-2">
        <!-- Main Info Card -->
        <Card class="md:col-span-2 lg:col-span-1">
          <CardHeader>
            <CardTitle class="flex items-center justify-between">
              <span>Removal Details</span>
              <span
                v-if="removal.createdBy"
                class="flex items-center gap-2 px-3 py-1 rounded-full text-xs bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-400"
              >
                <User class="h-3 w-3" />
                {{ removal.createdBy }}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div class="space-y-4">
              <div class="flex items-center gap-2">
                <span class="font-medium">Quote Number:</span>
                <span>{{ removal.quoteNumber }}</span>
              </div>

              <div class="flex items-center gap-2">
                <span class="font-medium">Lead Operator:</span>
                <span>{{ removal.leadOperator }}</span>
              </div>

              <div class="flex items-center gap-2">
                <span class="font-medium">Status:</span>
                <Select
                  :model-value="removal.status"
                  @update:model-value="updateStatus"
                >
                  <SelectTrigger
                    :class="{
                      'bg-green-100 text-green-800 border border-green-200':
                        removal.status === 'Delivered',
                      'bg-blue-100 text-blue-800 border border-blue-200':
                        removal.status === 'Transit',
                      'bg-yellow-100 text-yellow-800 border border-yellow-200':
                        removal.status === 'Pending',
                    }"
                    class="w-[140px] h-8"
                  >
                    <SelectValue>
                      <span class="flex items-center gap-2">
                        <CheckCircle2
                          v-if="removal.status === 'Delivered'"
                          class="h-4 w-4"
                        />
                        <TruckIcon
                          v-if="removal.status === 'Transit'"
                          class="h-4 w-4"
                        />
                        <Clock
                          v-if="removal.status === 'Pending'"
                          class="h-4 w-4"
                        />
                        {{ removal.status }}
                      </span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="option in statusOptions"
                      :key="option.value"
                      :value="option.value"
                    >
                      <span class="flex items-center gap-2">
                        <CheckCircle2
                          v-if="option.value === 'Delivered'"
                          class="h-4 w-4"
                        />
                        <TruckIcon
                          v-if="option.value === 'Transit'"
                          class="h-4 w-4"
                        />
                        <Clock
                          v-if="option.value === 'Pending'"
                          class="h-4 w-4"
                        />
                        {{ option.label }}
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div class="flex items-center gap-2">
                <span class="font-medium">Stage:</span>
                <Select
                  :model-value="removal.stage"
                  @update:model-value="updateStage"
                >
                  <SelectTrigger
                    :class="{
                      'bg-purple-100 text-purple-800 border border-purple-200':
                        removal.stage === 'Payment Pending',
                      'bg-orange-100 text-orange-800 border border-orange-200':
                        removal.stage === '50/50 Payment',
                      'bg-green-100 text-green-800 border border-green-200':
                        removal.stage === 'Deposit Paid',
                      'bg-gray-100 text-gray-800 border border-gray-200':
                        removal.stage === 'N/A',
                    }"
                    class="w-[180px] h-8"
                  >
                    <SelectValue>
                      <span class="flex items-center gap-2">
                        <Clock
                          v-if="removal.stage === 'Payment Pending'"
                          class="h-4 w-4"
                        />
                        <PoundSterling
                          v-if="removal.stage === '50/50 Payment'"
                          class="h-4 w-4"
                        />
                        <CheckCircle2
                          v-if="removal.stage === 'Deposit Paid'"
                          class="h-4 w-4"
                        />
                        <Ban v-if="removal.stage === 'N/A'" class="h-4 w-4" />
                        {{ removal.stage }}
                      </span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="option in stageOptions"
                      :key="option.value"
                      :value="option.value"
                    >
                      <span class="flex items-center gap-2">
                        <Clock
                          v-if="option.value === 'Payment Pending'"
                          class="h-4 w-4"
                        />
                        <PoundSterling
                          v-if="option.value === '50/50 Payment'"
                          class="h-4 w-4"
                        />
                        <CheckCircle2
                          v-if="option.value === 'Deposit Paid'"
                          class="h-4 w-4"
                        />
                        <Ban v-if="option.value === 'N/A'" class="h-4 w-4" />
                        {{ option.label }}
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- Contact Info Card -->
        <Card class="md:col-span-2 lg:col-span-1">
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="space-y-2">
              <div class="flex items-center gap-2">
                <User class="h-4 w-4 text-gray-500" />
                <span class="font-medium">Name:</span>
                <div class="flex items-center gap-2 flex-1 group">
                  <template v-if="editingField === 'name'">
                    <Input
                      v-model="editingValue"
                      class="h-7"
                      @keyup.enter="saveEdit('name')"
                      @keyup.esc="cancelEdit" />
                    <button
                      :class="[
                        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2',
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                      @click="saveEdit('name')"
                    >
                      <CheckCircle2 class="h-4 w-4" />
                    </button>
                    <button
                      :class="[
                        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2',
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                      @click="cancelEdit"
                    >
                      <Ban class="h-4 w-4" />
                    </button>
                  </template>
                  <template v-else>
                    <span>{{ removal.name }}</span>
                    <button
                      :class="[
                        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2',
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                      @click="startEditing('name', removal.name)"
                    >
                      <Pencil class="h-4 w-4" />
                    </button>
                  </template>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <Mail class="h-4 w-4 text-gray-500" />
                <span class="font-medium">Email:</span>
                <div class="flex items-center gap-2 flex-1 group">
                  <template v-if="editingField === 'email'">
                    <Input
                      type="email"
                      class="h-7"
                      v-model="editingValue"
                      @keyup.enter="saveEdit('email')"
                      @keyup.esc="cancelEdit" />
                    <button
                      :class="[
                        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2',
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                      @click="saveEdit('email')"
                    >
                      <CheckCircle2 class="h-4 w-4" />
                    </button>
                    <button
                      :class="[
                        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2',
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                      @click="cancelEdit"
                    >
                      <Ban class="h-4 w-4" />
                    </button>
                  </template>
                  <template v-else>
                    <span>{{ removal.email }}</span>
                    <button
                      :class="[
                        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2',
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                      @click="startEditing('email', removal.email)"
                    >
                      <Pencil class="h-4 w-4" />
                    </button>
                  </template>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <Phone class="h-4 w-4 text-gray-500" />
                <span class="font-medium">Phone:</span>
                <div class="flex items-center gap-2 flex-1 group">
                  <template v-if="editingField === 'telephoneNumber'">
                    <Input
                      v-model="editingValue"
                      class="h-7"
                      @keyup.enter="saveEdit('telephoneNumber')"
                      @keyup.esc="cancelEdit" />
                    <button
                      :class="[
                        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2',
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                      @click="saveEdit('telephoneNumber')"
                    >
                      <CheckCircle2 class="h-4 w-4" />
                    </button>
                    <button
                      :class="[
                        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2',
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                      @click="cancelEdit"
                    >
                      <Ban class="h-4 w-4" />
                    </button>
                  </template>
                  <template v-else>
                    <span>{{ removal.telephoneNumber }}</span>
                    <button
                      :class="[
                        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2',
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                      @click="startEditing('telephoneNumber', removal.telephoneNumber)"
                    >
                      <Pencil class="h-4 w-4" />
                    </button>
                  </template>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- Collection Details -->
        <Card>
          <CardHeader>
            <CardTitle>Collection Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="space-y-2">
              <div class="flex items-center gap-2">
                <Calendar class="h-4 w-4 text-gray-500" />
                <span class="font-medium">Date:</span>
                <div class="flex items-center gap-2 flex-1 group">
                  <template v-if="editingField === 'collectionDate'">
                    <Input
                      type="date"
                      class="h-7"
                      v-model="editingValue"
                      @keyup.enter="saveEdit('collectionDate')"
                      @keyup.esc="cancelEdit" />
                    <button
                      :class="[
                        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2',
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                      @click="saveEdit('collectionDate')"
                    >
                      <CheckCircle2 class="h-4 w-4" />
                    </button>
                    <button
                      :class="[
                        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2',
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                      @click="cancelEdit"
                    >
                      <Ban class="h-4 w-4" />
                    </button>
                  </template>
                  <template v-else>
                    {{ formatDate(removal?.collectionDate ?? null) }}
                    <button
                      :class="[
                        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2',
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                      @click="startEditing('collectionDate', removal.collectionDate)"
                    >
                      <Pencil class="h-4 w-4" />
                    </button>
                  </template>
                </div>
              </div>
              
              <!-- Collection Hour -->
              <div class="flex items-center gap-2">
                <Clock class="h-4 w-4 text-gray-500" />
                <span class="font-medium">Hour:</span>
                <div class="flex items-center gap-2 flex-1 group">
                  <template v-if="editingField === 'collectionHour'">
                    <Input
                      v-model="editingValue"
                      class="h-7"
                      placeholder="e.g. 14:00"
                      @keyup.enter="saveEdit('collectionHour')"
                      @keyup.esc="cancelEdit" />
                    <button
                      :class="[
                        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2',
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                      @click="saveEdit('collectionHour')"
                    >
                      <CheckCircle2 class="h-4 w-4" />
                    </button>
                    <button
                      :class="[
                        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2',
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                      @click="cancelEdit"
                    >
                      <Ban class="h-4 w-4" />
                    </button>
                  </template>
                  <template v-else>
                    {{ formatValue(removal?.collectionHour) }}
                    <button
                      :class="[
                        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2',
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                      @click="startEditing('collectionHour', removal.collectionHour || '')"
                    >
                      <Pencil class="h-4 w-4" />
                    </button>
                  </template>
                </div>
              </div>
              
              <div class="flex items-center gap-2">
                <MapPin class="h-4 w-4 text-gray-500" />
                <span class="font-medium">Post Code:</span>
                <div class="flex items-center gap-2 flex-1 group">
                  <template v-if="editingField === 'collectionPostCode'">
                    <Input
                      v-model="editingValue"
                      class="h-7"
                      @keyup.enter="saveEdit('collectionPostCode')"
                      @keyup.esc="cancelEdit" />
                    <button
                      :class="[
                        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2',
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                      @click="saveEdit('collectionPostCode')"
                    >
                      <CheckCircle2 class="h-4 w-4" />
                    </button>
                    <button
                      :class="[
                        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2',
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                      @click="cancelEdit"
                    >
                      <Ban class="h-4 w-4" />
                    </button>
                  </template>
                  <template v-else>
                    {{ formatValue(removal?.collectionPostCode) }}
                    <button
                      :class="[
                        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2',
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                      @click="startEditing('collectionPostCode', removal.collectionPostCode || '')"
                    >
                      <Pencil class="h-4 w-4" />
                    </button>
                  </template>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <Home class="h-4 w-4 text-gray-500" />
                <span class="font-medium">Address:</span>
                <div class="flex items-center gap-2 flex-1 group">
                  <template v-if="editingField === 'collectionAddress'">
                    <Input
                      v-model="editingValue"
                      class="h-7"
                      @keyup.enter="saveEdit('collectionAddress')"
                      @keyup.esc="cancelEdit" />
                    <button
                      :class="[
                        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2',
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                      @click="saveEdit('collectionAddress')"
                    >
                      <CheckCircle2 class="h-4 w-4" />
                    </button>
                    <button
                      :class="[
                        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2',
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                      @click="cancelEdit"
                    >
                      <Ban class="h-4 w-4" />
                    </button>
                  </template>
                  <template v-else>
                    {{ formatValue(removal?.collectionAddress) }}
                    <button
                      :class="[
                        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2',
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                      @click="startEditing('collectionAddress', removal.collectionAddress || '')"
                    >
                      <Pencil class="h-4 w-4" />
                    </button>
                  </template>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <MapPin class="h-4 w-4 text-gray-500" />
                <span class="font-medium">City:</span>
                <div class="flex items-center gap-2 flex-1 group">
                  <template v-if="editingField === 'collectionCity'">
                    <Input
                      v-model="editingValue"
                      class="h-7"
                      @keyup.enter="saveEdit('collectionCity')"
                      @keyup.esc="cancelEdit" />
                    <button
                      :class="[
                        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2',
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                      @click="saveEdit('collectionCity')"
                    >
                      <CheckCircle2 class="h-4 w-4" />
                    </button>
                    <button
                      :class="[
                        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2',
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                      @click="cancelEdit"
                    >
                      <Ban class="h-4 w-4" />
                    </button>
                  </template>
                  <template v-else>
                    {{ formatValue(removal?.collectionCity) }}
                    <button
                      :class="[
                        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2',
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                      @click="startEditing('collectionCity', removal.collectionCity || '')"
                    >
                      <Pencil class="h-4 w-4" />
                    </button>
                  </template>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <Globe class="h-4 w-4 text-gray-500" />
                <span class="font-medium">Country:</span>
                <div class="flex items-center gap-2 flex-1 group">
                  <template v-if="editingField === 'collectionCountry'">
                    <Input
                      v-model="editingValue"
                      class="h-7"
                      @keyup.enter="saveEdit('collectionCountry')"
                      @keyup.esc="cancelEdit" />
                    <button
                      :class="[
                        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2',
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                      @click="saveEdit('collectionCountry')"
                    >
                      <CheckCircle2 class="h-4 w-4" />
                    </button>
                    <button
                      :class="[
                        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2',
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                      @click="cancelEdit"
                    >
                      <Ban class="h-4 w-4" />
                    </button>
                  </template>
                  <template v-else>
                    <span>{{ formatValue(removal?.collectionCountry) }}</span>
                    <button
                      :class="[
                        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2',
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                      @click="startEditing('collectionCountry', removal.collectionCountry || '')"
                    >
                      <Pencil class="h-4 w-4" />
                    </button>
                  </template>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- Delivery Details -->
        <Card>
          <CardHeader>
            <CardTitle>Delivery Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="space-y-2">
              <div class="flex items-center gap-2">
                <Calendar class="h-4 w-4 text-gray-500" />
                <span class="font-medium">Date:</span>
                <div class="flex items-center gap-2 flex-1 group">
                  <template v-if="editingField === 'deliveryDate'">
                    <Input
                      type="date"
                      class="h-7"
                      v-model="editingValue"
                      @keyup.enter="saveEdit('deliveryDate')"
                      @keyup.esc="cancelEdit" />
                    <button
                      :class="[
                        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2',
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                      @click="saveEdit('deliveryDate')"
                    >
                      <CheckCircle2 class="h-4 w-4" />
                    </button>
                    <button
                      :class="[
                        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2',
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                      @click="cancelEdit"
                    >
                      <Ban class="h-4 w-4" />
                    </button>
                  </template>
                  <template v-else>
                    {{ formatDate(removal?.deliveryDate ?? null) }}
                    <button
                      :class="[
                        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2',
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                      @click="startEditing('deliveryDate', removal.deliveryDate)"
                    >
                      <Pencil class="h-4 w-4" />
                    </button>
                  </template>
                </div>
              </div>
              
              <!-- Delivery Hour -->
              <div class="flex items-center gap-2">
                <Clock class="h-4 w-4 text-gray-500" />
                <span class="font-medium">Hour:</span>
                <div class="flex items-center gap-2 flex-1 group">
                  <template v-if="editingField === 'deliveryHour'">
                    <Input
                      v-model="editingValue"
                      class="h-7"
                      placeholder="e.g. 14:00"
                      @keyup.enter="saveEdit('deliveryHour')"
                      @keyup.esc="cancelEdit" />
                    <button
                      :class="[
                        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2',
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                      @click="saveEdit('deliveryHour')"
                    >
                      <CheckCircle2 class="h-4 w-4" />
                    </button>
                    <button
                      :class="[
                        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2',
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                      @click="cancelEdit"
                    >
                      <Ban class="h-4 w-4" />
                    </button>
                  </template>
                  <template v-else>
                    {{ formatValue(removal?.deliveryHour) }}
                    <button
                      :class="[
                        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2',
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                      @click="startEditing('deliveryHour', removal.deliveryHour || '')"
                    >
                      <Pencil class="h-4 w-4" />
                    </button>
                  </template>
                </div>
              </div>
              
              <div class="flex items-center gap-2">
                <MapPin class="h-4 w-4 text-gray-500" />
                <span class="font-medium">Post Code:</span>
                <div class="flex items-center gap-2 flex-1 group">
                  <template v-if="editingField === 'deliveryPostCode'">
                    <Input
                      v-model="editingValue"
                      class="h-7"
                      @keyup.enter="saveEdit('deliveryPostCode')"
                      @keyup.esc="cancelEdit" />
                    <button
                      :class="[
                        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2',
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                      @click="saveEdit('deliveryPostCode')"
                    >
                      <CheckCircle2 class="h-4 w-4" />
                    </button>
                    <button
                      :class="[
                        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2',
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                      @click="cancelEdit"
                    >
                      <Ban class="h-4 w-4" />
                    </button>
                  </template>
                  <template v-else>
                    {{ formatValue(removal?.deliveryPostCode) }}
                    <button
                      :class="[
                        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2',
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                      @click="startEditing('deliveryPostCode', removal.deliveryPostCode || '')"
                    >
                      <Pencil class="h-4 w-4" />
                    </button>
                  </template>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <Home class="h-4 w-4 text-gray-500" />
                <span class="font-medium">Address:</span>
                <div class="flex items-center gap-2 flex-1 group">
                  <template v-if="editingField === 'deliveryAddress'">
                    <Input
                      v-model="editingValue"
                      class="h-7"
                      @keyup.enter="saveEdit('deliveryAddress')"
                      @keyup.esc="cancelEdit" />
                    <button
                      :class="[
                        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2',
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                      @click="saveEdit('deliveryAddress')"
                    >
                      <CheckCircle2 class="h-4 w-4" />
                    </button>
                    <button
                      :class="[
                        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2',
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                      @click="cancelEdit"
                    >
                      <Ban class="h-4 w-4" />
                    </button>
                  </template>
                  <template v-else>
                    {{ formatValue(removal?.deliveryAddress) }}
                    <button
                      :class="[
                        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2',
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                      @click="startEditing('deliveryAddress', removal.deliveryAddress || '')"
                    >
                      <Pencil class="h-4 w-4" />
                    </button>
                  </template>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <MapPin class="h-4 w-4 text-gray-500" />
                <span class="font-medium">City:</span>
                <div class="flex items-center gap-2 flex-1 group">
                  <template v-if="editingField === 'deliveryCity'">
                    <Input
                      v-model="editingValue"
                      class="h-7"
                      @keyup.enter="saveEdit('deliveryCity')"
                      @keyup.esc="cancelEdit" />
                    <button
                      :class="[
                        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2',
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                      @click="saveEdit('deliveryCity')"
                    >
                      <CheckCircle2 class="h-4 w-4" />
                    </button>
                    <button
                      :class="[
                        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2',
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                      @click="cancelEdit"
                    >
                      <Ban class="h-4 w-4" />
                    </button>
                  </template>
                  <template v-else>
                    {{ formatValue(removal?.deliveryCity) }}
                    <button
                      :class="[
                        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2',
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                      @click="startEditing('deliveryCity', removal.deliveryCity || '')"
                    >
                      <Pencil class="h-4 w-4" />
                    </button>
                  </template>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <Globe class="h-4 w-4 text-gray-500" />
                <span class="font-medium">Country:</span>
                <div class="flex items-center gap-2 flex-1 group">
                  <template v-if="editingField === 'deliveryCountry'">
                    <Input
                      v-model="editingValue"
                      class="h-7"
                      @keyup.enter="saveEdit('deliveryCountry')"
                      @keyup.esc="cancelEdit" />
                    <button
                      :class="[
                        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2',
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                      @click="saveEdit('deliveryCountry')"
                    >
                      <CheckCircle2 class="h-4 w-4" />
                    </button>
                    <button
                      :class="[
                        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2',
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                      @click="cancelEdit"
                    >
                      <Ban class="h-4 w-4" />
                    </button>
                  </template>
                  <template v-else>
                    <span>{{ formatValue(removal?.deliveryCountry) }}</span>
                    <button
                      :class="[
                        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2',
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                      @click="startEditing('deliveryCountry', removal.deliveryCountry || '')"
                    >
                      <Pencil class="h-4 w-4" />
                    </button>
                  </template>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- Additional Details -->
        <Card class="md:col-span-2">
          <CardHeader>
            <CardTitle>Shipment Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="grid gap-4 md:grid-cols-5">
              <!-- Vehicle Type -->
              <div>
                <p class="font-medium flex items-center gap-2">
                  <Truck class="h-4 w-4 text-gray-500" />
                  Vehicle Type
                </p>
                <div class="flex items-center gap-2 ml-6 group">
                  <template v-if="editingField === 'vehicleType'">
                    <Select v-model="editingValue" class="w-full">
                      <SelectTrigger class="h-7">
                        <SelectValue placeholder="Select vehicle type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Luton van 20m3 /1000kg">Luton van 20m3 /1000kg</SelectItem>
                        <SelectItem value="Truck 7.5t / 4000kg">Truck 7.5t / 4000kg</SelectItem>
                      </SelectContent>
                    </Select>
                    <button
                      :class="[
                        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2',
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                      @click="saveEdit('vehicleType')"
                    >
                      <CheckCircle2 class="h-4 w-4" />
                    </button>
                    <button
                      :class="[
                        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2',
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                      @click="cancelEdit"
                    >
                      <Ban class="h-4 w-4" />
                    </button>
                  </template>
                  <template v-else>
                    <span>{{ formatValue(removal?.vehicleType) }}</span>
                    <button
                      :class="[
                        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2',
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                      @click="startEditing('vehicleType', removal.vehicleType || '')"
                    >
                      <Pencil class="h-4 w-4" />
                    </button>
                  </template>
                </div>
              </div>

              <!-- Service Type -->
              <div>
                <p class="font-medium flex items-center gap-2">
                  <ScrollText class="h-4 w-4 text-gray-500" />
                  Service Type
                </p>
                <div class="flex items-center gap-2 ml-6 group">
                  <template v-if="editingField === 'serviceType'">
                    <Select v-model="editingValue" class="w-full">
                      <SelectTrigger class="h-7">
                        <SelectValue placeholder="Select service type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Dedicated Service">Dedicated Service</SelectItem>
                        <SelectItem value="Not Dedicated Service">Not Dedicated Service</SelectItem>
                      </SelectContent>
                    </Select>
                    <button
                      :class="[
                        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2',
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                      @click="saveEdit('serviceType')"
                    >
                      <CheckCircle2 class="h-4 w-4" />
                    </button>
                    <button
                      :class="[
                        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2',
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                      @click="cancelEdit"
                    >
                      <Ban class="h-4 w-4" />
                    </button>
                  </template>
                  <template v-else>
                    <span>{{ formatValue(removal?.serviceType) }}</span>
                    <button
                      :class="[
                        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2',
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                      @click="startEditing('serviceType', removal.serviceType || '')"
                    >
                      <Pencil class="h-4 w-4" />
                    </button>
                  </template>
                </div>
              </div>
              
              <div>
                <p class="font-medium flex items-center gap-2">
                  <Truck class="h-4 w-4 text-gray-500" />
                  Load Size (cm³)
                </p>
                <div class="flex items-center gap-2 ml-6 group">
                  <template v-if="editingField === 'loadSizeCubic'">
                    <Input
                      v-model="editingValue"
                      type="number"
                      class="h-7"
                      @keyup.enter="saveEdit('loadSizeCubic')"
                      @keyup.esc="cancelEdit" />
                    <button
                      :class="[
                        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2',
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                      @click="saveEdit('loadSizeCubic')"
                    >
                      <CheckCircle2 class="h-4 w-4" />
                    </button>
                    <button
                      :class="[
                        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2',
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                      @click="cancelEdit"
                    >
                      <Ban class="h-4 w-4" />
                    </button>
                  </template>
                  <template v-else>
                    <span>{{ formatValue(removal.loadSizeCubic, ' cm³') }}</span>
                    <button
                      :class="[
                        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2',
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                      @click="startEditing('loadSizeCubic', String(removal.loadSizeCubic))"
                    >
                      <Pencil class="h-4 w-4" />
                    </button>
                  </template>
                </div>
              </div>
              <div>
                <p class="font-medium flex items-center gap-2">
                  <Truck class="h-4 w-4 text-gray-500" />
                  Load Size (kg)
                </p>
                <div class="flex items-center gap-2 ml-6 group">
                  <template v-if="editingField === 'loadSizeWeight'">
                    <Input
                      v-model="editingValue"
                      type="number"
                      class="h-7"
                      @keyup.enter="saveEdit('loadSizeWeight')"
                      @keyup.esc="cancelEdit" />
                    <button
                      :class="[
                        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2',
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                      @click="saveEdit('loadSizeWeight')"
                    >
                      <CheckCircle2 class="h-4 w-4" />
                    </button>
                    <button
                      :class="[
                        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2',
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                      @click="cancelEdit"
                    >
                      <Ban class="h-4 w-4" />
                    </button>
                  </template>
                  <template v-else>
                    <span>{{ formatValue(removal.loadSizeWeight, ' kg') }}</span>
                    <button
                      :class="[
                        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2',
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                      @click="startEditing('loadSizeWeight', String(removal.loadSizeWeight))"
                    >
                      <Pencil class="h-4 w-4" />
                    </button>
                  </template>
                </div>
              </div>
              <div>
                <p class="font-medium flex items-center gap-2">
                  <PoundSterling class="h-4 w-4 text-gray-500" />
                  Price
                </p>
                <div class="flex items-center gap-2 ml-6 group">
                  <template v-if="editingField === 'price'">
                    <Input
                      v-model="editingValue"
                      type="number"
                      class="h-7"
                      @keyup.enter="saveEdit('price')"
                      @keyup.esc="cancelEdit" />
                    <button
                      :class="[
                        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2',
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                      @click="saveEdit('price')"
                    >
                      <CheckCircle2 class="h-4 w-4" />
                    </button>
                    <button
                      :class="[
                        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2',
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                      @click="cancelEdit"
                    >
                      <Ban class="h-4 w-4" />
                    </button>
                  </template>
                  <template v-else>
                    <span>{{ removal.price ? `${removal.price} ${removal.currency}` : 'Not Available' }}</span>
                    <button
                      :class="[
                        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2',
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                      @click="startEditing('price', String(removal.price))"
                    >
                      <Pencil class="h-4 w-4" />
                    </button>
                  </template>
                </div>
              </div>
              <div>
                <p class="font-medium flex items-center gap-2">
                  <Ruler class="h-4 w-4 text-gray-500" />
                  Distance
                </p>
                <div class="flex items-center gap-2 ml-6 group">
                  <template v-if="editingField === 'distance'">
                    <Input
                      v-model="editingValue"
                      type="number"
                      class="h-7"
                      @keyup.enter="saveEdit('distance')"
                      @keyup.esc="cancelEdit" />
                    <button
                      :class="[
                        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2',
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                      @click="saveEdit('distance')"
                    >
                      <CheckCircle2 class="h-4 w-4" />
                    </button>
                    <button
                      :class="[
                        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2',
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                      @click="cancelEdit"
                    >
                      <Ban class="h-4 w-4" />
                    </button>
                  </template>
                  <template v-else>
                    <span>{{ removal.additionalNotes || "Not Available" }}</span>
                    <button
                      :class="[
                        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2',
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                      @click="startEditing('additionalNotes', removal.additionalNotes || '')"
                    >
                      <Pencil class="h-4 w-4" />
                    </button>
                  </template>
                </div>
              </div>
              
              <!-- Contract Number -->
              <div>
                <p class="font-medium flex items-center gap-2">
                  <FileText class="h-4 w-4 text-gray-500" />
                  Contract Number
                </p>
                <div class="flex items-center gap-2 ml-6 group">
                  <template v-if="editingField === 'contractNumber'">
                    <Input
                      v-model="editingValue"
                      class="h-7"
                      @keyup.enter="saveEdit('contractNumber')"
                      @keyup.esc="cancelEdit" />
                    <button
                      :class="[
                        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2',
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                      @click="saveEdit('contractNumber')"
                    >
                      <CheckCircle2 class="h-4 w-4" />
                    </button>
                    <button
                      :class="[
                        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2',
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                      @click="cancelEdit"
                    >
                      <Ban class="h-4 w-4" />
                    </button>
                  </template>
                  <template v-else>
                    <span>{{ formatValue(removal?.contractNumber) }}</span>
                    <button
                      :class="[
                        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2',
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                      @click="startEditing('contractNumber', removal.contractNumber || '')"
                    >
                      <Pencil class="h-4 w-4" />
                    </button>
                  </template>
                </div>
              </div>
              
              <!-- Invoice Number -->
              <div>
                <p class="font-medium flex items-center gap-2">
                  <Receipt class="h-4 w-4 text-gray-500" />
                  Invoice Number
                </p>
                <div class="flex items-center gap-2 ml-6 group">
                  <template v-if="editingField === 'invoiceNumber'">
                    <Input
                      v-model="editingValue"
                      class="h-7"
                      @keyup.enter="saveEdit('invoiceNumber')"
                      @keyup.esc="cancelEdit" />
                    <button
                      :class="[
                        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2',
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                      @click="saveEdit('invoiceNumber')"
                    >
                      <CheckCircle2 class="h-4 w-4" />
                    </button>
                    <button
                      :class="[
                        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2',
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                      @click="cancelEdit"
                    >
                      <Ban class="h-4 w-4" />
                    </button>
                  </template>
                  <template v-else>
                    <span>{{ formatValue(removal?.invoiceNumber) }}</span>
                    <button
                      :class="[
                        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2',
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                      @click="startEditing('invoiceNumber', removal.invoiceNumber || '')"
                    >
                      <Pencil class="h-4 w-4" />
                    </button>
                  </template>
                </div>
              </div>
            </div>
            
            <!-- Signed Removal -->
            <div class="mt-4">
              <p class="flex items-center gap-2">
                <ClipboardSignature class="h-4 w-4 text-gray-500" />
                <span class="font-medium">Signed Removal:</span>
                <div class="flex items-center gap-2 flex-1 group">
                  <template v-if="editingField === 'signedRemoval'">
                    <Select v-model="editingValue" class="w-full">
                      <SelectTrigger class="h-7">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                    <button
                      :class="[
                        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2',
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                      @click="saveEdit('signedRemoval')"
                    >
                      <CheckCircle2 class="h-4 w-4" />
                    </button>
                    <button
                      :class="[
                        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2',
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                      @click="cancelEdit"
                    >
                      <Ban class="h-4 w-4" />
                    </button>
                  </template>
                  <template v-else>
                    <span>{{ removal.signedRemoval ? 'Yes' : 'No' }}</span>
                    <button
                      :class="[
                        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2',
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                      @click="startEditing('signedRemoval', removal.signedRemoval ? 'true' : 'false')"
                    >
                      <Pencil class="h-4 w-4" />
                    </button>
                  </template>
                </div>
              </p>
            </div>
            
            <div class="mt-4">
              <p class="flex items-center gap-2">
                <ScrollText class="h-4 w-4 text-gray-500" />
                <span class="font-medium">Additional Services:</span>
                <div class="flex items-center gap-2 flex-1 group">
                  <template v-if="editingField === 'additionalServices'">
                    <Input
                      v-model="editingValue"
                      class="h-7"
                      @keyup.enter="saveEdit('additionalServices')"
                      @keyup.esc="cancelEdit" />
                    <button
                      :class="[
                        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2',
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                      @click="saveEdit('additionalServices')"
                    >
                      <CheckCircle2 class="h-4 w-4" />
                    </button>
                    <button
                      :class="[
                        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2',
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                      @click="cancelEdit"
                    >
                      <Ban class="h-4 w-4" />
                    </button>
                  </template>
                  <template v-else>
                    <span>{{ formatValue(removal?.additionalServices) }}</span>
                    <button
                      :class="[
                        'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-7 px-2',
                        isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      ]"
                      @click="startEditing('additionalServices', removal.additionalServices || '')"
                    >
                      <Pencil class="h-4 w-4" />
                    </button>
                  </template>
                </div>
              </p>
            </div>
          </CardContent>
        </Card>

        <!-- Document Upload Component -->
        <div class="md:col-span-2">
          <DocumentUpload :removal-id="String(route.params.id)" />
        </div>

        <!-- Chat and Map Container -->
        <div class="md:col-span-2 grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Chat</CardTitle>
            </CardHeader>
            <CardContent>
              <RemovalChat :removal-id="String(route.params.id)" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Route Map</CardTitle>
            </CardHeader>
            <CardContent>
              <RemovalMap
                v-if="removal.collectionCity && removal.collectionCountry && removal.deliveryCity && removal.deliveryCountry"
                :collection-city="removal.collectionCity"
                :collection-country="removal.collectionCountry"
                :delivery-city="removal.deliveryCity"
                :delivery-country="removal.deliveryCountry"
              />
              <div v-else class="text-center text-muted-foreground">
                Map will be available when all location details are provided
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </template>

    <div v-else class="text-center text-red-600">Removal not found</div>
  </div>
</template>
