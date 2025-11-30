<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2, AlertCircle, Tag, Download, Copy, Plus } from 'lucide-vue-next';

type Coupon = {
  _id: string;
  code: string;
  discountPercentage: number;
  usageCount: number;
  expiresAt?: string;
  isActive: boolean;
};

const router = useRouter();
const searchQuery = ref('');
const coupons = ref<Coupon[]>([]);
const isLoading = ref(false);
const errorMessage = ref('');
const currentPage = ref(1);
const itemsPerPage = 15;

const fetchCoupons = async () => {
  isLoading.value = true;
  errorMessage.value = '';

  try {
    const response = await fetch('http://localhost:3030/api/coupons', {
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch coupons');
    }

    const result = await response.json();

    if (result.success && Array.isArray(result.data)) {
      coupons.value = result.data;
    }
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'Failed to load coupons';
  } finally {
    isLoading.value = false;
  }
};

const couponsByFilters = computed(() => {
  return coupons.value.filter((coupon) => {
    const matchesSearch =
      !searchQuery.value ||
      coupon.code.toLowerCase().includes(searchQuery.value.toLowerCase());

    return matchesSearch;
  });
});

const paginatedCoupons = computed(() => {
  const startIndex = (currentPage.value - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  return couponsByFilters.value.slice(startIndex, endIndex);
});

const totalItems = computed(() => couponsByFilters.value.length);
const totalPages = computed(() =>
  totalItems.value === 0 ? 1 : Math.ceil(totalItems.value / itemsPerPage)
);

const copyCouponCode = async (code: string) => {
  try {
    await navigator.clipboard.writeText(code);
    alert(`Код "${code}" копиран!`);
  } catch (error) {
    alert('Неуспешно копиране');
  }
};

const exportCoupons = async () => {
  try {
    const response = await fetch('http://localhost:3030/api/coupons/export', {
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to export coupons');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `coupons-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    alert(error instanceof Error ? error.message : 'Failed to export coupons');
  }
};

const formatDate = (dateString?: string) => {
  if (!dateString) return 'Няма';
  return new Date(dateString).toLocaleDateString('bg-BG');
};

const isExpired = (dateString?: string) => {
  if (!dateString) return false;
  return new Date(dateString) < new Date();
};

const previousPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
  }
};

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
  }
};

onMounted(() => {
  fetchCoupons();
});
</script>

<template>
  <div class="space-y-8 pb-8 pt-6">
    <!-- Header Section -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-4xl font-bold tracking-tight">Купони</h1>
        <p class="text-muted-foreground mt-1.5">
          Управлявайте купони и кодове за отстъпки
        </p>
      </div>
      <div class="flex gap-2">
        <Button @click="router.push('/coupons/create')" size="default">
          <Plus class="mr-2 h-4 w-4" />
          Създай купон
        </Button>
        <Button @click="exportCoupons" variant="outline" size="default">
          <Download class="mr-2 h-4 w-4" />
          Експорт CSV
        </Button>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Активни купони</CardTitle>
          <Tag class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">{{ coupons.filter(c => c.isActive && !isExpired(c.expiresAt)).length }}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Общо купони</CardTitle>
          <Tag class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">{{ coupons.length }}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium">Общо използвания</CardTitle>
          <Tag class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">{{ coupons.reduce((sum, c) => sum + c.usageCount, 0) }}</div>
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
            placeholder="Търсете купони по код или име на отстъпка..."
            class="pl-10"
          />
        </div>
      </CardContent>
    </Card>

    <!-- Error State -->
    <Card v-if="errorMessage" class="border-destructive">
      <CardContent class="pt-6">
        <div class="flex items-center gap-3 text-destructive">
          <AlertCircle class="h-5 w-5 flex-shrink-0" />
          <div>
            <p class="font-semibold">Неуспешно зареждане на купоните</p>
            <p class="text-sm">{{ errorMessage }}</p>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Coupons Table -->
    <Card>
      <CardContent class="p-0">
        <div v-if="isLoading" class="flex items-center justify-center py-20">
          <div class="text-center">
            <Loader2 class="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p class="text-lg text-muted-foreground">Зареждане на купони...</p>
          </div>
        </div>
        <div v-else>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Код</TableHead>
                <TableHead>Отстъпка</TableHead>
                <TableHead>Използвания</TableHead>
                <TableHead>Изтича на</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead class="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-if="!paginatedCoupons.length">
                <TableCell colspan="6" class="text-center py-12">
                  <div class="flex flex-col items-center gap-2">
                    <Tag class="h-12 w-12 text-muted-foreground/50" />
                    <p class="text-muted-foreground font-medium">Няма намерени купони</p>
                  </div>
                </TableCell>
              </TableRow>
              <TableRow
                v-for="coupon in paginatedCoupons"
                :key="coupon._id"
                class="hover:bg-muted/50"
              >
                <TableCell>
                  <div class="font-mono font-semibold">{{ coupon.code }}</div>
                </TableCell>
                <TableCell>
                  <span class="font-semibold">{{ coupon.discountPercentage }}%</span>
                </TableCell>
                <TableCell>
                  {{ coupon.usageCount || 0 }}
                </TableCell>
                <TableCell>
                  <span :class="{ 'text-destructive': isExpired(coupon.expiresAt) }">
                    {{ formatDate(coupon.expiresAt) }}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge :variant="coupon.isActive && !isExpired(coupon.expiresAt) ? 'default' : 'destructive'">
                    {{ coupon.isActive && !isExpired(coupon.expiresAt) ? 'Активен' : 'Неактивен' }}
                  </Badge>
                </TableCell>
                <TableCell class="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    @click="copyCouponCode(coupon.code)"
                    title="Копирай код"
                  >
                    <Copy class="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>

    <!-- Pagination -->
    <div class="flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
      <p class="text-sm text-muted-foreground">
        Показване на <span class="font-medium text-foreground">{{ (currentPage - 1) * itemsPerPage + 1 }}</span> до
        <span class="font-medium text-foreground">{{ Math.min(currentPage * itemsPerPage, totalItems) }}</span> от
        <span class="font-medium text-foreground">{{ totalItems }}</span> резултата
      </p>
      <div class="flex gap-2">
        <Button
          variant="outline"
          size="default"
          @click="previousPage"
          :disabled="currentPage === 1"
        >
          Предишна
        </Button>
        <Button
          variant="outline"
          size="default"
          @click="nextPage"
          :disabled="currentPage === totalPages"
        >
          Следваща
        </Button>
      </div>
    </div>
  </div>
</template>
