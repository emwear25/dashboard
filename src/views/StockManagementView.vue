<script setup lang="ts">
import { ref, computed } from "vue";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Package,
  Plus,
  Minus,
  Edit2,
  AlertCircle,
  Search,
  ChevronDown,
  ChevronRight,
} from "lucide-vue-next";
import VariantStockGrid from "@/components/VariantStockGrid.vue";
import { useToast } from "@/components/ui/toast/use-toast";
import { apiGet, apiPut, apiPatch } from "@/utils/api";

type ProductImage = {
  url: string;
  publicId: string;
};

type Variant = {
  size: string;
  color: string;
  stock: number;
  reserved?: number;
  lowStockThreshold?: number;
  price?: number;
};

type Product = {
  _id: string;
  name: string;
  category?: string | { name: string } | null;
  price: number;
  compareAt?: number; // Original price before discount
  stock: number;
  variants?: Variant[];
  sizes?: string[];
  colors?: string[];
  isActive: boolean;
  image?: ProductImage;
  images?: ProductImage[];
};

const products = ref<Product[]>([]);
const isLoading = ref(false);
const errorMessage = ref("");
const searchQuery = ref("");
const fallbackImageUrl = "https://via.placeholder.com/80?text=No+Image";
const expandedProducts = ref<Set<string>>(new Set());
const { toast } = useToast();

// Dialog state
const isDialogOpen = ref(false);
const selectedProduct = ref<Product | null>(null);
const stockOperation = ref<"set" | "add" | "subtract">("add");
const stockAmount = ref("");
const isUpdating = ref(false);
const updateError = ref("");
const isSaving = ref(false); // Separate loading state for saving (doesn't hide table)

// Price dialog state
const isPriceDialogOpen = ref(false);
const selectedProductForPrice = ref<Product | null>(null);
const newPriceEur = ref("");
const isUpdatingPrice = ref(false);
const priceUpdateError = ref("");

const fetchProducts = async () => {
  isLoading.value = true;
  errorMessage.value = "";

  try {
    // Add cache-busting timestamp to ensure fresh data
    const result = await apiGet(`products?limit=100&showAll=true&_t=${Date.now()}`);

    if (result.success && Array.isArray(result.data)) {
      products.value = result.data;
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "Failed to load products";
  } finally {
    isLoading.value = false;
  }
};

const getCategoryName = (category: string | { name: string } | undefined | null): string => {
  if (!category) return "";
  if (typeof category === "string") return category;
  if (typeof category === "object" && category.name) return category.name;
  return "";
};

const filteredProducts = computed(() => {
  if (!searchQuery.value.trim()) {
    return products.value;
  }

  const query = searchQuery.value.toLowerCase();
  return products.value.filter((p) => {
    const categoryName = getCategoryName(p.category);
    return (
      p.name.toLowerCase().includes(query) ||
      (categoryName && categoryName.toLowerCase().includes(query))
    );
  });
});

const lowStockProducts = computed(() => {
  return products.value.filter((p) => {
    if (p.variants && p.variants.length > 0) {
      return p.variants.some((v) => v.stock - (v.reserved || 0) <= (v.lowStockThreshold || 5));
    }
    return p.stock <= 10;
  });
});

const outOfStockProducts = computed(() => {
  return products.value.filter((p) => {
    if (p.variants && p.variants.length > 0) {
      return p.variants.every((v) => v.stock - (v.reserved || 0) === 0);
    }
    return p.stock === 0;
  });
});

const toggleProductExpansion = (productId: string) => {
  if (expandedProducts.value.has(productId)) {
    expandedProducts.value.delete(productId);
  } else {
    expandedProducts.value.add(productId);
  }
};

const isProductExpanded = (productId: string) => {
  return expandedProducts.value.has(productId);
};

const getTotalStock = (product: Product): number => {
  if (product.variants && product.variants.length > 0) {
    return product.variants.reduce((sum, v) => sum + v.stock, 0);
  }
  return product.stock;
};

// EUR to BGN conversion rate (Bulgarian lev is pegged to EUR)
const EUR_TO_BGN_RATE = 1.95583;

// Convert BGN to EUR for display
const bgnToEur = (bgn: number): number => bgn / EUR_TO_BGN_RATE;

// Get display price - for products with variants, show variant price range or single variant price
// Note: All prices in DB are stored in BGN, so we convert to EUR for display
const getDisplayPrice = (product: Product): { main: number; isRange: boolean; min?: number; max?: number } => {
  if (product.variants && product.variants.length > 0) {
    // Get all variant prices (use base price as fallback for variants without custom price)
    const pricesInBgn = product.variants.map(v => v.price ?? product.price);
    const minBgn = Math.min(...pricesInBgn);
    const maxBgn = Math.max(...pricesInBgn);
    
    // Convert to EUR for display
    const minEur = bgnToEur(minBgn);
    const maxEur = bgnToEur(maxBgn);
    
    if (minBgn === maxBgn) {
      return { main: minEur, isRange: false };
    }
    return { main: minEur, isRange: true, min: minEur, max: maxEur };
  }
  // Convert base price to EUR
  return { main: bgnToEur(product.compareAt || product.price), isRange: false };
};

// Store pending variant updates
const pendingVariantUpdates = ref<Record<string, Variant[]>>({});

// Store variant updates (don't update product immediately to avoid re-render issues)
const handleVariantUpdate = (product: Product, updatedVariants: Variant[]) => {
  pendingVariantUpdates.value[product._id] = updatedVariants;
};

// Save variant changes to backend
const saveVariantChanges = async (product: Product, updatedVariants?: Variant[]) => {
  // Use provided variants or get from pending updates
  const variantsToSave =
    updatedVariants || pendingVariantUpdates.value[product._id] || product.variants || [];

  if (!variantsToSave || variantsToSave.length === 0) {
    console.warn("No variants to save for product:", product._id);
    return;
  }

  try {
    isSaving.value = true;
    const result = await apiPut(`variant-stock/${product._id}/variants/bulk`, {
      variants: variantsToSave,
    });

    if (result.success) {
      // Update product variants in-place instead of re-fetching (preserves expansion state)
      const productIndex = products.value.findIndex((p) => p._id === product._id);
      if (productIndex !== -1 && result.data?.variants) {
        products.value[productIndex].variants = result.data.variants;
      }
      // Clear pending updates
      delete pendingVariantUpdates.value[product._id];
      errorMessage.value = "";

      toast({
        title: "Success",
        description: `Вариантите на ${product.name} бяха запазени успешно`,
      });
    } else {
      throw new Error(result.message || "Failed to save variant changes");
    }
  } catch (error) {
    console.error("Error saving variant changes:", error);
    const errorMsg = error instanceof Error ? error.message : "Failed to save variant changes";
    errorMessage.value = errorMsg;

    toast({
      title: "Error",
      description: errorMsg,
      variant: "destructive",
    });
  } finally {
    isSaving.value = false;
  }
};

const openStockDialog = (product: Product, operation: "set" | "add" | "subtract") => {
  selectedProduct.value = product;
  stockOperation.value = operation;
  stockAmount.value = "";
  updateError.value = "";
  isDialogOpen.value = true;
};

const closeDialog = () => {
  isDialogOpen.value = false;
  selectedProduct.value = null;
  stockAmount.value = "";
  updateError.value = "";
};

const updateStock = async () => {
  if (!selectedProduct.value) return;

  const amount = parseInt(stockAmount.value);
  if (isNaN(amount) || amount < 0) {
    updateError.value = "Моля, въведете валидно количество";
    return;
  }

  isUpdating.value = true;
  updateError.value = "";

  try {
    const result = await apiPatch(`products/${selectedProduct.value._id}/stock`, {
      stock: amount,
      operation: stockOperation.value,
    });

    if (result.success && result.data) {
      // Update the product in the list
      const index = products.value.findIndex((p) => p._id === result.data._id);
      if (index !== -1) {
        products.value[index] = result.data;
      }

      closeDialog();
    } else {
      throw new Error(result.message || "Failed to update stock");
    }
  } catch (error) {
    updateError.value = error instanceof Error ? error.message : "Failed to update stock";
  } finally {
    isUpdating.value = false;
  }
};

// Price editing functions
const openPriceDialog = (product: Product) => {
  selectedProductForPrice.value = product;
  // Convert current BGN price to EUR for display
  newPriceEur.value = bgnToEur(product.price).toFixed(2);
  priceUpdateError.value = "";
  isPriceDialogOpen.value = true;
};

const closePriceDialog = () => {
  isPriceDialogOpen.value = false;
  selectedProductForPrice.value = null;
  newPriceEur.value = "";
  priceUpdateError.value = "";
};

const updatePrice = async () => {
  if (!selectedProductForPrice.value) return;

  const priceInEur = parseFloat(newPriceEur.value);
  if (isNaN(priceInEur) || priceInEur < 0) {
    priceUpdateError.value = "Моля, въведете валидна цена";
    return;
  }

  // Convert EUR to BGN for storage
  const priceInBgn = priceInEur * EUR_TO_BGN_RATE;

  isUpdatingPrice.value = true;
  priceUpdateError.value = "";

  try {
    const result = await apiPatch(`products/${selectedProductForPrice.value._id}`, {
      price: priceInBgn,
    });

    if (result.success && result.data) {
      // Update the product in the list
      const index = products.value.findIndex((p) => p._id === result.data._id);
      if (index !== -1) {
        products.value[index] = result.data;
      }

      toast({
        title: "Успешно",
        description: `Цената на ${selectedProductForPrice.value.name} беше актуализирана`,
      });

      closePriceDialog();
    } else {
      throw new Error(result.message || "Неуспешно актуализиране на цената");
    }
  } catch (error) {
    priceUpdateError.value = error instanceof Error ? error.message : "Неуспешно актуализиране на цената";
  } finally {
    isUpdatingPrice.value = false;
  }
};

const getStockStatus = (stock: number) => {
  if (stock === 0) return { label: "Изчерпан", variant: "destructive" as const };
  if (stock <= 10) return { label: "Малка Наличност", variant: "secondary" as const };
  return { label: "На Склад", variant: "default" as const };
};

const formatCategory = (category: string | { name: string } | undefined | null) => {
  const categoryName = getCategoryName(category);
  if (!categoryName) return "Без категория";

  return categoryName
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const currencyFormatter = new Intl.NumberFormat("bg-BG", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});

const formatPrice = (value: number) => currencyFormatter.format(value);

fetchProducts();
</script>

<template>
  <div class="space-y-8 pb-8 pt-6">
    <!-- Header -->
    <div>
      <h1 class="text-4xl font-bold tracking-tight">Управление на Склада</h1>
      <p class="text-muted-foreground mt-1.5">
        Наблюдавайте и управлявайте нивата на инвентара през всички канали за продажби
      </p>
    </div>

    <!-- Stats Cards -->
    <div class="grid gap-4 md:grid-cols-3">
      <Card>
        <CardContent class="pt-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-muted-foreground">Общо Продукти</p>
              <p class="text-3xl font-bold">{{ products.length }}</p>
            </div>
            <div class="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Package class="h-6 w-6 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent class="pt-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-muted-foreground">Сигнали за Малка Наличност</p>
              <p class="text-3xl font-bold text-orange-600">
                {{ lowStockProducts.length }}
              </p>
            </div>
            <div class="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
              <AlertCircle class="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent class="pt-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-muted-foreground">Изчерпани</p>
              <p class="text-3xl font-bold text-destructive">
                {{ outOfStockProducts.length }}
              </p>
            </div>
            <div class="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle class="h-6 w-6 text-destructive" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Search -->
    <Card>
      <CardContent class="pt-6">
        <div class="relative">
          <Search
            class="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4"
          />
          <Input
            v-model="searchQuery"
            type="text"
            placeholder="Търсете продукти по име или категория..."
            class="pl-10"
          />
        </div>
      </CardContent>
    </Card>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <div class="text-center">
        <Loader2 class="h-10 w-10 animate-spin mx-auto mb-4 text-primary" />
        <p class="text-lg text-muted-foreground">Зареждане на продукти...</p>
      </div>
    </div>

    <!-- Error State -->
    <Card v-else-if="errorMessage" class="border-destructive">
      <CardContent class="pt-6">
        <div class="flex items-center gap-3 text-destructive">
          <AlertCircle class="h-5 w-5 flex-shrink-0" />
          <div>
            <p class="font-semibold">Неуспешно зареждане на продуктите</p>
            <p class="text-sm">{{ errorMessage }}</p>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Products Table -->
    <Card v-else>
      <CardContent class="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead class="w-[40px]"></TableHead>
              <TableHead class="w-[60px]">Снимка</TableHead>
              <TableHead>Продукт</TableHead>
              <TableHead>Категория</TableHead>
              <TableHead>Цена</TableHead>
              <TableHead>Обща Наличност</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead class="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-if="!filteredProducts.length">
              <TableCell colspan="7" class="text-center py-12">
                <div class="flex flex-col items-center gap-2">
                  <Package class="h-12 w-12 text-muted-foreground/50" />
                  <p class="text-muted-foreground font-medium">Няма намерени продукти</p>
                </div>
              </TableCell>
            </TableRow>
            <template v-for="product in filteredProducts" :key="product._id">
              <TableRow>
                <TableCell>
                  <Button
                    v-if="product.variants && product.variants.length > 0"
                    variant="ghost"
                    size="sm"
                    @click="toggleProductExpansion(product._id)"
                    class="p-0 h-8 w-8"
                  >
                    <ChevronRight v-if="!isProductExpanded(product._id)" class="h-4 w-4" />
                    <ChevronDown v-else class="h-4 w-4" />
                  </Button>
                </TableCell>
                <TableCell>
                  <img
                    :src="(product.images?.[0]?.url || product.image?.url) ?? fallbackImageUrl"
                    :alt="product.name"
                    class="w-12 h-12 rounded-md object-contain bg-muted"
                  />
                </TableCell>
                <TableCell>
                  <div class="font-medium">{{ product.name }}</div>
                  <div
                    v-if="product.variants && product.variants.length > 0"
                    class="text-xs text-muted-foreground"
                  >
                    {{ product.variants.length }} варианта
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{{ formatCategory(product.category) }}</Badge>
                </TableCell>
                <TableCell>
                  <div class="flex flex-col">
                    <template v-if="getDisplayPrice(product).isRange">
                      <span>{{ formatPrice(getDisplayPrice(product).min!) }} - {{ formatPrice(getDisplayPrice(product).max!) }}</span>
                    </template>
                    <template v-else>
                      <span>{{ formatPrice(getDisplayPrice(product).main) }}</span>
                    </template>
                    <span v-if="product.compareAt && product.compareAt > product.price && !product.variants?.length" class="text-xs text-muted-foreground">
                      Отстъпка: {{ formatPrice(product.price) }}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <span class="text-lg font-semibold">{{ getTotalStock(product) }}</span>
                  <span class="text-muted-foreground text-sm ml-1">броя</span>
                </TableCell>
                <TableCell>
                  <Badge :variant="getStockStatus(getTotalStock(product)).variant">
                    {{ getStockStatus(getTotalStock(product)).label }}
                  </Badge>
                </TableCell>
                <TableCell class="text-right">
                  <div class="flex justify-end gap-2">
                    <!-- Stock buttons only for products without variants -->
                    <Button
                      v-if="!product.variants || product.variants.length === 0"
                      variant="outline"
                      size="sm"
                      @click="openStockDialog(product, 'add')"
                      title="Добави наличност"
                    >
                      <Plus class="h-4 w-4" />
                    </Button>
                    <Button
                      v-if="!product.variants || product.variants.length === 0"
                      variant="outline"
                      size="sm"
                      @click="openStockDialog(product, 'subtract')"
                      title="Премахни наличност"
                    >
                      <Minus class="h-4 w-4" />
                    </Button>
                    <!-- Price edit button - ALWAYS show for ALL products -->
                    <Button
                      variant="outline"
                      size="sm"
                      @click="openPriceDialog(product)"
                      title="Редактирай цена"
                    >
                      <Edit2 class="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>

              <!-- Expanded Variant Details -->
              <TableRow
                v-if="
                  isProductExpanded(product._id) && product.variants && product.variants.length > 0
                "
                class="bg-muted/30"
              >
                <TableCell colspan="8" class="p-4">
                  <VariantStockGrid
                    :key="`variant-grid-${product._id}`"
                    :variants="product.variants || []"
                    :sizes="product.sizes || []"
                    :colors="product.colors || []"
                    :product-id="product._id"
                    :base-price="product.price"
                    @update="(variants) => handleVariantUpdate(product, variants)"
                    @save="(variants) => saveVariantChanges(product, variants)"
                  />
                </TableCell>
              </TableRow>
            </template>
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    <!-- Stock Update Dialog -->
    <Dialog :open="isDialogOpen" @update:open="(open) => !open && closeDialog()">
      <DialogContent class="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {{
              stockOperation === "add"
                ? "Добави Наличност"
                : stockOperation === "subtract"
                  ? "Премахни Наличност"
                  : "Зададе Наличност"
            }}
          </DialogTitle>
          <DialogDescription>
            Актуализирай наличността за {{ selectedProduct?.name }}
          </DialogDescription>
        </DialogHeader>

        <div class="space-y-4 py-4">
          <div class="space-y-2">
            <Label>Текуща Наличност</Label>
            <div class="text-2xl font-bold">{{ selectedProduct?.stock }} броя</div>
          </div>

          <div class="space-y-2">
            <Label for="stock-amount">
              {{
                stockOperation === "add"
                  ? "Количество за Добавяне"
                  : stockOperation === "subtract"
                    ? "Количество за Премахване"
                    : "Ново Количество"
              }}
            </Label>
            <Input
              id="stock-amount"
              v-model="stockAmount"
              type="number"
              min="0"
              placeholder="Въведете количество"
              class="h-11"
              :class="{ 'border-destructive': updateError }"
            />
            <p v-if="updateError" class="text-xs text-destructive">
              {{ updateError }}
            </p>
          </div>

          <div v-if="stockOperation !== 'set' && stockAmount" class="space-y-2">
            <Label>Нова Наличност След Актуализация</Label>
            <div class="text-xl font-semibold text-primary">
              {{
                stockOperation === "add"
                  ? (selectedProduct?.stock || 0) + parseInt(stockAmount || "0")
                  : Math.max(0, (selectedProduct?.stock || 0) - parseInt(stockAmount || "0"))
              }}
              броя
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" @click="closeDialog" :disabled="isUpdating"> Откажи </Button>
          <Button @click="updateStock" :disabled="isUpdating || !stockAmount">
            <Loader2 v-if="isUpdating" class="mr-2 h-4 w-4 animate-spin" />
            {{ isUpdating ? "Актуализация..." : "Актуализирай" }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Price Update Dialog -->
    <Dialog :open="isPriceDialogOpen" @update:open="(open) => !open && closePriceDialog()">
      <DialogContent class="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Редактирай Базова Цена</DialogTitle>
          <DialogDescription>
            Актуализирай базовата цена за {{ selectedProductForPrice?.name }}
          </DialogDescription>
        </DialogHeader>

        <div class="space-y-4 py-4">
          <div class="space-y-2">
            <Label>Текуща Цена</Label>
            <div class="text-2xl font-bold">
              {{ selectedProductForPrice ? formatPrice(bgnToEur(selectedProductForPrice.price)) : '' }}
            </div>
          </div>

          <div class="space-y-2">
            <Label for="price-amount">Нова Цена (EUR)</Label>
            <Input
              id="price-amount"
              v-model="newPriceEur"
              type="number"
              min="0"
              step="0.01"
              placeholder="Въведете цена в EUR"
              class="h-11"
              :class="{ 'border-destructive': priceUpdateError }"
            />
            <p v-if="priceUpdateError" class="text-xs text-destructive">
              {{ priceUpdateError }}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" @click="closePriceDialog" :disabled="isUpdatingPrice"> Откажи </Button>
          <Button @click="updatePrice" :disabled="isUpdatingPrice || !newPriceEur">
            <Loader2 v-if="isUpdatingPrice" class="mr-2 h-4 w-4 animate-spin" />
            {{ isUpdatingPrice ? "Актуализация..." : "Актуализирай" }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
