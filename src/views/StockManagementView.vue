<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Loader2, Package, Plus, Minus, Edit2, AlertCircle, Search } from 'lucide-vue-next';

type ProductImage = {
  url: string;
  publicId: string;
};

type Product = {
  _id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  isActive: boolean;
  image?: ProductImage;
};

const products = ref<Product[]>([]);
const isLoading = ref(false);
const errorMessage = ref('');
const searchQuery = ref('');
const fallbackImageUrl = 'https://via.placeholder.com/80?text=No+Image';

// Dialog state
const isDialogOpen = ref(false);
const selectedProduct = ref<Product | null>(null);
const stockOperation = ref<'set' | 'add' | 'subtract'>('add');
const stockAmount = ref('');
const isUpdating = ref(false);
const updateError = ref('');

const fetchProducts = async () => {
  isLoading.value = true;
  errorMessage.value = '';

  try {
    const response = await fetch('http://localhost:3030/api/products?limit=100', {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch products');
    }

    const result = await response.json();

    if (result.success && Array.isArray(result.data)) {
      products.value = result.data;
    }
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'Failed to load products';
  } finally {
    isLoading.value = false;
  }
};

const filteredProducts = computed(() => {
  if (!searchQuery.value.trim()) {
    return products.value;
  }

  const query = searchQuery.value.toLowerCase();
  return products.value.filter(
    (p) =>
      p.name.toLowerCase().includes(query) ||
      p.category.toLowerCase().includes(query)
  );
});

const lowStockProducts = computed(() => {
  return products.value.filter((p) => p.stock <= 10);
});

const outOfStockProducts = computed(() => {
  return products.value.filter((p) => p.stock === 0);
});

const openStockDialog = (product: Product, operation: 'set' | 'add' | 'subtract') => {
  selectedProduct.value = product;
  stockOperation.value = operation;
  stockAmount.value = '';
  updateError.value = '';
  isDialogOpen.value = true;
};

const closeDialog = () => {
  isDialogOpen.value = false;
  selectedProduct.value = null;
  stockAmount.value = '';
  updateError.value = '';
};

const updateStock = async () => {
  if (!selectedProduct.value) return;

  const amount = parseInt(stockAmount.value);
  if (isNaN(amount) || amount < 0) {
    updateError.value = 'Моля, въведете валидно количество';
    return;
  }

  isUpdating.value = true;
  updateError.value = '';

  try {
    const response = await fetch(
      `http://localhost:3030/api/products/${selectedProduct.value._id}/stock`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          stock: amount,
          operation: stockOperation.value,
        }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to update stock');
    }

    const result = await response.json();

    if (result.success && result.data) {
      // Update the product in the list
      const index = products.value.findIndex((p) => p._id === result.data._id);
      if (index !== -1) {
        products.value[index] = result.data;
      }

      closeDialog();
    } else {
      throw new Error(result.message || 'Failed to update stock');
    }
  } catch (error) {
    updateError.value =
      error instanceof Error ? error.message : 'Failed to update stock';
  } finally {
    isUpdating.value = false;
  }
};

const getStockStatus = (stock: number) => {
  if (stock === 0) return { label: 'Изчерпан', variant: 'destructive' as const };
  if (stock <= 10) return { label: 'Малка Наличност', variant: 'secondary' as const };
  return { label: 'На Склад', variant: 'default' as const };
};

const formatCategory = (category: string) => {
  return category
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
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
              <p class="text-3xl font-bold text-orange-600">{{ lowStockProducts.length }}</p>
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
              <p class="text-3xl font-bold text-destructive">{{ outOfStockProducts.length }}</p>
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
              <TableHead class="w-[60px]">Снимка</TableHead>
              <TableHead>Продукт</TableHead>
              <TableHead>Категория</TableHead>
              <TableHead>Цена</TableHead>
              <TableHead>Текуща Наличност</TableHead>
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
            <TableRow v-for="product in filteredProducts" :key="product._id">
              <TableCell>
                  <img
                  :src="product.images?.[0]?.url ?? fallbackImageUrl"
                  :alt="product.name"
                  class="w-12 h-12 rounded-md object-contain bg-muted"
                />
              </TableCell>
              <TableCell>
                <div class="font-medium">{{ product.name }}</div>
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{{ formatCategory(product.category) }}</Badge>
              </TableCell>
              <TableCell>{{ formatPrice(product.price) }}</TableCell>
              <TableCell>
                <span class="text-lg font-semibold">{{ product.stock }}</span>
                <span class="text-muted-foreground text-sm ml-1">броя</span>
              </TableCell>
              <TableCell>
                <Badge :variant="getStockStatus(product.stock).variant">
                  {{ getStockStatus(product.stock).label }}
                </Badge>
              </TableCell>
              <TableCell class="text-right">
                <div class="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    @click="openStockDialog(product, 'add')"
                    title="Add stock"
                  >
                    <Plus class="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    @click="openStockDialog(product, 'subtract')"
                    title="Remove stock"
                  >
                    <Minus class="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    @click="openStockDialog(product, 'set')"
                    title="Set stock"
                  >
                    <Edit2 class="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
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
              stockOperation === 'add'
                ? 'Добави Наличност'
                : stockOperation === 'subtract'
                ? 'Премахни Наличност'
                : 'Зададе Наличност'
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
                stockOperation === 'add'
                  ? 'Количество за Добавяне'
                  : stockOperation === 'subtract'
                  ? 'Количество за Премахване'
                  : 'Ново Количество'
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
            <p v-if="updateError" class="text-xs text-destructive">{{ updateError }}</p>
          </div>

          <div v-if="stockOperation !== 'set' && stockAmount" class="space-y-2">
            <Label>Нова Наличност След Актуализация</Label>
            <div class="text-xl font-semibold text-primary">
              {{
                stockOperation === 'add'
                  ? (selectedProduct?.stock || 0) + parseInt(stockAmount || '0')
                  : Math.max(0, (selectedProduct?.stock || 0) - parseInt(stockAmount || '0'))
              }}
              броя
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" @click="closeDialog" :disabled="isUpdating">
            Откажи
          </Button>
          <Button @click="updateStock" :disabled="isUpdating || !stockAmount">
            <Loader2 v-if="isUpdating" class="mr-2 h-4 w-4 animate-spin" />
            {{ isUpdating ? 'Актуализация...' : 'Актуализирай' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

