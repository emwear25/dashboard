<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ArrowLeft, Upload, X, Loader2, CheckCircle, AlertCircle } from "lucide-vue-next";
import VariantStockGrid from "@/components/VariantStockGrid.vue";
import { apiGet, apiUpload } from "@/utils/api";

const router = useRouter();
const route = useRoute();

interface Category {
  _id: string;
  name: string;
  slug: string;
  displayName: string;
  sizes: string[];
  isActive: boolean;
}

interface ProductImage {
  url: string;
  publicId: string;
}

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  compareAt?: number | null;
  category: string | { _id: string; slug: string; displayName: string };
  stock: number;
  sizes: string[];
  colors: string[];
  customEmbroidery: boolean;
  embroideryFonts: string[];
  embroideryColors: { name: string; value: string }[];
  images?: ProductImage[];
  isActive: boolean;
}

const form = reactive({
  name: "",
  description: "",
  price: "",
  compareAt: "",
  category: "",
  stock: "",
  sizes: [] as string[],
  colors: [] as { name: string; hex: string }[],
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
      const colorName = typeof color === 'string' ? color : color.name;
      // Try to find existing variant to preserve stock
      const existing = variants.value.find((v) => v.size === size && v.color === colorName);

      newVariants.push({
        size,
        color: colorName,
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
const isLoading = ref(true);
const productId = ref<string>("");

const defaultColors = [
  { name: "Black", displayName: "Черен", value: "#000000" },
  { name: "White", displayName: "Бял", value: "#ffffff" },
  { name: "Beige", displayName: "Бежово", value: "#F5F5DC" },
  { name: "Red", displayName: "Червен", value: "#ef4444" },
  { name: "Blue", displayName: "Син", value: "#3b82f6" },
  { name: "Green", displayName: "Зелен", value: "#10b981" },
  { name: "Yellow", displayName: "Жълт", value: "#f59e0b" },
  { name: "Purple", displayName: "Лилав", value: "#8b5cf6" },
  { name: "Pink", displayName: "Розов", value: "#ec4899" },
  { name: "Gray", displayName: "Сив", value: "#6b7280" },
  { name: "Navy", displayName: "Морско синьо", value: "#1e40af" },
];

// Load custom colors from localStorage
const savedCustomColors = ref<{ name: string; displayName: string; value: string }[]>([]);

const loadSavedColors = () => {
  try {
    const saved = localStorage.getItem('customProductColors');
    if (saved) {
      savedCustomColors.value = JSON.parse(saved);
    }
  } catch (e) {
    console.error('Error loading saved colors:', e);
  }
};

const saveCustomColor = (name: string, hex: string) => {
  const exists = savedCustomColors.value.some(
    c => c.name.toLowerCase() === name.toLowerCase()
  );
  if (!exists) {
    savedCustomColors.value.push({ name, displayName: name, value: hex });
    localStorage.setItem('customProductColors', JSON.stringify(savedCustomColors.value));
  }
};

// Merge default + custom colors
const availableColors = computed(() => [
  ...defaultColors,
  ...savedCustomColors.value
]);

// Helper function to get display name for a color
const getColorDisplayName = (colorName: string): string => {
  const color = availableColors.value.find((c) => c.name === colorName);
  return color?.displayName || colorName;
};

const isSubmitting = ref(false);
const isDragging = ref(false);
const imageFiles = ref<File[]>([]);
const imagePreviews = ref<string[]>([]);
const existingImages = ref<ProductImage[]>([]);
const removedImageIds = ref<string[]>([]);
const customColor = ref("");
const customColorHex = ref("#9CA3AF");
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

const allImagePreviews = computed(() => {
  return [
    ...existingImages.value.filter((img) => !removedImageIds.value.includes(img.publicId)),
    ...imagePreviews.value,
  ];
});

const getPreviewUrl = (preview: string | { url: string; publicId: string }): string => {
  return typeof preview === "string" ? preview : preview.url;
};

const toggleSize = (size: string) => {
  const index = form.sizes.indexOf(size);
  if (index > -1) {
    form.sizes.splice(index, 1);
  } else {
    form.sizes.push(size);
  }
  generateVariants();
  clearError("sizes");
};

const onCategoryChange = (newCategory: string) => {
  form.category = newCategory;
  // Clear sizes when category changes to prevent invalid sizes
  form.sizes = [];
  clearError("category");
};

const toggleColor = (colorName: string, colorHex: string) => {
  const index = form.colors.findIndex((c) => (typeof c === 'string' ? c : c.name) === colorName);
  if (index > -1) {
    form.colors.splice(index, 1);
  } else {
    form.colors.push({ name: colorName, hex: colorHex });
  }
  generateVariants();
  clearError("colors");
};

const addCustomColor = () => {
  if (customColor.value.trim()) {
    const colorName = customColor.value.trim();
    const exists = form.colors.some((c) => (typeof c === 'string' ? c : c.name) === colorName);
    if (!exists) {
      form.colors.push({ name: colorName, hex: customColorHex.value });
      // Save custom color to localStorage for future use
      saveCustomColor(colorName, customColorHex.value);
      customColor.value = "";
      customColorHex.value = "#9CA3AF";
      generateVariants();
      clearError("colors");
    }
    clearError("colors");
  }
};

const addFont = () => {
  if (newFont.value.trim() && !form.embroideryFonts.includes(newFont.value.trim())) {
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
  event.preventDefault();
  isDragging.value = false;
  const files = Array.from(event.dataTransfer?.files || []);
  const imageFiles = files.filter((file) => file.type.startsWith("image/"));
  if (imageFiles.length > 0) {
    addImages(imageFiles);
  }
};

const addImages = (files: File[]) => {
  const totalImages = allImagePreviews.value.length;
  if (totalImages + files.length > 5) {
    showMessage("error", "Можете да качите максимум 5 снимки общо");
    return;
  }

  const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];

  for (const file of files) {
    if (!validTypes.includes(file.type)) {
      showMessage("error", "Моля, качете валидни файлове с изображения (JPEG, PNG, GIF, WEBP)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showMessage("error", "Размерът на файла е твърде голям. Максималният размер е 5MB на файл");
      return;
    }
  }

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
  removedImageIds.value = [];
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

  // Sizes are now optional - not all products need sizes (accessories, decorative items, etc.)
  // if (form.sizes.length === 0) {
  //   errors.value.sizes = "Поне един размер е задължителен";
  // }

  // Colors are optional for all categories

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
  isLoading.value = true;
  try {
    const result = await apiGet(`products/${productId.value}`);
    if (result.success && result.data) {
      const product = result.data;

      // Populate form with product data
      form.name = product.name || "";
      form.description = product.description || "";
      form.price = product.price?.toString() || "";
      form.compareAt = product.compareAt?.toString() || "";
      form.stock = product.stock?.toString() || "";
      form.customEmbroidery = product.customEmbroidery || false;

      // Handle category (can be object or string)
      if (typeof product.category === "object" && product.category?.slug) {
        form.category = product.category.slug;
      } else if (typeof product.category === "string") {
        form.category = product.category;
      }

      form.sizes = Array.isArray(product.sizes) ? [...product.sizes] : [];
      // Handle colors - convert string format to object format if needed
      if (Array.isArray(product.colors) && product.colors.length > 0) {
        form.colors = product.colors.map((color: any) => {
          if (typeof color === 'string') {
            // Old format: convert string to object with default hex
            const colorHexMap: Record<string, string> = {
              black: "#000000",
              white: "#ffffff",
              red: "#ef4444",
              blue: "#3b82f6",
              green: "#10b981",
              yellow: "#f59e0b",
              purple: "#8b5cf6",
              pink: "#ec4899",
              gray: "#6b7280",
              grey: "#6b7280",
              navy: "#1e40af",
            };
            return {
              name: color,
              hex: colorHexMap[color.toLowerCase()] || "#9CA3AF",
            };
          }
          // New format: already an object, ensure it has hex
          return {
            name: color.name || color,
            hex: color.hex || "#9CA3AF",
          };
        });
      } else {
        form.colors = [];
      }
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
      error instanceof Error ? error.message : "Грешка при зареждане на продукта"
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
    "Image size must be less than 5MB": "Размерът на снимката трябва да бъде по-малък от 5MB",
    "Failed to fetch products": "Неуспешно зареждане на продукти",
    "Failed to update product": "Неуспешно актуализиране на продукт",
    "Product not found": "Продуктът не е намерен",
    "Unable to connect to server. Please check your connection.":
      "Не може да се свърже със сървъра. Моля, проверете връзката си.",
    "File too large. Please choose a smaller image.":
      "Файлът е твърде голям. Моля, изберете по-малка снимка.",
    "Failed to update product. Please try again.":
      "Неуспешно актуализиране на продукт. Моля, опитайте отново.",
  };
  return translations[msg] || msg;
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
      formData.append("embroideryColors", JSON.stringify(form.embroideryColors));
    }

    if (form.compareAt) {
      formData.append("compareAt", form.compareAt.toString());
    }

    // Append new images
    imageFiles.value.forEach((file) => {
      formData.append("images", file, file.name);
    });

    // Handle existing images
    const remainingExisting = existingImages.value.filter(
      (img) => !removedImageIds.value.includes(img.publicId)
    );

    if (imageFiles.value.length > 0 && remainingExisting.length > 0) {
      // New images + keeping some existing
      formData.append("keepExistingImages", "true");
    } else if (imageFiles.value.length === 0 && remainingExisting.length > 0) {
      // Only keeping existing, no new images
      formData.append("keepExistingImages", "true");
    }

    // Send removed image IDs
    if (removedImageIds.value.length > 0) {
      formData.append("removedImageIds", JSON.stringify(removedImageIds.value));
    }

    let result;
    try {
      result = await apiUpload(`products/${productId.value}`, formData);
    } catch {
      throw new Error("Invalid response from server");
    }

    if (result.success) {
      showMessage("success", "Продуктът е актуализиран успешно!");

      setTimeout(() => {
        router.push("/products");
      }, 2000);
    } else {
      if (result.errors && Array.isArray(result.errors)) {
        const errorMessages = result.errors
          .map((err: { message?: string; msg?: string }) => err.message || err.msg)
          .join(", ");
        throw new Error(errorMessages);
      } else {
        throw new Error(result.message || "Server error occurred");
      }
    }
  } catch (error: unknown) {
    console.error("Error updating product:", error);

    if (error instanceof Error && error.name === "TypeError" && error.message.includes("fetch")) {
      showMessage("error", "Не може да се свърже със сървъра. Моля, проверете връзката си.");
    } else if (error instanceof Error && error.message.includes("413")) {
      showMessage("error", "Файлът е твърде голям. Моля, изберете по-малка снимка.");
    } else {
      showMessage(
        "error",
        error instanceof Error
          ? translateErrorMessage(error.message)
          : "Неуспешно актуализиране на продукт. Моля, опитайте отново."
      );
    }
  } finally {
    isSubmitting.value = false;
  }
};

onMounted(async () => {
  productId.value = route.params.id as string;

  // Load saved custom colors from localStorage
  loadSavedColors();

  await fetchCategories();
  await fetchProduct();

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
          <h1 class="text-3xl font-bold tracking-tight">Редактирай Продукт</h1>
          <p class="text-sm text-muted-foreground mt-1">Актуализирайте информацията за продукта</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <Button type="button" variant="outline" @click="router.back()"> Откажи </Button>
        <Button type="submit" :disabled="isSubmitting || isLoading" @click="submitForm">
          <Loader2 v-if="isSubmitting" class="mr-2 h-4 w-4 animate-spin" />
          {{ isSubmitting ? "Актуализация..." : "Актуализирай Продукт" }}
        </Button>
      </div>
    </div>

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
                    >Име на Продукта <span class="text-destructive">*</span></Label
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
                  <p v-if="errors.description" class="text-xs text-destructive mt-1">
                    {{ errors.description }}
                  </p>
                </div>

                <div class="grid grid-cols-2 gap-4">
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
                      <p v-if="errors.price" class="text-xs text-destructive mt-1">
                        {{ errors.price }}
                      </p>
                    </div>

                    <div class="space-y-2">
                      <Label for="compareAt" class="text-sm font-medium">Стара Цена (опц.)</Label>
                      <div class="relative">
                        <span
                          class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        >
                          лв.
                        </span>
                        <Input
                          id="compareAt"
                          v-model="form.compareAt"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          class="h-11 pl-9"
                        />
                      </div>
                      <p class="text-xs text-muted-foreground mt-1">
                        За показване на "Save %" badge
                      </p>
                    </div>
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
                            categoriesLoading ? 'Зареждане на категории...' : 'Избери категория'
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
                    <p v-if="errors.category" class="text-xs text-destructive mt-1">
                      {{ errors.category }}
                    </p>
                  </div>
                </div>

                <div class="space-y-2">
                  <Label for="stock" class="text-sm font-medium"
                    >Начално Количество на Склад <span class="text-destructive">*</span></Label
                  >
                  <Input
                    id="stock"
                    v-model="form.stock"
                    type="number"
                    min="0"
                    placeholder="Въведете количество"
                    class="h-11"
                    :class="{ 'border-destructive': errors.stock }"
                  />
                  <p class="text-xs text-muted-foreground">
                    Можете да управлявате склада по-късно от страницата Управление на Склада
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
                    >Налични Размери <span class="text-destructive">*</span></Label
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
                  :class="form.category === 'bags' ? 'grid grid-cols-1' : 'grid grid-cols-6 gap-2'"
                >
                  <Button
                    v-for="size in availableSizes"
                    :key="size"
                    type="button"
                    @click="toggleSize(size)"
                    :variant="form.sizes.includes(size) ? 'default' : 'outline'"
                    class="h-11 font-semibold"
                    :class="{
                      'ring-2 ring-primary ring-offset-2': form.sizes.includes(size),
                    }"
                  >
                    {{ size }}
                  </Button>
                </div>
                <p v-if="errors.sizes" class="text-xs text-destructive mt-1">
                  {{ errors.sizes }}
                </p>
              </div>

              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <Label class="text-sm font-medium">Налични Цветове</Label>
                  <span class="text-xs text-muted-foreground">
                    {{ form.colors.length }} избрани
                  </span>
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <Button
                    v-for="color in availableColors"
                    :key="color.name"
                    type="button"
                    @click="toggleColor(color.name, color.value)"
                    :variant="form.colors.some(c => (typeof c === 'string' ? c : c.name) === color.name) ? 'default' : 'outline'"
                    class="gap-2 h-11 justify-start"
                    :class="{
                      'ring-2 ring-primary ring-offset-2': form.colors.some(c => (typeof c === 'string' ? c : c.name) === color.name),
                    }"
                  >
                    <div
                      class="w-4 h-4 rounded-full border border-border"
                      :style="{ background: color.value }"
                    ></div>
                    {{ color.displayName || color.name }}
                  </Button>
                </div>
                <div class="flex flex-col gap-2 pt-2">
                  <div class="flex items-center gap-2">
                    <Input
                      v-model="customColor"
                      type="text"
                      placeholder="Име на цвят (напр. Crew, Beige)"
                      class="flex-1 h-10"
                      @keyup.enter="addCustomColor"
                    />
                    <input
                      v-model="customColorHex"
                      type="color"
                      class="h-10 w-20 cursor-pointer rounded border border-border"
                      title="Избери цвят"
                    />
                    <Button type="button" @click="addCustomColor" :disabled="!customColor.trim()" variant="secondary" class="h-10">
                      Добави
                    </Button>
                  </div>
                  <p class="text-xs text-muted-foreground">
                    Въведете име на цвят и изберете неговия цвят с цветния избор
                  </p>
                </div>
                <div v-if="form.colors.length > 0" class="flex flex-wrap gap-2 mt-2">
                  <Badge
                    v-for="(color, index) in form.colors"
                    :key="typeof color === 'string' ? color : color.name"
                    variant="secondary"
                    class="px-3 py-1 flex items-center gap-2"
                  >
                    <div
                      v-if="typeof color === 'object' && color.hex"
                      class="w-3 h-3 rounded-full border border-border"
                      :style="{ backgroundColor: color.hex }"
                    ></div>
                    <span>{{ typeof color === 'string' ? getColorDisplayName(color) : getColorDisplayName(color.name) }}</span>
                    <button
                      type="button"
                      @click="toggleColor(typeof color === 'string' ? color : color.name, typeof color === 'object' ? color.hex : '#9CA3AF')"
                      class="ml-1 hover:text-destructive"
                    >
                      <X class="h-3 w-3" />
                    </button>
                  </Badge>
                </div>
                <p v-if="errors.colors" class="text-xs text-destructive mt-1">
                  {{ errors.colors }}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card v-if="form.customEmbroidery">
            <CardHeader class="pb-4">
              <div class="flex items-center gap-2">
                <div class="h-8 w-1 bg-primary rounded-full"></div>
                <div>
                  <CardTitle class="text-lg">Опции за Бродерия</CardTitle>
                  <CardDescription class="text-xs">
                    Добавете настройки за персонализирана бродерия (незадължително)
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent class="space-y-6">
              <div class="flex items-center justify-between">
                <div class="space-y-0.5">
                  <Label for="embroidered" class="text-sm font-medium cursor-pointer"
                    >Активирай Бродерия</Label
                  >
                  <p class="text-xs text-muted-foreground">
                    Позволи на клиентите да персонализират продукта
                  </p>
                </div>
                <Switch id="embroidered" v-model:checked="form.customEmbroidery" />
              </div>

              <div v-if="form.customEmbroidery" class="space-y-4 pt-4 border-t">
                <!-- Available Embroidery Fonts -->
                <div class="space-y-2">
                  <Label class="text-sm font-medium">Налични Шрифтове</Label>
                  <div class="flex flex-wrap gap-2 mb-2">
                    <Badge
                      v-for="(font, index) in form.embroideryFonts"
                      :key="index"
                      variant="secondary"
                      class="px-3 py-1"
                    >
                      {{ font }}
                      <button
                        type="button"
                        @click="removeFont(index)"
                        class="ml-2 hover:text-destructive"
                      >
                        <X class="h-3 w-3" />
                      </button>
                    </Badge>
                  </div>
                  <div class="flex gap-2">
                    <Input
                      v-model="newFont"
                      type="text"
                      placeholder="Добави нов шрифт"
                      class="flex-1 h-9"
                      @keyup.enter="addFont"
                    />
                    <Button type="button" @click="addFont" size="sm"> Добави </Button>
                  </div>
                </div>

                <!-- Available Embroidery Colors -->
                <div class="space-y-2">
                  <Label class="text-sm font-medium">Налични Цветове за Бродерия</Label>
                  <div class="flex flex-wrap gap-2 mb-2">
                    <Badge
                      v-for="(color, index) in form.embroideryColors"
                      :key="index"
                      variant="secondary"
                      class="px-3 py-1"
                    >
                      <div
                        class="w-3 h-3 rounded-full inline-block mr-2 border border-border"
                        :style="{ background: color.value }"
                      ></div>
                      {{ color.name }}
                      <button
                        type="button"
                        @click="removeEmbroideryColor(index)"
                        class="ml-2 hover:text-destructive"
                      >
                        <X class="h-3 w-3" />
                      </button>
                    </Badge>
                  </div>
                  <div class="grid grid-cols-2 gap-2">
                    <Input
                      v-model="newEmbroideryColorName"
                      type="text"
                      placeholder="Име на цвят"
                      class="h-9"
                      @keyup.enter="addEmbroideryColor"
                    />
                    <div class="flex gap-2">
                      <Input v-model="newEmbroideryColorValue" type="color" class="h-9 w-20 p-1" />
                      <Button type="button" @click="addEmbroideryColor" size="sm"> Добави </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader class="pb-4">
              <div class="flex items-center gap-2">
                <div class="h-8 w-1 bg-primary rounded-full"></div>
                <div>
                  <CardTitle class="text-lg">Снимки на Продукта</CardTitle>
                  <CardDescription class="text-xs">
                    Качете до 5 висококачествени снимки ({{ allImagePreviews.length }}/5)
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent class="space-y-4">
              <!-- Image Previews Grid -->
              <div v-if="allImagePreviews.length > 0" class="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div
                  v-for="(preview, index) in allImagePreviews"
                  :key="index"
                  class="relative group aspect-square rounded-lg overflow-hidden border border-border bg-muted"
                >
                  <img
                    :src="getPreviewUrl(preview)"
                    :alt="`Product image ${index + 1}`"
                    class="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    @click="removeImage(index)"
                    class="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X class="h-4 w-4" />
                  </button>
                </div>
              </div>

              <!-- Upload Area -->
              <div
                v-if="allImagePreviews.length < 5"
                @drop.prevent="handleDrop"
                @dragover.prevent
                @dragenter.prevent="isDragging = true"
                @dragleave.prevent="isDragging = false"
                :class="[
                  'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
                  isDragging
                    ? 'border-primary bg-primary/5'
                    : 'border-muted-foreground/25 hover:border-muted-foreground/50',
                ]"
              >
                <input
                  ref="fileInput"
                  type="file"
                  accept="image/*"
                  multiple
                  @change="handleFileSelect"
                  class="hidden"
                />
                <Upload class="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 class="text-sm font-medium mb-2">
                  {{ allImagePreviews.length > 0 ? "Добави още снимки" : "Качване на Снимки" }}
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
                <p class="text-xs text-muted-foreground mt-2">
                  Поддържани формати: JPEG, PNG, GIF, WEBP (макс. 5MB на файл)
                </p>
              </div>
              <p v-if="errors.image" class="text-xs text-destructive flex items-center gap-1">
                <AlertCircle class="h-3 w-3" />
                {{ errors.image }}
              </p>
            </CardContent>
          </Card>
        </div>

        <div class="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle class="text-lg">Съвети</CardTitle>
            </CardHeader>
            <CardContent>
              <ul class="space-y-3 text-sm text-muted-foreground">
                <li class="flex items-start gap-2">
                  <div class="w-1.5 h-1.5 rounded-full bg-primary mt-1.5"></div>
                  <span>Използвайте изображения с висока резолюция (мин 800x800px)</span>
                </li>
                <li class="flex items-start gap-2">
                  <div class="w-1.5 h-1.5 rounded-full bg-primary mt-1.5"></div>
                  <span>Осигурете добро осветление и ясна видимост на продукта</span>
                </li>
                <li class="flex items-start gap-2">
                  <div class="w-1.5 h-1.5 rounded-full bg-primary mt-1.5"></div>
                  <span>Покажете продукта от различни ъгли</span>
                </li>
                <li class="flex items-start gap-2">
                  <div class="w-1.5 h-1.5 rounded-full bg-primary mt-1.5"></div>
                  <span>Използвайте неутрален фон за по-добър вид</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>

    <!-- Success/Error Message -->
    <div
      v-if="message"
      :class="[
        'fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg border p-4 shadow-lg transition-all',
        message.type === 'success'
          ? 'bg-green-50 border-green-200 text-green-900'
          : 'bg-red-50 border-red-200 text-red-900',
      ]"
    >
      <CheckCircle v-if="message.type === 'success'" class="h-5 w-5 flex-shrink-0" />
      <AlertCircle v-else class="h-5 w-5 flex-shrink-0" />
      <div>
        <p class="font-semibold">
          {{ message.type === "success" ? "Успешно!" : "Грешка" }}
        </p>
        <p class="text-sm">{{ message.text }}</p>
      </div>
    </div>
  </div>
</template>
