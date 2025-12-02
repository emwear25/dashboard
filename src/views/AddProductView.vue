<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Upload,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-vue-next";
import VariantStockGrid from "@/components/VariantStockGrid.vue";
import { apiGet, apiUpload } from "@/utils/api";

const router = useRouter();
const route = useRoute();

// Check if we're in edit mode
const isEditMode = computed(
  () => route.name === "products-edit" || !!route.params.id
);
const productId = computed(() => route.params.id as string | undefined);

interface Category {
  _id: string;
  name: string;
  slug: string;
  displayName: string;
  sizes: string[];
  isActive: boolean;
}

const form = reactive({
  name: "",
  description: "",
  price: "",
  category: "",
  stock: "",
  sizes: [] as string[],
  colors: [] as string[],
  customEmbroidery: false,
  embroideryFonts: [] as string[],
  embroideryColors: [] as { name: string; value: string }[],
});

// Variant stock management
interface Variant {
  size: string;
  color: string;
  stock: number;
  reserved?: number;
  lowStockThreshold?: number;
}

const variants = ref<Variant[]>([]);

// Generate variants when sizes or colors change
const generateVariants = () => {
  if (form.sizes.length === 0 || form.colors.length === 0) {
    variants.value = [];
    return;
  }

  const newVariants: Variant[] = [];
  const defaultStock = parseInt(form.stock) || 0;

  for (const size of form.sizes) {
    for (const color of form.colors) {
      // Try to find existing variant to preserve stock
      const existing = variants.value.find(
        (v) => v.size === size && v.color === color
      );

      newVariants.push({
        size,
        color,
        stock: existing?.stock ?? defaultStock,
        reserved: 0,
        lowStockThreshold: 5,
      });
    }
  }

  variants.value = newVariants;
};

const updateVariants = (updatedVariants: Variant[]) => {
  variants.value = updatedVariants;
};

const categories = ref<Category[]>([]);
const categoriesLoading = ref(true);

const availableColors = [
  { name: "Black", value: "#000000" },
  { name: "White", value: "#ffffff" },
  { name: "Red", value: "#ef4444" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Green", value: "#10b981" },
  { name: "Yellow", value: "#f59e0b" },
  { name: "Purple", value: "#8b5cf6" },
  { name: "Pink", value: "#ec4899" },
  { name: "Gray", value: "#6b7280" },
  { name: "Navy", value: "#1e40af" },
];

const isSubmitting = ref(false);
const isLoading = ref(false);
const isDragging = ref(false);
const imageFiles = ref<File[]>([]);
const imagePreviews = ref<string[]>([]);
const existingImages = ref<{ url: string; publicId: string }[]>([]);
const removedImageIds = ref<string[]>([]);
const customColor = ref("");
const newFont = ref("");
const newEmbroideryColorName = ref("");
const newEmbroideryColorValue = ref("#000000");
const fileInput = ref<HTMLInputElement>();
const errors = ref<Record<string, string>>({});
const message = ref<{ type: "success" | "error"; text: string } | null>(null);

const availableSizes = computed(() => {
  if (!form.category) return [];
  const category = categories.value.find((cat) => cat.slug === form.category);
  return category?.sizes || [];
});

const activeCategories = computed(() => {
  return categories.value.filter((cat) => cat.isActive);
});

const toggleSize = (size: string) => {
  const index = form.sizes.indexOf(size);
  if (index > -1) {
    form.sizes.splice(index, 1);
  } else {
    form.sizes.push(size);
  }
  // Regenerate variants when sizes change
  generateVariants();
  clearError("sizes");
};

const onCategoryChange = (newCategory: string) => {
  form.category = newCategory;
  // Clear sizes when category changes to prevent invalid sizes
  form.sizes = [];
  clearError("category");
};

const allImagePreviews = computed(() => {
  return [
    ...existingImages.value.filter(
      (img) => !removedImageIds.value.includes(img.publicId)
    ),
    ...imagePreviews.value,
  ];
});

const getPreviewUrl = (
  preview: string | { url: string; publicId: string }
): string => {
  return typeof preview === "string" ? preview : preview.url;
};

const toggleColor = (colorName: string) => {
  const index = form.colors.indexOf(colorName);
  if (index > -1) {
    form.colors.splice(index, 1);
  } else {
    form.colors.push(colorName);
  }
  // Regenerate variants when colors change
  generateVariants();
  clearError("colors");
};

const addCustomColor = () => {
  if (
    customColor.value.trim() &&
    !form.colors.includes(customColor.value.trim())
  ) {
    form.colors.push(customColor.value.trim());
    customColor.value = "";
    clearError("colors");
  }
};

const addFont = () => {
  if (
    newFont.value.trim() &&
    !form.embroideryFonts.includes(newFont.value.trim())
  ) {
    form.embroideryFonts.push(newFont.value.trim());
    newFont.value = "";
  }
};

const removeFont = (index: number) => {
  form.embroideryFonts.splice(index, 1);
};

const addEmbroideryColor = () => {
  if (newEmbroideryColorName.value.trim()) {
    form.embroideryColors.push({
      name: newEmbroideryColorName.value.trim(),
      value: newEmbroideryColorValue.value,
    });
    newEmbroideryColorName.value = "";
    newEmbroideryColorValue.value = "#000000";
  }
};

const removeEmbroideryColor = (index: number) => {
  form.embroideryColors.splice(index, 1);
};

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const files = Array.from(target.files || []);
  if (files.length > 0) {
    addImages(files);
  }
};

const handleDrop = (event: DragEvent) => {
  isDragging.value = false;
  const files = Array.from(event.dataTransfer?.files || []);
  const imageFiles = files.filter((file) => file.type.startsWith("image/"));
  if (imageFiles.length > 0) {
    addImages(imageFiles);
  }
};

const addImages = (files: File[]) => {
  // Check if adding these files would exceed the limit (including existing images)
  const totalImages = allImagePreviews.value.length;
  if (totalImages + files.length > 5) {
    showMessage("error", "Можете да качите максимум 5 снимки общо");
    return;
  }

  // Check file types and sizes
  const validTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
  ];

  for (const file of files) {
    if (!validTypes.includes(file.type)) {
      showMessage(
        "error",
        "Моля, качете валидни файлове с изображения (JPEG, PNG, GIF, WEBP)"
      );
      return;
    }

    // Check file size (5MB limit per file)
    if (file.size > 5 * 1024 * 1024) {
      showMessage(
        "error",
        "Размерът на файла е твърде голям. Максималният размер е 5MB на файл"
      );
      return;
    }
  }

  // Add files and generate previews
  files.forEach((file) => {
    imageFiles.value.push(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      imagePreviews.value.push(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  });

  clearError("image");
};

const removeImage = (index: number) => {
  const remainingExisting = existingImages.value.filter(
    (img) => !removedImageIds.value.includes(img.publicId)
  );
  const existingCount = remainingExisting.length;

  if (index < existingCount) {
    // Removing existing image
    const imageToRemove = remainingExisting[index];
    if (imageToRemove) {
      removedImageIds.value.push(imageToRemove.publicId);
    }
  } else {
    // Removing new image
    const newImageIndex = index - existingCount;
    imageFiles.value.splice(newImageIndex, 1);
    imagePreviews.value.splice(newImageIndex, 1);
  }

  if (allImagePreviews.value.length === 0 && fileInput.value) {
    fileInput.value.value = "";
  }
};

const removeAllImages = () => {
  imageFiles.value = [];
  imagePreviews.value = [];
  removedImageIds.value = existingImages.value.map((img) => img.publicId);
  if (fileInput.value) {
    fileInput.value.value = "";
  }
};

const clearError = (field: string) => {
  if (errors.value[field]) {
    const { [field]: _, ...rest } = errors.value;
    errors.value = rest;
  }
};

const validateForm = () => {
  errors.value = {};

  if (!form.name.trim()) {
    errors.value.name = "Името на продукта е задължително";
  }

  if (!form.description.trim()) {
    errors.value.description = "Описанието е задължително";
  }

  if (!form.price || parseFloat(form.price) <= 0) {
    errors.value.price = "Валидна цена е задължителна";
  }

  if (!form.category) {
    errors.value.category = "Категорията е задължителна";
  }

  if (!form.stock || parseInt(form.stock) < 0) {
    errors.value.stock = "Валидно количество на склад е задължително";
  }

  if (form.sizes.length === 0) {
    errors.value.sizes = "Поне един размер е задължителен";
  }

  // Colors are optional for bags category
  const isBagsCategory = form.category === "bags";
  if (!isBagsCategory && form.colors.length === 0) {
    errors.value.colors = "Поне един цвят е задължителен";
  }

  // Images are optional in edit mode if existing images remain
  const remainingExistingImages = existingImages.value.filter(
    (img) => !removedImageIds.value.includes(img.publicId)
  ).length;
  if (remainingExistingImages === 0 && imageFiles.value.length === 0) {
    errors.value.image = "Поне една снимка на продукта е задължителна";
  }

  return Object.keys(errors.value).length === 0;
};

const showMessage = (type: "success" | "error", text: string) => {
  message.value = { type, text };
  setTimeout(() => {
    message.value = null;
  }, 5000);
};

const fetchCategories = async () => {
  try {
    categoriesLoading.value = true;
    const data = await apiGet("categories?active=true");

    if (data.success) {
      categories.value = data.data;
    } else {
      console.error("Неуспешно зареждане на категориите:", data.message);
    }
  } catch (error) {
    console.error("Грешка при зареждане на категориите:", error);
  } finally {
    categoriesLoading.value = false;
  }
};

const fetchProduct = async () => {
  if (!productId.value) return;

  isLoading.value = true;
  try {
    const result = await apiGet(`products/${productId.value}`);
    if (result.success && result.data) {
      const product = result.data;

      // Populate form with product data
      form.name = product.name || "";
      form.description = product.description || "";
      form.price = product.price?.toString() || "";
      form.stock = product.stock?.toString() || "";
      form.customEmbroidery = product.customEmbroidery || false;

      // Handle category (can be object or string)
      if (typeof product.category === "object" && product.category?.slug) {
        form.category = product.category.slug;
      } else if (typeof product.category === "string") {
        form.category = product.category;
      }

      form.sizes = Array.isArray(product.sizes) ? [...product.sizes] : [];
      form.colors = Array.isArray(product.colors) ? [...product.colors] : [];
      form.embroideryFonts = Array.isArray(product.embroideryFonts)
        ? [...product.embroideryFonts]
        : [];
      form.embroideryColors = Array.isArray(product.embroideryColors)
        ? [...product.embroideryColors]
        : [];

      // Set existing images
      if (Array.isArray(product.images) && product.images.length > 0) {
        existingImages.value = [...product.images];
      }
    } else {
      throw new Error("Неуспешно зареждане на продукта");
    }
  } catch (error) {
    showMessage(
      "error",
      error instanceof Error
        ? error.message
        : "Грешка при зареждане на продукта"
    );
    setTimeout(() => {
      router.push("/products");
    }, 2000);
  } finally {
    isLoading.value = false;
  }
};

const translateErrorMessage = (msg: string): string => {
  const translations: Record<string, string> = {
    "Product name is required": "Името на продукта е задължително",
    "Description is required": "Описанието е задължително",
    "Valid price is required": "Валидна цена е задължителна",
    "Category is required": "Категорията е задължителна",
    "At least one size is required": "Поне един размер е задължителен",
    "At least one color is required": "Поне един цвят е задължителен",
    "Product image is required": "Снимката на продукта е задължителна",
    "Image size must be less than 5MB":
      "Размерът на снимката трябва да бъде по-малък от 5MB",
    "Failed to fetch products": "Неуспешно зареждане на продукти",
    "Failed to create product": "Неуспешно създаване на продукт",
    "Failed to update product": "Неуспешно актуализиране на продукт",
    "Product not found": "Продуктът не е намерен",
    "Unable to connect to server. Please check your connection.":
      "Не може да се свърже със сървъра. Моля, проверете връзката си.",
    "File too large. Please choose a smaller image.":
      "Файлът е твърде голям. Моля, изберете по-малка снимка.",
    "Failed to create product. Please try again.":
      "Неуспешно създаване на продукт. Моля, опитайте отново.",
    "Failed to update product. Please try again.":
      "Неуспешно актуализиране на продукт. Моля, опитайте отново.",
  };
  return translations[msg] || msg;
};

const resetForm = () => {
  form.name = "";
  form.description = "";
  form.price = "";
  form.category = "";
  form.stock = "";
  form.sizes = [];
  form.colors = [];
  form.customEmbroidery = false;
  form.embroideryFonts = [];
  form.embroideryColors = [];

  imageFiles.value = [];
  imagePreviews.value = [];
  existingImages.value = [];
  removedImageIds.value = [];
  customColor.value = "";
  newFont.value = "";
  newEmbroideryColorName.value = "";
  newEmbroideryColorValue.value = "#000000";
  errors.value = {};

  if (fileInput.value) {
    fileInput.value.value = "";
  }
};

const submitForm = async () => {
  if (!validateForm()) {
    showMessage("error", "Моля, коригирайте грешките по-долу");
    return;
  }

  isSubmitting.value = true;

  try {
    const formData = new FormData();

    formData.append("name", form.name.trim());
    formData.append("description", form.description.trim());
    formData.append("price", form.price.toString());
    formData.append("category", form.category);
    formData.append("stock", form.stock.toString());

    formData.append("sizes", JSON.stringify(form.sizes));
    formData.append("colors", JSON.stringify(form.colors));
    formData.append("customEmbroidery", form.customEmbroidery.toString());

    if (form.customEmbroidery) {
      formData.append("embroideryFonts", JSON.stringify(form.embroideryFonts));
      formData.append(
        "embroideryColors",
        JSON.stringify(form.embroideryColors)
      );
    }

    // Append new images
    imageFiles.value.forEach((file) => {
      formData.append("images", file, file.name);
    });

    // Handle existing images in edit mode
    if (isEditMode.value) {
      const remainingExisting = existingImages.value.filter(
        (img) => !removedImageIds.value.includes(img.publicId)
      );

      if (imageFiles.value.length > 0 && remainingExisting.length > 0) {
        // New images + keeping some existing
        formData.append("keepExistingImages", "true");
      } else if (
        imageFiles.value.length === 0 &&
        remainingExisting.length > 0
      ) {
        // Only keeping existing, no new images
        formData.append("keepExistingImages", "true");
      }

      // Send removed image IDs
      if (removedImageIds.value.length > 0) {
        formData.append(
          "removedImageIds",
          JSON.stringify(removedImageIds.value)
        );
      }
    }

    let result;
    try {
      if (isEditMode.value) {
        result = await apiUpload(`products/${productId.value}`, formData);
      } else {
        result = await apiUpload("products", formData);
      }
    } catch {
      throw new Error("Invalid response from server");
    }

    if (result.success) {
      showMessage(
        "success",
        isEditMode.value
          ? "Продуктът е актуализиран успешно!"
          : "Продуктът е създаден успешно!"
      );

      if (!isEditMode.value) {
        resetForm();
      }

      setTimeout(() => {
        router.push("/products");
      }, 2000);
    } else {
      if (result.errors && Array.isArray(result.errors)) {
        const errorMessages = result.errors
          .map(
            (err: { message?: string; msg?: string }) => err.message || err.msg
          )
          .join(", ");
        throw new Error(errorMessages);
      } else {
        throw new Error(result.message || "Server error occurred");
      }
    }
  } catch (error: unknown) {
    console.error("Error creating product:", error);

    if (
      error instanceof Error &&
      error.name === "TypeError" &&
      error.message.includes("fetch")
    ) {
      showMessage(
        "error",
        "Не може да се свърже със сървъра. Моля, проверете връзката си."
      );
    } else if (error instanceof Error && error.message.includes("413")) {
      showMessage(
        "error",
        "Файлът е твърде голям. Моля, изберете по-малка снимка."
      );
    } else {
      showMessage(
        "error",
        error instanceof Error
          ? translateErrorMessage(error.message)
          : isEditMode.value
            ? "Неуспешно актуализиране на продукт. Моля, опитайте отново."
            : "Неуспешно създаване на продукт. Моля, опитайте отново."
      );
    }
  } finally {
    isSubmitting.value = false;
  }
};

onMounted(async () => {
  // Fetch categories on mount
  await fetchCategories();

  // If in edit mode, fetch product data
  if (isEditMode.value && productId.value) {
    await fetchProduct();
  }

  const handleDragEnter = () => {
    isDragging.value = true;
  };

  const handleDragLeave = (event: DragEvent) => {
    if (!event.relatedTarget) {
      isDragging.value = false;
    }
  };

  document.addEventListener("dragenter", handleDragEnter);
  document.addEventListener("dragleave", handleDragLeave);

  onUnmounted(() => {
    document.removeEventListener("dragenter", handleDragEnter);
    document.removeEventListener("dragleave", handleDragLeave);
  });
});
</script>

<template>
  <div class="max-w-7xl mx-auto space-y-8">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        <Button variant="outline" size="icon" @click="router.back()">
          <ArrowLeft class="h-4 w-4" />
        </Button>
        <div>
          <h1 class="text-3xl font-bold tracking-tight">
            {{ isEditMode ? "Редактирай Продукт" : "Добави Нов Продукт" }}
          </h1>
          <p class="text-sm text-muted-foreground mt-1">
            {{
              isEditMode
                ? "Актуализирайте информацията за продукта"
                : "Попълнете информацията по-долу, за да създадете нов продукт"
            }}
          </p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <Button type="button" variant="outline" @click="router.back()">
          Откажи
        </Button>
        <Button
          type="submit"
          :disabled="isSubmitting || isLoading"
          @click="submitForm"
        >
          <Loader2 v-if="isSubmitting" class="mr-2 h-4 w-4 animate-spin" />
          {{
            isSubmitting
              ? isEditMode
                ? "Актуализация..."
                : "Създаване..."
              : isEditMode
                ? "Актуализирай Продукт"
                : "Създай Продукт"
          }}
        </Button>
      </div>
    </div>

    <!-- Loading State for Edit Mode -->
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <div class="text-center">
        <Loader2 class="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
        <p class="text-lg text-muted-foreground">Зареждане на продукт...</p>
      </div>
    </div>

    <form v-else @submit.prevent="submitForm" class="space-y-6">
      <div class="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div class="lg:col-span-3 space-y-6">
          <Card>
            <CardHeader class="pb-4">
              <div class="flex items-center gap-2">
                <div class="h-8 w-1 bg-primary rounded-full"></div>
                <div>
                  <CardTitle class="text-lg">Детайли за Продукта</CardTitle>
                  <CardDescription class="text-xs">
                    Основна информация за продукта
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent class="space-y-6">
              <div class="grid grid-cols-1 gap-6">
                <div class="space-y-2">
                  <Label for="name" class="text-sm font-medium"
                    >Име на Продукта
                    <span class="text-destructive">*</span></Label
                  >
                  <Input
                    id="name"
                    v-model="form.name"
                    type="text"
                    placeholder="напр., Премиум Памучна Тениска"
                    class="h-11"
                    :class="{ 'border-destructive': errors.name }"
                  />
                  <p v-if="errors.name" class="text-xs text-destructive mt-1">
                    {{ errors.name }}
                  </p>
                </div>

                <div class="space-y-2">
                  <Label for="description" class="text-sm font-medium"
                    >Описание <span class="text-destructive">*</span></Label
                  >
                  <Textarea
                    id="description"
                    v-model="form.description"
                    rows="5"
                    placeholder="Опишете характеристиките, материалите и основните продажбени точки на продукта..."
                    class="resize-none"
                    :class="{ 'border-destructive': errors.description }"
                  />
                  <p
                    v-if="errors.description"
                    class="text-xs text-destructive mt-1"
                  >
                    {{ errors.description }}
                  </p>
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <div class="space-y-2">
                    <Label for="price" class="text-sm font-medium"
                      >Цена (BGN) <span class="text-destructive">*</span></Label
                    >
                    <div class="relative">
                      <span
                        class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      >
                        лв.
                      </span>
                      <Input
                        id="price"
                        v-model="form.price"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        class="h-11 pl-9"
                        :class="{ 'border-destructive': errors.price }"
                      />
                    </div>
                    <p
                      v-if="errors.price"
                      class="text-xs text-destructive mt-1"
                    >
                      {{ errors.price }}
                    </p>
                    <p class="text-xs text-muted-foreground mt-1">
                      За отстъпки използвайте страницата "Отстъпки"
                    </p>
                  </div>

                  <div class="space-y-2">
                    <Label for="category" class="text-sm font-medium"
                      >Категория <span class="text-destructive">*</span></Label
                    >
                    <Select
                      :model-value="form.category"
                      @update:model-value="onCategoryChange"
                      :disabled="categoriesLoading"
                    >
                      <SelectTrigger
                        class="h-11"
                        :class="{ 'border-destructive': errors.category }"
                      >
                        <SelectValue
                          :placeholder="
                            categoriesLoading
                              ? 'Зареждане на категории...'
                              : 'Избери категория'
                          "
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem
                          v-for="category in activeCategories"
                          :key="category._id"
                          :value="category.slug"
                        >
                          {{ category.displayName }}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p
                      v-if="errors.category"
                      class="text-xs text-destructive mt-1"
                    >
                      {{ errors.category }}
                    </p>
                  </div>
                </div>

                <div class="space-y-2">
                  <Label for="stock" class="text-sm font-medium"
                    >Начална Наличност (по подразбиране)
                    <span class="text-destructive">*</span></Label
                  >
                  <Input
                    id="stock"
                    v-model="form.stock"
                    type="number"
                    min="0"
                    placeholder="0"
                    class="h-11"
                    :class="{ 'border-destructive': errors.stock }"
                  />
                  <p class="text-xs text-muted-foreground mt-1">
                    Това количество ще се приложи към всички варианти. Можете да
                    промените наличността за всеки вариант отделно в секцията
                    "Наличност по Варианти" по-долу.
                  </p>
                  <p v-if="errors.stock" class="text-xs text-destructive mt-1">
                    {{ errors.stock }}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader class="pb-4">
              <div class="flex items-center gap-2">
                <div class="h-8 w-1 bg-primary rounded-full"></div>
                <div>
                  <CardTitle class="text-lg">Варианти на Продукта</CardTitle>
                  <CardDescription class="text-xs">
                    Конфигурирайте налични размери и цветове
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent class="space-y-6">
              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <Label class="text-sm font-medium"
                    >Налични Размери
                    <span class="text-destructive">*</span></Label
                  >
                  <span class="text-xs text-muted-foreground">
                    {{ form.sizes.length }} избрани
                  </span>
                </div>
                <div
                  v-if="!form.category"
                  class="text-sm text-muted-foreground p-4 bg-muted/30 rounded-lg text-center"
                >
                  Моля, изберете категория първо, за да видите наличните размери
                </div>
                <div
                  v-else-if="availableSizes.length === 0"
                  class="text-sm text-muted-foreground p-4 bg-muted/30 rounded-lg text-center"
                >
                  Няма налични размери за тази категория
                </div>
                <div
                  v-else
                  :class="
                    form.category === 'bags'
                      ? 'grid grid-cols-1'
                      : 'grid grid-cols-6 gap-2'
                  "
                >
                  <Button
                    v-for="size in availableSizes"
                    :key="size"
                    type="button"
                    @click="toggleSize(size)"
                    :variant="form.sizes.includes(size) ? 'default' : 'outline'"
                    class="h-11 font-semibold"
                    :class="{
                      'ring-2 ring-primary ring-offset-2':
                        form.sizes.includes(size),
                    }"
                  >
                    {{ size }}
                  </Button>
                </div>
                <p v-if="errors.sizes" class="text-xs text-destructive mt-1">
                  {{ errors.sizes }}
                </p>
              </div>

              <div class="h-px bg-border"></div>

              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <Label class="text-sm font-medium"
                    >Налични Цветове
                    <span class="text-destructive">*</span></Label
                  >
                  <span class="text-xs text-muted-foreground">
                    {{ form.colors.length }} избрани
                  </span>
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <Button
                    v-for="color in availableColors"
                    :key="color.name"
                    type="button"
                    @click="toggleColor(color.name)"
                    :variant="
                      form.colors.includes(color.name) ? 'default' : 'outline'
                    "
                    class="gap-2 h-11 justify-start"
                    :class="{
                      'ring-2 ring-primary ring-offset-2': form.colors.includes(
                        color.name
                      ),
                    }"
                  >
                    <div
                      class="w-4 h-4 rounded-full border-2 border-background shadow-sm"
                      :style="{ backgroundColor: color.value }"
                    ></div>
                    <span class="text-sm">{{ color.name }}</span>
                  </Button>
                </div>
                <div class="flex items-center gap-2 pt-2">
                  <Input
                    v-model="customColor"
                    type="text"
                    placeholder="Добавете персонализирано име на цвят"
                    class="flex-1 h-10"
                  />
                  <Button
                    type="button"
                    @click="addCustomColor"
                    :disabled="!customColor.trim()"
                    variant="secondary"
                    class="h-10"
                  >
                    Добави
                  </Button>
                </div>
                <p v-if="errors.colors" class="text-xs text-destructive mt-1">
                  {{ errors.colors }}
                </p>
              </div>
            </CardContent>
          </Card>

          <!-- Variant Stock Grid -->
          <Card v-if="variants.length > 0">
            <CardHeader class="pb-4">
              <div class="flex items-center gap-2">
                <div class="h-8 w-1 bg-primary rounded-full"></div>
                <div>
                  <CardTitle class="text-lg">Наличност по Варианти</CardTitle>
                  <CardDescription class="text-xs">
                    Задайте начална наличност за всяка комбинация размер/цвят
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <VariantStockGrid
                v-if="form.sizes.length > 0 && form.colors.length > 0"
                :variants="variants"
                :sizes="form.sizes"
                :colors="form.colors"
                :base-price="parseFloat(form.price) || 0"
                @update="updateVariants"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader class="pb-4">
              <div class="flex items-center gap-2">
                <div class="h-8 w-1 bg-primary rounded-full"></div>
                <div>
                  <CardTitle class="text-lg">Опции за Бродерия</CardTitle>
                  <CardDescription class="text-xs">
                    Добавете настройки за персонализирана бродерия
                    (незадължително)
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent class="space-y-4">
              <div
                class="flex items-center justify-between p-4 rounded-lg border bg-muted/30"
              >
                <div class="space-y-0.5">
                  <Label
                    for="embroidered"
                    class="text-sm font-medium cursor-pointer"
                    >Активирай Бродерия</Label
                  >
                  <p class="text-xs text-muted-foreground">
                    Позволете на клиентите да добавят персонализирана бродерия
                  </p>
                </div>
                <Switch
                  id="embroidered"
                  v-model:checked="form.customEmbroidery"
                />
              </div>

              <div
                v-if="form.customEmbroidery"
                class="space-y-4 rounded-lg border border-gray-200 p-4"
              >
                <h4 class="text-sm font-semibold text-gray-900 mb-3">
                  Опции за Бродерия
                </h4>

                <!-- Available Fonts -->
                <div class="space-y-2">
                  <Label class="text-sm font-medium">Налични Шрифтове</Label>
                  <div class="flex flex-wrap gap-2 mb-2">
                    <Badge
                      v-for="(font, index) in form.embroideryFonts"
                      :key="index"
                      variant="secondary"
                      class="cursor-pointer hover:bg-red-100"
                      @click="removeFont(index)"
                    >
                      {{ font }}
                      <X class="ml-1 h-3 w-3" />
                    </Badge>
                  </div>
                  <div class="flex gap-2">
                    <Input
                      v-model="newFont"
                      type="text"
                      placeholder="напр., Arial, Times New Roman, Script"
                      class="h-10 flex-1"
                      @keyup.enter="addFont"
                    />
                    <Button type="button" @click="addFont" size="sm">
                      Добави
                    </Button>
                  </div>
                </div>

                <!-- Available Embroidery Colors -->
                <div class="space-y-2">
                  <Label class="text-sm font-medium"
                    >Налични Цветове за Бродерия</Label
                  >
                  <div class="flex flex-wrap gap-2 mb-2">
                    <Badge
                      v-for="(color, index) in form.embroideryColors"
                      :key="index"
                      variant="secondary"
                      class="cursor-pointer hover:bg-red-100 flex items-center gap-2"
                      @click="removeEmbroideryColor(index)"
                    >
                      <span
                        class="w-4 h-4 rounded-full border border-gray-300"
                        :style="{ background: color.value }"
                      ></span>
                      {{ color.name }}
                      <X class="ml-1 h-3 w-3" />
                    </Badge>
                  </div>
                  <div class="flex gap-2">
                    <Input
                      v-model="newEmbroideryColorName"
                      type="text"
                      placeholder="Име (напр., Черен)"
                      class="h-10 flex-1"
                    />
                    <Input
                      v-model="newEmbroideryColorValue"
                      type="color"
                      class="h-10 w-20"
                    />
                    <Button type="button" @click="addEmbroideryColor" size="sm">
                      Добави
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div class="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader class="pb-4">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="h-8 w-1 bg-primary rounded-full"></div>
                  <div>
                    <CardTitle class="text-lg">Снимки на Продукта</CardTitle>
                    <CardDescription class="text-xs">
                      Качете до 5 висококачествени снимки ({{
                        allImagePreviews.length
                      }}/5)
                    </CardDescription>
                  </div>
                </div>
                <Button
                  v-if="allImagePreviews.length > 0"
                  @click="removeAllImages"
                  variant="ghost"
                  size="sm"
                  type="button"
                >
                  Изчисти Всички
                </Button>
              </div>
            </CardHeader>
            <CardContent class="space-y-4">
              <!-- Image Previews Grid -->
              <div
                v-if="allImagePreviews.length > 0"
                class="grid grid-cols-2 md:grid-cols-3 gap-4"
              >
                <div
                  v-for="(preview, index) in allImagePreviews"
                  :key="index"
                  class="relative group aspect-square"
                >
                  <img
                    :src="getPreviewUrl(preview)"
                    :alt="`Product preview ${index + 1}`"
                    class="w-full h-full object-contain rounded-lg border-2 border-border bg-muted"
                  />
                  <div
                    class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center"
                  >
                    <Button
                      type="button"
                      @click="removeImage(index)"
                      variant="destructive"
                      size="icon"
                    >
                      <X class="h-4 w-4" />
                    </Button>
                  </div>
                  <div
                    v-if="index === 0"
                    class="absolute top-2 left-2 bg-primary text-primary-foreground text-xs font-medium px-2 py-1 rounded"
                  >
                    Главна
                  </div>
                </div>
              </div>

              <!-- Upload Area -->
              <div
                v-if="allImagePreviews.length < 5"
                @drop.prevent="handleDrop"
                @dragover.prevent
                @dragenter.prevent
                class="border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer hover:border-primary/50 hover:bg-primary/5"
                :class="
                  isDragging
                    ? 'border-primary bg-primary/10 scale-105'
                    : 'border-muted-foreground/25'
                "
              >
                <div
                  class="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3"
                >
                  <Upload class="w-6 h-6 text-primary" />
                </div>
                <h3 class="text-sm font-medium mb-2">
                  {{
                    allImagePreviews.length > 0
                      ? "Добави още снимки"
                      : "Качване на Снимки"
                  }}
                </h3>
                <p class="text-xs text-muted-foreground mb-4">
                  Плъзнете и пуснете снимки тук или кликнете за избор
                </p>
                <label class="inline-block cursor-pointer">
                  <span
                    class="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
                  >
                    <Upload class="h-3.5 w-3.5" />
                    Избери Файлове
                  </span>
                  <input
                    ref="fileInput"
                    type="file"
                    accept="image/*"
                    multiple
                    @change="handleFileSelect"
                    class="hidden"
                  />
                </label>
                <p class="text-xs text-muted-foreground mt-4">
                  Поддържани: PNG, JPG • Макс. размер: 5MB
                </p>
              </div>
              <p
                v-if="errors.image"
                class="text-xs text-destructive flex items-center gap-1"
              >
                <AlertCircle class="h-3 w-3" />
                {{ errors.image }}
              </p>
            </CardContent>
          </Card>

          <Card class="bg-muted/30">
            <CardHeader class="pb-3">
              <CardTitle class="text-sm font-medium">Бързи Съвети</CardTitle>
            </CardHeader>
            <CardContent>
              <ul class="space-y-2 text-xs text-muted-foreground">
                <li class="flex items-start gap-2">
                  <div class="w-1.5 h-1.5 rounded-full bg-primary mt-1.5"></div>
                  <span
                    >Използвайте изображения с висока резолюция (мин
                    800x800px)</span
                  >
                </li>
                <li class="flex items-start gap-2">
                  <div class="w-1.5 h-1.5 rounded-full bg-primary mt-1.5"></div>
                  <span
                    >Осигурете добро осветление и ясна видимост на
                    продукта</span
                  >
                </li>
                <li class="flex items-start gap-2">
                  <div class="w-1.5 h-1.5 rounded-full bg-primary mt-1.5"></div>
                  <span>Изберете всички приложими размери и цветове</span>
                </li>
                <li class="flex items-start gap-2">
                  <div class="w-1.5 h-1.5 rounded-full bg-primary mt-1.5"></div>
                  <span>Напишете ясни, описателни детайли за продукта</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>

    <div
      v-if="message"
      class="fixed bottom-6 right-6 z-50 max-w-md animate-in slide-in-from-bottom-5"
    >
      <Card
        class="shadow-lg border-2"
        :class="
          message.type === 'success'
            ? 'border-green-500 bg-green-50 dark:bg-green-950'
            : 'border-destructive bg-destructive/10'
        "
      >
        <CardContent class="p-4">
          <div class="flex items-start gap-3">
            <div
              class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              :class="
                message.type === 'success'
                  ? 'bg-green-100 dark:bg-green-900'
                  : 'bg-destructive/20'
              "
            >
              <CheckCircle
                v-if="message.type === 'success'"
                class="h-5 w-5 text-green-600 dark:text-green-400"
              />
              <AlertCircle v-else class="h-5 w-5 text-destructive" />
            </div>
            <div class="flex-1 pt-0.5">
              <p
                class="text-sm font-semibold mb-0.5"
                :class="
                  message.type === 'success'
                    ? 'text-green-900 dark:text-green-100'
                    : 'text-destructive'
                "
              >
                {{ message.type === "success" ? "Успешно!" : "Грешка" }}
              </p>
              <p
                class="text-sm"
                :class="
                  message.type === 'success'
                    ? 'text-green-700 dark:text-green-300'
                    : 'text-destructive/90'
                "
              >
                {{ message.text }}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
