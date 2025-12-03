<script setup lang="ts">
import { ref, watch, onMounted, computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2 } from "lucide-vue-next";
import { apiGet, apiPost, apiPut } from "@/utils/api";

const router = useRouter();
const route = useRoute();

const isEditMode = computed(() => !!route.params.id);
const discountId = computed(() => route.params.id as string);

type Product = {
  _id: string;
  name: string;
  price: number;
  category: string;
};

const products = ref<Product[]>([]);
const categories = ref<string[]>([]);
const loadingProducts = ref(false);

const form = ref({
  name: "",
  type: "percentage",
  value: 0,
  scope: "product",
  applicableProducts: [] as string[],
  applicableCategories: [] as string[],
  endDate: "",
  isActive: true,
});

const isSubmitting = ref(false);
const errorMessage = ref("");

const fetchProducts = async () => {
  loadingProducts.value = true;
  try {
    const result = await apiGet("products?limit=1000");
    if (result.success && Array.isArray(result.data)) {
      products.value = result.data;
      const categoryStrings: string[] = result.data
        .map((p: Product) => p.category)
        .filter((cat: unknown): cat is string => typeof cat === "string" && cat.length > 0);
      const uniqueCategories = [...new Set(categoryStrings)];
      categories.value = uniqueCategories;
    }
  } catch (error) {
    console.error("Failed to load products:", error);
  } finally {
    loadingProducts.value = false;
  }
};

const fetchDiscount = async () => {
  if (!discountId.value) return;

  isSubmitting.value = true;
  try {
    const result = await apiGet(`discounts/${discountId.value}`);
    if (result.success && result.data) {
      const discount = result.data;
      form.value = {
        name: discount.name,
        type: discount.type,
        value: discount.value,
        scope: discount.scope,
        applicableProducts: (discount.conditions?.productIds || []) as string[],
        applicableCategories: (discount.conditions?.categories || []) as string[],
        endDate: discount.endDate ? new Date(discount.endDate).toISOString().slice(0, 16) : "",
        isActive: discount.isActive,
      };
    }
  } catch (error) {
    console.error("Failed to load discount:", error);
    errorMessage.value = "Failed to load discount data";
  } finally {
    isSubmitting.value = false;
  }
};

watch(
  () => form.value.scope,
  (newScope) => {
    if (newScope !== "product") {
      form.value.applicableProducts = [];
    }
    if (newScope !== "category") {
      form.value.applicableCategories = [];
    }
  }
);

const toggleProduct = (productId: string) => {
  const index = form.value.applicableProducts.indexOf(productId);
  if (index > -1) {
    form.value.applicableProducts.splice(index, 1);
  } else {
    form.value.applicableProducts.push(productId);
  }
};

const toggleCategory = (category: string) => {
  const index = form.value.applicableCategories.indexOf(category);
  if (index > -1) {
    form.value.applicableCategories.splice(index, 1);
  } else {
    form.value.applicableCategories.push(category);
  }
};

const handleSubmit = async () => {
  isSubmitting.value = true;
  errorMessage.value = "";

  try {
    if (form.value.scope === "product" && form.value.applicableProducts.length === 0) {
      throw new Error("Моля изберете поне един продукт");
    }
    if (form.value.scope === "category" && form.value.applicableCategories.length === 0) {
      throw new Error("Моля изберете поне една категория");
    }

    const data: any = {
      name: form.value.name,
      type: form.value.type,
      value: parseFloat(form.value.value.toString()),
      scope: form.value.scope,
      isActive: form.value.isActive,
    };

    if (form.value.endDate) {
      data.endDate = form.value.endDate;
    }

    if (form.value.scope === "product" && form.value.applicableProducts.length > 0) {
      data.applicableProducts = form.value.applicableProducts;
    }

    if (form.value.scope === "category" && form.value.applicableCategories.length > 0) {
      data.applicableCategories = form.value.applicableCategories;
    }

    let result;
    if (isEditMode.value) {
      result = await apiPut(`discounts/${discountId.value}`, data);
    } else {
      result = await apiPost("discounts", data);
    }

    if (!result.success) {
      throw new Error(
        result.message || `Failed to ${isEditMode.value ? "update" : "create"} discount`
      );
    }

    router.push("/discounts");
  } catch (error) {
    errorMessage.value =
      error instanceof Error
        ? error.message
        : `Failed to ${isEditMode.value ? "update" : "create"} discount`;
  } finally {
    isSubmitting.value = false;
  }
};

onMounted(() => {
  fetchProducts();
  if (isEditMode.value) {
    fetchDiscount();
  }
});
</script>

<template>
  <div class="space-y-6 pb-8 pt-6 max-w-4xl mx-auto">
    <!-- Header -->
    <div class="flex items-center gap-4">
      <Button variant="ghost" size="icon" @click="router.push('/discounts')">
        <ArrowLeft class="h-5 w-5" />
      </Button>
      <div>
        <h1 class="text-4xl font-bold tracking-tight">
          {{ isEditMode ? "Редактирай отстъпка" : "Създай отстъпка" }}
        </h1>
        <p class="text-muted-foreground mt-1.5">
          {{ isEditMode ? "Промени настройките на отстъпката" : "Бърза и лесна отстъпка" }}
        </p>
      </div>
    </div>

    <!-- Form -->
    <form @submit.prevent="handleSubmit" class="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Основна информация</CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          <!-- Name -->
          <div class="space-y-2">
            <Label for="name">Име на отстъпката <span class="text-destructive">*</span></Label>
            <Input id="name" v-model="form.name" placeholder="напр. Лятна разпродажба" required />
          </div>

          <!-- Type and Value -->
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label for="type">Тип <span class="text-destructive">*</span></Label>
              <Select v-model="form.type" required>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Процент (%)</SelectItem>
                  <SelectItem value="fixed_amount">Фиксирана сума (лв)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div class="space-y-2">
              <Label for="value"> Стойност <span class="text-destructive">*</span> </Label>
              <Input
                id="value"
                v-model.number="form.value"
                type="number"
                step="0.01"
                min="0"
                :placeholder="form.type === 'percentage' ? '20' : '10'"
                required
              />
            </div>
          </div>

          <!-- Scope -->
          <div class="space-y-2">
            <Label for="scope">Приложи за <span class="text-destructive">*</span></Label>
            <Select v-model="form.scope" required>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="product">Конкретни продукти</SelectItem>
                <SelectItem value="category">Цяла категория</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <!-- Product Selection -->
          <div v-if="form.scope === 'product'" class="space-y-3">
            <Label>Избери продукти <span class="text-destructive">*</span></Label>

            <div v-if="loadingProducts" class="text-center py-4">
              <Loader2 class="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
            </div>

            <div
              v-else
              class="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto border rounded-lg p-4"
            >
              <label
                v-for="product in products"
                :key="product._id"
                class="flex items-center space-x-3 p-3 rounded hover:bg-muted/50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  :checked="form.applicableProducts.includes(product._id)"
                  @change="toggleProduct(product._id)"
                  class="h-4 w-4"
                />
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium">{{ product.name }}</p>
                  <p class="text-xs text-muted-foreground">{{ product.price }} лв</p>
                </div>
              </label>
            </div>

            <p class="text-sm text-muted-foreground">
              Избрани: {{ form.applicableProducts.length }}
            </p>
          </div>

          <!-- Category Selection -->
          <div v-if="form.scope === 'category'" class="space-y-3">
            <Label>Избери категории <span class="text-destructive">*</span></Label>

            <div class="grid grid-cols-2 gap-2 border rounded-lg p-4">
              <label
                v-for="category in categories"
                :key="category"
                class="flex items-center space-x-3 p-3 rounded hover:bg-muted/50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  :checked="form.applicableCategories.includes(category)"
                  @change="toggleCategory(category)"
                  class="h-4 w-4"
                />
                <span class="text-sm font-medium capitalize">{{ category }}</span>
              </label>
            </div>

            <p class="text-sm text-muted-foreground">
              Избрани: {{ form.applicableCategories.length }}
            </p>
          </div>

          <!-- Expiration Date -->
          <div class="space-y-2">
            <Label for="endDate">Валидна до (опционално)</Label>
            <Input id="endDate" v-model="form.endDate" type="datetime-local" />
            <p class="text-xs text-muted-foreground">Оставете празно за неограничена валидност</p>
          </div>
        </CardContent>
      </Card>

      <!-- Error Message -->
      <div
        v-if="errorMessage"
        class="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-lg"
      >
        {{ errorMessage }}
      </div>

      <!-- Submit -->
      <div class="flex gap-4">
        <Button type="submit" :disabled="isSubmitting" class="flex-1">
          <Loader2 v-if="isSubmitting" class="mr-2 h-4 w-4 animate-spin" />
          {{
            isSubmitting
              ? isEditMode
                ? "Запазване..."
                : "Създаване..."
              : isEditMode
                ? "Запази промените"
                : "Създай отстъпка"
          }}
        </Button>
        <Button type="button" variant="outline" @click="router.push('/discounts')"> Отказ </Button>
      </div>
    </form>
  </div>
</template>
