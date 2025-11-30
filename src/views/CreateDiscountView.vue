<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Loader2 } from 'lucide-vue-next';

const router = useRouter();

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
  name: '',
  type: 'percentage',
  value: 0,
  scope: 'product',
  applicableProducts: [] as string[],
  applicableCategories: [] as string[],
  endDate: '',
  isActive: true,
});

const isSubmitting = ref(false);
const errorMessage = ref('');

const fetchProducts = async () => {
  loadingProducts.value = true;
  try {
    const response = await fetch('http://localhost:3030/api/products?limit=1000', {
      credentials: 'include',
    });

    if (response.ok) {
      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        products.value = result.data;
        const uniqueCategories = [...new Set(result.data.map((p: Product) => p.category))];
        categories.value = uniqueCategories.filter(Boolean);
      }
    }
  } catch (error) {
    console.error('Failed to load products:', error);
  } finally {
    loadingProducts.value = false;
  }
};

watch(() => form.value.scope, (newScope) => {
  if (newScope !== 'product') {
    form.value.applicableProducts = [];
  }
  if (newScope !== 'category') {
    form.value.applicableCategories = [];
  }
});

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
  errorMessage.value = '';

  try {
    if (form.value.scope === 'product' && form.value.applicableProducts.length === 0) {
      throw new Error('Моля изберете поне един продукт');
    }
    if (form.value.scope === 'category' && form.value.applicableCategories.length === 0) {
      throw new Error('Моля изберете поне една категория');
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

    if (form.value.scope === 'product' && form.value.applicableProducts.length > 0) {
      data.applicableProducts = form.value.applicableProducts;
    }

    if (form.value.scope === 'category' && form.value.applicableCategories.length > 0) {
      data.applicableCategories = form.value.applicableCategories;
    }

    const response = await fetch('http://localhost:3030/api/discounts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create discount');
    }

    router.push('/discounts');
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Failed to create discount';
  } finally {
    isSubmitting.value = false;
  }
};

onMounted(() => {
  fetchProducts();
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
        <h1 class="text-4xl font-bold tracking-tight">Създай отстъпка</h1>
        <p class="text-muted-foreground mt-1.5">
          Бърза и лесна отстъпка
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
            <Input
              id="name"
              v-model="form.name"
              placeholder="напр. Лятна разпродажба"
              required
            />
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
              <Label for="value">
                Стойност <span class="text-destructive">*</span>
              </Label>
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

            <div v-else class="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto border rounded-lg p-4">
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
            <Input
              id="endDate"
              v-model="form.endDate"
              type="datetime-local"
            />
            <p class="text-xs text-muted-foreground">Оставете празно за неограничена валидност</p>
          </div>
        </CardContent>
      </Card>

      <!-- Error Message -->
      <div v-if="errorMessage" class="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-lg">
        {{ errorMessage }}
      </div>

      <!-- Submit -->
      <div class="flex gap-4">
        <Button type="submit" :disabled="isSubmitting" class="flex-1">
          <Loader2 v-if="isSubmitting" class="mr-2 h-4 w-4 animate-spin" />
          {{ isSubmitting ? 'Създаване...' : 'Създай отстъпка' }}
        </Button>
        <Button type="button" variant="outline" @click="router.push('/discounts')">
          Отказ
        </Button>
      </div>
    </form>
  </div>
</template>
