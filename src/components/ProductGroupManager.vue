<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Link2, Unlink, Package, AlertCircle } from 'lucide-vue-next';
import { apiGet, apiPost } from '@/utils/api';

interface Props {
  productId: string;
  productName: string;
}

const props = defineProps<Props>();

interface ProductGroupInfo {
  productId: string;
  isStockMaster: boolean;
  hasMaster: boolean;
  master?: {
    _id: string;
    name: string;
  };
  children?: Array<{
    _id: string;
    name: string;
  }>;
  childrenCount?: number;
}

interface Product {
  _id: string;
  name: string;
  variants?: any[];
}

const groupInfo = ref<ProductGroupInfo | null>(null);
const availableMasters = ref<Product[]>([]);
const selectedMasterId = ref<string>('');
const loading = ref(false);
const error = ref<string>('');

// Computed state
const isIndependent = computed(() => !groupInfo.value?.hasMaster && !groupInfo.value?.isStockMaster);
const isChild = computed(() => groupInfo.value?.hasMaster);
const isMaster = computed(() => groupInfo.value?.isStockMaster);

// Fetch product group info
const fetchGroupInfo = async () => {
  try {
    const response = await apiGet(`product-groups/${props.productId}/info`);
    groupInfo.value = response;
  } catch (err: any) {
    console.error('Error fetching group info:', err);
    error.value = err.message || 'Failed to fetch group info';
  }
};

// Fetch available master products
const fetchAvailableMasters = async () => {
  try {
    const response = await apiGet('products?limit=100');
    if (response.success && response.data) {
      // Filter: only products with variants, exclude self, exclude children
      availableMasters.value = response.data.filter((p: Product) => {
        return (
          p._id !== props.productId && // Not self
          p.variants && p.variants.length > 0 // Has variants
        );
      });
    }
  } catch (err: any) {
    console.error('Error fetching products:', err);
  }
};

// Link to master
const linkToMaster = async () => {
  if (!selectedMasterId.value) {
    alert('Моля, изберете главен продукт');
    return;
  }

  loading.value = true;
  error.value = '';

  try {
    await apiPost('product-groups/link', {
      childProductId: props.productId,
      masterProductId: selectedMasterId.value,
    });

    alert('✅ Успешно! Продуктът е свързан с главния продукт.');
    
    // Refresh data
    await fetchGroupInfo();
    selectedMasterId.value = '';
  } catch (err: any) {
    console.error('Error linking product:', err);
    alert(err.message || 'Failed to link product');
  } finally {
    loading.value = false;
  }
};

// Unlink from master
const unlinkFromMaster = async () => {
  if (!confirm('Сигурни ли сте, че искате да премахнете връзката с главния продукт?')) {
    return;
  }

  loading.value = true;
  error.value = '';

  try {
    await apiPost('product-groups/unlink', {
      childProductId: props.productId,
    });

    alert('✅ Успешно! Продуктът вече не споделя наличност.');
    
    // Refresh data
    await fetchGroupInfo();
  } catch (err: any) {
    console.error('Error unlinking product:', err);
    alert(err.message || 'Failed to unlink product');
  } finally {
    loading.value = false;
  }
};

onMounted(async () => {
  await fetchGroupInfo();
  await fetchAvailableMasters();
});
</script>

<template>
  <Card>
    <CardHeader>
      <div class="flex items-center gap-2">
        <Package class="h-5 w-5 text-primary" />
        <div>
          <CardTitle>Споделяне на наличност (Product Group)</CardTitle>
          <CardDescription>
            Свържете този продукт с главен продукт за споделяне на наличност
          </CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent class="space-y-4">
      <!-- Loading State -->
      <div v-if="!groupInfo" class="text-center py-4 text-muted-foreground">
        Зареждане...
      </div>

      <!-- Independent Product State -->
      <div v-else-if="isIndependent" class="space-y-4">
        <div class="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
          <AlertCircle class="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div class="text-sm text-blue-900 dark:text-blue-100">
            <p class="font-medium">Този продукт има собствена наличност</p>
            <p class="text-xs mt-1 text-blue-700 dark:text-blue-300">
              Можете да го свържете с главен продукт за споделяне на наличност
            </p>
          </div>
        </div>

        <div class="space-y-2">
          <label class="text-sm font-medium">Свържи с главен продукт:</label>
          <div class="flex gap-2">
            <Select v-model="selectedMasterId">
              <SelectTrigger class="flex-1">
                <SelectValue placeholder="Избери главен продукт..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="master in availableMasters"
                  :key="master._id"
                  :value="master._id"
                >
                  {{ master.name }}
                </SelectItem>
              </SelectContent>
            </Select>
            <Button
              @click="linkToMaster"
              :disabled="!selectedMasterId || loading"
              class="gap-2"
            >
              <Link2 class="h-4 w-4" />
              Свържи
            </Button>
          </div>
          <p class="text-xs text-muted-foreground">
            След свързване, този продукт ще използва наличността на главния продукт
          </p>
        </div>
      </div>

      <!-- Child Product State -->
      <div v-else-if="isChild" class="space-y-4">
        <div class="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
          <Link2 class="h-5 w-5 text-green-600 dark:text-green-400" />
          <div class="flex-1">
            <p class="text-sm font-medium text-green-900 dark:text-green-100">
              Споделя наличност с:
            </p>
            <p class="text-sm text-green-700 dark:text-green-300 font-semibold">
              {{ groupInfo.master?.name }}
            </p>
          </div>
          <Badge variant="outline" class="bg-green-100 dark:bg-green-900">
            Дете продукт
          </Badge>
        </div>

        <div class="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950 rounded-lg">
          <AlertCircle class="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div class="text-sm text-amber-900 dark:text-amber-100">
            <p class="font-medium">Наличността се управлява от главния продукт</p>
            <p class="text-xs mt-1 text-amber-700 dark:text-amber-300">
              Не можете да редактирате наличността директно. Промените се правят в главния продукт.
            </p>
          </div>
        </div>

        <Button
          @click="unlinkFromMaster"
          variant="outline"
          :disabled="loading"
          class="gap-2 w-full"
        >
          <Unlink class="h-4 w-4" />
          Премахни връзката
        </Button>
      </div>

      <!-- Master Product State -->
      <div v-else-if="isMaster" class="space-y-4">
        <div class="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
          <Package class="h-5 w-5 text-purple-600 dark:text-purple-400" />
          <div class="flex-1">
            <p class="text-sm font-medium text-purple-900 dark:text-purple-100">
              Главен продукт
            </p>
            <p class="text-xs text-purple-700 dark:text-purple-300">
              Този продукт управлява наличността за {{ groupInfo.childrenCount }} свързани продукта
            </p>
          </div>
          <Badge variant="outline" class="bg-purple-100 dark:bg-purple-900">
            Главен
          </Badge>
        </div>

        <div v-if="groupInfo.children && groupInfo.children.length > 0" class="space-y-2">
          <p class="text-sm font-medium">Свързани продукти ({{ groupInfo.children.length }}):</p>
          <div class="space-y-1">
            <div
              v-for="child in groupInfo.children"
              :key="child._id"
              class="flex items-center justify-between p-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
            >
              <span class="text-sm">{{ child.name }}</span>
              <Button
                variant="ghost"
                size="sm"
                @click="$router.push(`/products/edit/${child._id}`)"
                class="h-7 text-xs"
              >
                Редактирай
              </Button>
            </div>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
