<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Loader2,
  Package,
  Palette,
  Ruler,
  AlertCircle,
  Calendar,
  Tag,
  Box,
} from "lucide-vue-next";
import { apiGet, apiDelete } from "@/utils/api";

type ProductImage = {
  url: string;
  publicId: string;
};

type Product = {
  _id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  stock: number;
  isActive: boolean;
  image?: ProductImage;
  images?: ProductImage[];
  sizes?: string[];
  colors?: string[];
  isEmbroidered?: boolean;
  embroideryOptions?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
};

const router = useRouter();
const route = useRoute();

const product = ref<Product | null>(null);
const isLoading = ref(false);
const errorMessage = ref("");
const fallbackImageUrl = "https://via.placeholder.com/400?text=No+Image";

const fetchProduct = async () => {
  isLoading.value = true;
  errorMessage.value = "";

  try {
    const productId = route.params.id;
    const result = await apiGet(`products/${productId}`);

    if (result.success && result.data) {
      product.value = result.data;
    } else {
      throw new Error("Product not found");
    }
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : "Failed to load product details";
  } finally {
    isLoading.value = false;
  }
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

const formatPrice = (value: number) => currencyFormatter.format(value);

const formatDate = (dateString?: string) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const goBack = () => {
  router.push("/products");
};

const editProduct = () => {
  if (product.value) {
    router.push(`/products/edit/${product.value._id}`);
  }
};

const deleteProduct = async () => {
  if (!product.value) return;

  if (!confirm("Are you sure you want to delete this product?")) {
    return;
  }

  try {
    await apiDelete(`products/${product.value._id}`);

    router.push("/products");
  } catch (error) {
    alert(error instanceof Error ? error.message : "Failed to delete product");
  }
};

onMounted(() => {
  fetchProduct();
});
</script>

<template>
  <div class="space-y-8 pb-8 pt-6">
    <!-- Navigation Bar -->
    <div class="flex items-center justify-between">
      <Button variant="ghost" @click="goBack" class="pl-0 hover:bg-transparent">
        <ArrowLeft class="mr-2 h-4 w-4" />
        Назад към Продукти
      </Button>
      <div v-if="product" class="flex gap-3">
        <Button variant="outline" size="default" @click="editProduct">
          <Edit class="mr-2 h-4 w-4" />
          Редактирай Продукт
        </Button>
        <Button variant="destructive" size="default" @click="deleteProduct">
          <Trash2 class="mr-2 h-4 w-4" />
          Изтрий
        </Button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <div class="text-center">
        <Loader2 class="h-10 w-10 animate-spin mx-auto mb-4 text-primary" />
        <p class="text-lg text-muted-foreground">
          Зареждане на детайли за продукта...
        </p>
      </div>
    </div>

    <!-- Error State -->
    <Card v-else-if="errorMessage" class="border-destructive">
      <CardContent class="pt-6">
        <div class="flex items-center gap-3 text-destructive">
          <AlertCircle class="h-5 w-5 flex-shrink-0" />
          <div>
            <p class="font-semibold">Неуспешно зареждане на продукта</p>
            <p class="text-sm">{{ errorMessage }}</p>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Product Content -->
    <div v-else-if="product" class="space-y-8">
      <!-- Hero Section: Image + Primary Info -->
      <div class="grid lg:grid-cols-2 gap-8">
        <!-- Product Image -->
        <div class="relative">
          <div class="sticky top-8">
            <div
              class="relative aspect-square rounded-xl overflow-hidden bg-muted border"
            >
              <img
                :src="
                  (product.images?.[0]?.url || product.image?.url) ??
                  fallbackImageUrl
                "
                :alt="product.name"
                class="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>

        <!-- Product Information -->
        <div class="space-y-6">
          <!-- Header Info -->
          <div>
            <div class="flex items-start justify-between gap-4 mb-3">
              <h1 class="text-4xl font-bold tracking-tight leading-tight">
                {{ product.name }}
              </h1>
            </div>
            <div class="flex flex-wrap items-center gap-2 mb-4">
              <Badge
                :variant="product.isActive ? 'default' : 'destructive'"
                class="text-sm px-3 py-1"
              >
                {{ product.isActive ? "Активен" : "Неактивен" }}
              </Badge>
              <Badge variant="secondary" class="text-sm px-3 py-1">
                <Tag class="h-3 w-3 mr-1" />
                {{ product.category }}
              </Badge>
              <Badge
                v-if="product.isEmbroidered"
                variant="outline"
                class="text-sm px-3 py-1"
              >
                С Бродерия
              </Badge>
            </div>
            <div class="flex items-baseline gap-2">
              <span class="text-5xl font-bold tracking-tight">{{
                formatPrice(product.price)
              }}</span>
            </div>
          </div>

          <!-- Description Card -->
          <Card>
            <CardHeader class="pb-3">
              <CardTitle class="text-lg">Описание</CardTitle>
            </CardHeader>
            <CardContent>
              <p class="text-muted-foreground leading-relaxed">
                {{ product.description }}
              </p>
            </CardContent>
          </Card>

          <!-- Stock Info Card -->
          <Card
            :class="
              product.stock <= 10 ? 'border-orange-200 bg-orange-50/50' : ''
            "
          >
            <CardHeader class="pb-3">
              <CardTitle class="text-lg flex items-center gap-2">
                <Package class="h-5 w-5" />
                Информация за Наличност
              </CardTitle>
            </CardHeader>
            <CardContent class="space-y-3">
              <div class="flex items-baseline gap-2">
                <span class="text-4xl font-bold">{{ product.stock }}</span>
                <span class="text-muted-foreground text-lg">налични броя</span>
              </div>
              <div
                v-if="product.stock <= 10"
                class="flex items-center gap-2 text-sm font-medium text-orange-700 bg-orange-100 px-3 py-2 rounded-md"
              >
                <AlertCircle class="h-4 w-4 flex-shrink-0" />
                <span>Малка наличност - обмислете зареждане скоро</span>
              </div>
            </CardContent>
          </Card>

          <!-- Sizes & Colors Grid -->
          <div class="grid sm:grid-cols-2 gap-4">
            <Card v-if="product.sizes && product.sizes.length > 0">
              <CardHeader class="pb-3">
                <CardTitle class="text-base flex items-center gap-2">
                  <Ruler class="h-4 w-4" />
                  Размери
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div class="flex flex-wrap gap-2">
                  <Badge
                    v-for="size in product.sizes"
                    :key="size"
                    variant="outline"
                    class="px-4 py-1.5 text-sm font-medium"
                  >
                    {{ size }}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card v-if="product.colors && product.colors.length > 0">
              <CardHeader class="pb-3">
                <CardTitle class="text-base flex items-center gap-2">
                  <Palette class="h-4 w-4" />
                  Цветове
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div class="flex flex-wrap gap-2">
                  <Badge
                    v-for="color in product.colors"
                    :key="color"
                    variant="outline"
                    class="px-4 py-1.5 text-sm font-medium"
                  >
                    {{ color }}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <!-- Embroidery Options Section -->
      <Card
        v-if="product.isEmbroidered && product.embroideryOptions"
        class="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200"
      >
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <Box class="h-5 w-5" />
            Опции за Бродерия
          </CardTitle>
          <CardDescription>
            Този продукт поддържа персонализирана бродерия със следните опции
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre
            class="bg-white/80 p-4 rounded-lg overflow-auto text-sm border"
            >{{ JSON.stringify(product.embroideryOptions, null, 2) }}</pre
          >
        </CardContent>
      </Card>

      <!-- Product Metadata Section -->
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <Calendar class="h-5 w-5" />
            Метаданни на Продукта
          </CardTitle>
          <CardDescription>
            Техническа информация и времеви маркери
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div class="space-y-1">
              <dt
                class="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
              >
                ID на Продукта
              </dt>
              <dd
                class="text-sm font-mono bg-muted px-2 py-1 rounded inline-block"
              >
                {{ product._id }}
              </dd>
            </div>
            <div class="space-y-1">
              <dt
                class="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
              >
                Категория
              </dt>
              <dd class="text-sm font-medium">{{ product.category }}</dd>
            </div>
            <div class="space-y-1">
              <dt
                class="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
              >
                Статус
              </dt>
              <dd class="text-sm font-medium">
                <Badge
                  :variant="product.isActive ? 'default' : 'destructive'"
                  class="text-xs"
                >
                  {{ product.isActive ? "Активен" : "Неактивен" }}
                </Badge>
              </dd>
            </div>
            <div class="space-y-1">
              <dt
                class="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
              >
                Цена
              </dt>
              <dd class="text-sm font-bold">
                {{ formatPrice(product.price) }}
              </dd>
            </div>
            <div class="space-y-1">
              <dt
                class="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
              >
                Създаден На
              </dt>
              <dd class="text-sm">{{ formatDate(product.createdAt) }}</dd>
            </div>
            <div class="space-y-1">
              <dt
                class="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
              >
                Последна Актуализация
              </dt>
              <dd class="text-sm">{{ formatDate(product.updatedAt) }}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
