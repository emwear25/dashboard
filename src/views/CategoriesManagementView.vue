<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Edit2, Trash2, Tags, X } from "lucide-vue-next";
import { useToast } from "@/components/ui/toast/use-toast";
import { apiGet, apiPost, apiPut, apiDelete } from "@/utils/api";

interface PersonalizationField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'time' | 'textarea' | 'checkbox';
  placeholder: string;
  required: boolean;
  order: number;
  price: number;
}

interface Category {
  _id: string;
  name: string;
  slug: string;
  displayName: string;
  sizes: string[];
  defaultWeight: number;
  defaultDimensions: {
    length: number;
    width: number;
    height: number;
  };
  isActive: boolean;
  imageUrl?: string | null;
  personalizationFields?: PersonalizationField[];
  createdAt: string;
  updatedAt: string;
}

const { toast } = useToast();

// State
const categories = ref<Category[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const searchQuery = ref("");
const isDialogOpen = ref(false);
const isEditMode = ref(false);
const isSubmitting = ref(false);
const selectedCategory = ref<Category | null>(null);

// Form state
const form = reactive({
  name: "",
  displayName: "",
  sizes: [] as string[],
  currentSize: "",
  defaultWeight: 0.5,
  defaultDimensions: {
    length: 40,
    width: 30,
    height: 20,
  },
  imageUrl: null as string | null,
  personalizationFields: [] as PersonalizationField[],
});

const formErrors = reactive({
  name: "",
  displayName: "",
  sizes: "",
  defaultWeight: "",
  defaultDimensions: "",
  imageUrl: "",
});

// Image upload state
const selectedImage = ref<File | null>(null);
const imagePreview = ref<string | null>(null);
const isUploadingImage = ref(false);

// Computed
const filteredCategories = computed(() => {
  if (!searchQuery.value) return categories.value;
  const query = searchQuery.value.toLowerCase();
  return categories.value.filter(
    (cat) =>
      cat.name.toLowerCase().includes(query) ||
      cat.displayName.toLowerCase().includes(query) ||
      cat.slug.toLowerCase().includes(query)
  );
});

// Functions
const fetchCategories = async () => {
  try {
    loading.value = true;
    error.value = null;

    const data = await apiGet("categories");

    if (data.success) {
      categories.value = data.data;
    } else {
      throw new Error(data.message || "Неуспешно зареждане на категориите");
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Възникна грешка";
    toast({
      title: "Грешка",
      description: error.value,
      variant: "destructive",
    });
  } finally {
    loading.value = false;
  }
};

const openAddDialog = () => {
  isEditMode.value = false;
  selectedCategory.value = null;
  resetForm();
  isDialogOpen.value = true;
};

const openEditDialog = (category: Category) => {
  isEditMode.value = true;
  selectedCategory.value = category;
  form.name = category.name;
  form.displayName = category.displayName;
  form.sizes = [...category.sizes];
  form.currentSize = "";
  form.defaultWeight = category.defaultWeight || 0.5;
  form.defaultDimensions = category.defaultDimensions || {
    length: 40,
    width: 30,
    height: 20,
  };
  form.imageUrl = category.imageUrl || null;
  form.personalizationFields = category.personalizationFields ? [...category.personalizationFields] : [];
  imagePreview.value = category.imageUrl || null;
  selectedImage.value = null;
  resetFormErrors();
  isDialogOpen.value = true;
};

const closeDialog = () => {
  isDialogOpen.value = false;
  resetForm();
};

const resetForm = () => {
  form.name = "";
  form.displayName = "";
  form.sizes = [];
  form.currentSize = "";
  form.defaultWeight = 0.5;
  form.defaultDimensions = { length: 40, width: 30, height: 20 };
  form.imageUrl = null;
  form.personalizationFields = [];
  selectedImage.value = null;
  imagePreview.value = null;
  resetFormErrors();
};

const resetFormErrors = () => {
  formErrors.name = "";
  formErrors.displayName = "";
  formErrors.sizes = "";
  formErrors.defaultWeight = "";
  formErrors.defaultDimensions = "";
  formErrors.imageUrl = "";
};

const validateForm = (): boolean => {
  resetFormErrors();
  let isValid = true;

  if (!form.name.trim()) {
    formErrors.name = "Името е задължително";
    isValid = false;
  } else if (form.name.length < 2) {
    formErrors.name = "Името трябва да бъде поне 2 символа";
    isValid = false;
  }

  if (!form.displayName.trim()) {
    formErrors.displayName = "Показваното име е задължително";
    isValid = false;
  } else if (form.displayName.length < 2) {
    formErrors.displayName = "Показваното име трябва да бъде поне 2 символа";
    isValid = false;
  }

  // Sizes are now optional - not all categories need sizes (accessories, decorative items, etc.)
  // if (form.sizes.length === 0) {
  //   formErrors.sizes = "Добавете поне един размер";
  //   isValid = false;
  // }

  if (form.defaultWeight <= 0) {
    formErrors.defaultWeight = "Теглото трябва да бъде по-голямо от 0";
    isValid = false;
  }

  if (
    form.defaultDimensions.length <= 0 ||
    form.defaultDimensions.width <= 0 ||
    form.defaultDimensions.height <= 0
  ) {
    formErrors.defaultDimensions = "Всички размери трябва да бъдат по-големи от 0";
    isValid = false;
  }

  return isValid;
};

const addSize = () => {
  const size = form.currentSize.trim();
  if (!size) return;

  if (form.sizes.includes(size)) {
    toast({
      title: "Грешка",
      description: "Този размер вече е добавен",
      variant: "destructive",
    });
    return;
  }

  form.sizes.push(size);
  form.currentSize = "";
  formErrors.sizes = "";
};

const removeSize = (index: number) => {
  form.sizes.splice(index, 1);
};

const handleSizeInput = (e: KeyboardEvent) => {
  if (e.key === "Enter") {
    e.preventDefault();
    addSize();
  }
};

// Personalization Fields functions
const addPersonalizationField = () => {
  const newField: PersonalizationField = {
    name: '',
    label: '',
    type: 'text',
    placeholder: '',
    required: false,
    order: form.personalizationFields.length,
    price: 0,
  };
  form.personalizationFields.push(newField);
};

const removePersonalizationField = (index: number) => {
  form.personalizationFields.splice(index, 1);
  // Update order values
  form.personalizationFields.forEach((field, i) => {
    field.order = i;
  });
};

const generateFieldName = (label: string): string => {
  // Generate a camelCase name from the label
  return label
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(' ')
    .map((word, index) => 
      index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join('');
};

// Image upload functions
const handleImageSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  if (!file) return;

  // Validate file type
  if (!file.type.startsWith("image/")) {
    toast({
      title: "Грешка",
      description: "Моля, изберете изображение",
      variant: "destructive",
    });
    return;
  }

  // Validate file size (5MB)
  if (file.size > 5 * 1024 * 1024) {
    toast({
      title: "Грешка",
      description: "Изображението е твърде голямо (макс. 5MB)",
      variant: "destructive",
    });
    return;
  }

  selectedImage.value = file;

  // Create preview
  const reader = new FileReader();
  reader.onload = (e) => {
    imagePreview.value = e.target?.result as string;
  };
  reader.readAsDataURL(file);

  // Upload immediately
  uploadImage();
};

const uploadImage = async () => {
  if (!selectedImage.value) return;

  try {
    isUploadingImage.value = true;
    formErrors.imageUrl = "";

    const formData = new FormData();
    formData.append("file", selectedImage.value);

    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3030";
    const response = await fetch(`${API_URL}/api/uploads/category-image`, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Неуспешно качване на изображението");
    }

    form.imageUrl = data.url;
    toast({
      title: "Успех",
      description: "Изображението беше качено успешно",
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Възникна грешка";
    formErrors.imageUrl = errorMessage;
    toast({
      title: "Грешка",
      description: errorMessage,
      variant: "destructive",
    });
    // Clear the selected image on error
    selectedImage.value = null;
    imagePreview.value = form.imageUrl; // Revert to existing image if any
  } finally {
    isUploadingImage.value = false;
  }
};

const removeImage = () => {
  selectedImage.value = null;
  imagePreview.value = null;
  form.imageUrl = null;
};

const handleSubmit = async () => {
  if (!validateForm()) return;

  try {
    isSubmitting.value = true;

    // Clean up personalization fields before submission
    // - Auto-generate names from labels if missing
    // - Filter out fields without labels
    const cleanedFields = form.personalizationFields
      .filter(field => field.label && field.label.trim()) // Remove fields without labels
      .map(field => ({
        ...field,
        name: field.name || generateFieldName(field.label), // Auto-generate name if missing
        label: field.label.trim(),
      }));

    const payload = {
      name: form.name.trim(),
      displayName: form.displayName.trim(),
      sizes: form.sizes,
      defaultWeight: form.defaultWeight,
      defaultDimensions: form.defaultDimensions,
      imageUrl: form.imageUrl,
      personalizationFields: cleanedFields,
    };

    let data;
    if (isEditMode.value && selectedCategory.value) {
      data = await apiPut(`categories/${selectedCategory.value._id}`, payload);
    } else {
      data = await apiPost("categories", payload);
    }

    if (data.success) {
      toast({
        title: "Успех",
        description: isEditMode.value
          ? "Категорията беше актуализирана успешно"
          : "Категорията беше създадена успешно",
      });
      closeDialog();
      fetchCategories();
    } else {
      throw new Error(data.message || "Неуспешна операция");
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Възникна грешка";
    toast({
      title: "Грешка",
      description: errorMessage,
      variant: "destructive",
    });
  } finally {
    isSubmitting.value = false;
  }
};

const toggleCategoryStatus = async (category: Category) => {
  try {
    const data = await apiPut(`categories/${category._id}`, {
      isActive: !category.isActive,
    });

    if (data.success) {
      toast({
        title: "Успех",
        description: `Категорията е ${!category.isActive ? "активирана" : "деактивирана"}`,
      });
      fetchCategories();
    } else {
      throw new Error(data.message);
    }
  } catch (err) {
    toast({
      title: "Грешка",
      description: err instanceof Error ? err.message : "Възникна грешка",
      variant: "destructive",
    });
  }
};

const deleteCategory = async (category: Category) => {
  if (!confirm(`Сигурни ли сте, че искате да изтриете категорията "${category.displayName}"?`))
    return;

  try {
    const data = await apiDelete(`categories/${category._id}`);

    if (data.success) {
      toast({
        title: "Успех",
        description: "Категорията беше изтрита успешно",
      });
      fetchCategories();
    } else {
      throw new Error(data.message);
    }
  } catch (err) {
    toast({
      title: "Грешка",
      description: err instanceof Error ? err.message : "Възникна грешка",
      variant: "destructive",
    });
  }
};

onMounted(() => {
  fetchCategories();
});
</script>

<template>
  <div class="space-y-8 pt-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-4xl font-bold tracking-tight">Категории</h1>
        <p class="text-muted-foreground mt-1.5">
          Управлявайте категориите и размерите за вашите продукти
        </p>
      </div>
      <Button @click="openAddDialog" size="default" class="sm:self-start">
        <Plus class="mr-2 h-4 w-4" />
        Добави Категория
      </Button>
    </div>

    <!-- Search and Stats -->
    <div class="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader class="pb-3">
          <CardTitle class="text-sm font-medium">Всичко Категории</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">{{ categories.length }}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader class="pb-3">
          <CardTitle class="text-sm font-medium">Активни</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">
            {{ categories.filter((c) => c.isActive).length }}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader class="pb-3">
          <CardTitle class="text-sm font-medium">Неактивни</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">
            {{ categories.filter((c) => !c.isActive).length }}
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Search -->
    <div class="flex items-center gap-2">
      <Input
        v-model="searchQuery"
        placeholder="Търсене по име, показвано име или слъг..."
        class="max-w-md"
      />
    </div>

    <!-- Categories Table -->
    <Card>
      <CardHeader>
        <CardTitle>Списък с Категории</CardTitle>
        <CardDescription>Преглеждайте и управлявайте всички категории</CardDescription>
      </CardHeader>
      <CardContent>
        <div v-if="loading" class="flex items-center justify-center py-12">
          <Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
        </div>

        <div v-else-if="error" class="flex flex-col items-center justify-center py-12 text-center">
          <Tags class="h-12 w-12 text-muted-foreground mb-3" />
          <p class="font-semibold">Неуспешно зареждане на категориите</p>
          <p class="text-sm text-muted-foreground mt-1">{{ error }}</p>
          <Button @click="fetchCategories" variant="outline" class="mt-4"> Опитай Отново </Button>
        </div>

        <div v-else-if="filteredCategories.length === 0" class="text-center py-12">
          <Tags class="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p class="font-semibold">Няма намерени категории</p>
          <p class="text-sm text-muted-foreground mt-1">
            {{
              searchQuery
                ? "Опитайте с различни критерии за търсене"
                : "Започнете като добавите нова категория"
            }}
          </p>
        </div>

        <div v-else class="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Име</TableHead>
                <TableHead>Показвано Име</TableHead>
                <TableHead>Слъг</TableHead>
                <TableHead>Размери</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead class="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="category in filteredCategories" :key="category._id">
                <TableCell class="font-medium">{{ category.name }}</TableCell>
                <TableCell>{{ category.displayName }}</TableCell>
                <TableCell>
                  <code class="text-xs bg-muted px-2 py-1 rounded">{{ category.slug }}</code>
                </TableCell>
                <TableCell>
                  <div class="flex flex-wrap gap-1">
                    <Badge
                      v-for="(size, index) in category.sizes"
                      :key="index"
                      variant="secondary"
                      class="text-xs"
                    >
                      {{ size }}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <div class="flex items-center gap-2">
                    <Switch
                      :checked="category.isActive"
                      @update:checked="toggleCategoryStatus(category)"
                    />
                    <span class="text-sm">
                      {{ category.isActive ? "Активна" : "Неактивна" }}
                    </span>
                  </div>
                </TableCell>
                <TableCell class="text-right">
                  <div class="flex items-center justify-end gap-2">
                    <Button @click="openEditDialog(category)" variant="ghost" size="icon">
                      <Edit2 class="h-4 w-4" />
                    </Button>
                    <Button @click="deleteCategory(category)" variant="ghost" size="icon">
                      <Trash2 class="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>

    <!-- Add/Edit Dialog -->
    <Dialog :open="isDialogOpen" @update:open="closeDialog">
      <DialogContent class="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {{ isEditMode ? "Редактирай Категория" : "Добави Нова Категория" }}
          </DialogTitle>
          <DialogDescription>
            {{
              isEditMode
                ? "Актуализирайте информацията за категорията"
                : "Въведете данните за новата категория"
            }}
          </DialogDescription>
        </DialogHeader>

        <div class="space-y-4 py-4">
          <!-- Name -->
          <div class="space-y-2">
            <Label for="name"> Име <span class="text-destructive">*</span> </Label>
            <Input
              id="name"
              v-model="form.name"
              :disabled="isEditMode"
              placeholder="напр. t-shirts"
              :class="{ 'border-destructive': formErrors.name }"
            />
            <p v-if="formErrors.name" class="text-xs text-destructive">
              {{ formErrors.name }}
            </p>
            <p v-if="isEditMode" class="text-xs text-muted-foreground">
              Името не може да бъде променено след създаване
            </p>
          </div>

          <!-- Display Name -->
          <div class="space-y-2">
            <Label for="displayName"> Показвано Име <span class="text-destructive">*</span> </Label>
            <Input
              id="displayName"
              v-model="form.displayName"
              placeholder="напр. Тениски"
              :class="{ 'border-destructive': formErrors.displayName }"
            />
            <p v-if="formErrors.displayName" class="text-xs text-destructive">
              {{ formErrors.displayName }}
            </p>
          </div>

          <!-- Sizes -->
          <div class="space-y-2">
            <Label for="currentSize"> Размери <span class="text-destructive">*</span> </Label>
            <div class="flex gap-2">
              <Input
                id="currentSize"
                v-model="form.currentSize"
                placeholder="Въведете размер (напр. XS, S, M, L)"
                @keydown="handleSizeInput"
                :class="{ 'border-destructive': formErrors.sizes }"
              />
              <Button @click="addSize" type="button" variant="secondary">
                <Plus class="h-4 w-4" />
              </Button>
            </div>
            <p v-if="formErrors.sizes" class="text-xs text-destructive">
              {{ formErrors.sizes }}
            </p>
            <p class="text-xs text-muted-foreground">
              Натиснете Enter или бутона + за да добавите размер
            </p>

            <!-- Size List -->
            <div v-if="form.sizes.length > 0" class="space-y-2 mt-3">
              <p class="text-sm font-medium">Добавени Размери:</p>
              <div class="flex flex-wrap gap-2">
                <Badge
                  v-for="(size, index) in form.sizes"
                  :key="index"
                  variant="secondary"
                  class="text-sm px-3 py-1.5"
                >
                  {{ size }}
                  <button
                    @click="removeSize(index)"
                    type="button"
                    class="ml-2 hover:text-destructive"
                  >
                    <X class="h-3 w-3" />
                  </button>
                </Badge>
              </div>
            </div>
          </div>

          <!-- Image Upload Section -->
          <div class="space-y-2 border-t pt-4">
            <Label for="categoryImage">Изображение на категорията</Label>
            <div class="space-y-3">
              <!-- Image Preview -->
              <div v-if="imagePreview" class="relative">
                <Card class="overflow-hidden">
                  <img
                    :src="imagePreview"
                    alt="Category preview"
                    class="w-full h-48 object-cover"
                  />
                </Card>
                <Button
                  @click="removeImage"
                  variant="destructive"
                  size="icon"
                  class="absolute top-2 right-2"
                  type="button"
                  :disabled="isUploadingImage"
                >
                  <X class="h-4 w-4" />
                </Button>
              </div>

              <!-- Upload Input -->
              <div class="flex items-center gap-2">
                <Input
                  id="categoryImage"
                  type="file"
                  accept="image/*"
                  @change="handleImageSelect"
                  :disabled="isUploadingImage"
                  class="flex-1"
                />
                <Loader2 v-if="isUploadingImage" class="h-5 w-5 animate-spin text-muted-foreground" />
              </div>

              <p v-if="formErrors.imageUrl" class="text-xs text-destructive">
                {{ formErrors.imageUrl }}
              </p>
              <p class="text-xs text-muted-foreground">
                Препоръчителен размер: 800x600px. Максимален размер: 5MB
              </p>
            </div>
          </div>

          <!-- Shipping Properties -->
          <div class="space-y-4 border-t pt-4">
            <div>
              <h3 class="text-sm font-semibold mb-1">Параметри за доставка</h3>
              <p class="text-xs text-muted-foreground">
                Тези стойности се използват за изчисляване на цената на доставка
              </p>
            </div>

            <!-- Weight -->
            <div class="space-y-2">
              <Label for="defaultWeight">
                Тегло (kg) <span class="text-destructive">*</span>
              </Label>
              <Input
                id="defaultWeight"
                v-model.number="form.defaultWeight"
                type="number"
                step="0.001"
                min="0.001"
                placeholder="напр. 0.360"
                :class="{ 'border-destructive': formErrors.defaultWeight }"
              />
              <p v-if="formErrors.defaultWeight" class="text-xs text-destructive">
                {{ formErrors.defaultWeight }}
              </p>
              <p class="text-xs text-muted-foreground">
                Тегло на един продукт от тази категория (напр. Чанти: 0.360 kg)
              </p>
            </div>

            <!-- Dimensions -->
            <div class="space-y-2">
              <Label>
                Размери на опаковката (cm)
                <span class="text-destructive">*</span>
              </Label>
              <div class="grid grid-cols-3 gap-2">
                <div>
                  <Input
                    v-model.number="form.defaultDimensions.length"
                    type="number"
                    min="1"
                    placeholder="Дължина"
                    :class="{
                      'border-destructive': formErrors.defaultDimensions,
                    }"
                  />
                  <p class="text-xs text-muted-foreground mt-1">Дължина</p>
                </div>
                <div>
                  <Input
                    v-model.number="form.defaultDimensions.width"
                    type="number"
                    min="1"
                    placeholder="Ширина"
                    :class="{
                      'border-destructive': formErrors.defaultDimensions,
                    }"
                  />
                  <p class="text-xs text-muted-foreground mt-1">Ширина</p>
                </div>
                <div>
                  <Input
                    v-model.number="form.defaultDimensions.height"
                    type="number"
                    min="1"
                    placeholder="Височина"
                    :class="{
                      'border-destructive': formErrors.defaultDimensions,
                    }"
                  />
                  <p class="text-xs text-muted-foreground mt-1">Височина</p>
                </div>
              </div>
              <p v-if="formErrors.defaultDimensions" class="text-xs text-destructive">
                {{ formErrors.defaultDimensions }}
              </p>
              <p class="text-xs text-muted-foreground">
                Размери на кутията за един продукт (напр. Чанти: 33×25×10 cm)
              </p>
            </div>
          </div>
        </div>

        <!-- Personalization Fields Section -->
        <div class="space-y-4 border-t pt-4 mt-4">
          <div class="flex items-center justify-between">
            <div>
              <h4 class="font-medium">Персонализирани полета</h4>
              <p class="text-sm text-muted-foreground">
                Допълнителни полета за бродерия (напр. данни за бебе)
              </p>
            </div>
            <Button size="sm" variant="outline" @click="addPersonalizationField">
              <Plus class="h-3 w-3 mr-1" />
              Добави поле
            </Button>
          </div>
          
          <div v-if="form.personalizationFields.length === 0" class="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-lg">
            Няма добавени персонализирани полета
          </div>
          
          <div v-else class="space-y-3">
            <div 
              v-for="(field, index) in form.personalizationFields" 
              :key="index"
              class="p-3 border rounded-lg space-y-3 bg-muted/30"
            >
              <div class="flex items-center justify-between">
                <span class="text-sm font-medium">Поле #{{ index + 1 }}</span>
                <Button size="sm" variant="ghost" @click="removePersonalizationField(index)">
                  <Trash2 class="h-3 w-3 text-destructive" />
                </Button>
              </div>
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <Label class="text-xs">Етикет</Label>
                  <Input 
                    v-model="field.label" 
                    placeholder="Напр. Дата на раждане"
                    @blur="field.name = generateFieldName(field.label)"
                  />
                </div>
                <div>
                  <Label class="text-xs">Тип</Label>
                  <select 
                    v-model="field.type" 
                    class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="text">Текст</option>
                    <option value="number">Число</option>
                    <option value="date">Дата</option>
                    <option value="time">Час</option>
                    <option value="textarea">Текстово поле</option>
                    <option value="checkbox">Чекбокс (+цена)</option>
                  </select>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <Label class="text-xs">Placeholder</Label>
                  <Input v-model="field.placeholder" placeholder="Въведете подсказка..." :disabled="field.type === 'checkbox'" />
                </div>
                <div v-if="field.type === 'checkbox'">
                  <Label class="text-xs">Цена (+лв)</Label>
                  <Input v-model.number="field.price" type="number" min="0" step="0.01" placeholder="0.00" />
                </div>
                <div v-else class="flex items-center gap-2 pt-5">
                  <Switch v-model:checked="field.required" />
                  <Label class="text-xs">Задължително</Label>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button @click="closeDialog" variant="outline" :disabled="isSubmitting"> Отказ </Button>
          <Button @click="handleSubmit" :disabled="isSubmitting">
            <Loader2 v-if="isSubmitting" class="mr-2 h-4 w-4 animate-spin" />
            {{ isEditMode ? "Актуализирай" : "Създай" }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
