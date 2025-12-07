<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, TrendingUp, ShoppingCart, Package, Users, MessageSquare, Star, DollarSign, BarChart3, Calendar } from "lucide-vue-next";
import { apiGet } from "@/utils/api";

type AnalyticsData = {
  overview: {
    totalOrders: number;
    totalRevenue: number;
    totalProducts: number;
    activeProducts: number;
    totalCategories: number;
    totalUsers: number;
    totalReviews: number;
    totalContactMessages: number;
  };
  orders: {
    total: number;
    totalRevenue: number;
    byStatus: Array<{ _id: string; count: number; totalRevenue: number }>;
    revenue30Days: number;
    revenue7Days: number;
    revenueToday: number;
    orders30Days: number;
    orders7Days: number;
    ordersToday: number;
    revenueByDay: Array<{ _id: string; revenue: number; orders: number }>;
  };
  products: {
    total: number;
    active: number;
    inactive: number;
    averagePrice: number;
    totalStock: number;
    totalVariantStock: number;
    lowStockVariants: number;
    topProducts: Array<{
      productId: string;
      productName: string;
      totalRevenue: number;
      totalQuantity: number;
      orderCount: number;
    }>;
  };
  categories: {
    total: number;
    active: number;
  };
  users: {
    total: number;
    registered: number;
    guests: number;
  };
  reviews: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    averageRating: number;
    ratingDistribution: {
      1: number;
      2: number;
      3: number;
      4: number;
      5: number;
      [key: number]: number;
    };
  };
  contact: {
    total: number;
    unread: number;
    read: number;
    replied: number;
  };
  externalOrders: {
    total: number;
    pending: number;
    processing: number;
    shipped: number;
    delivered: number;
    cancelled: number;
  };
  recentOrders: Array<{
    _id: string;
    orderNumber: string;
    total: number;
    orderStatus: string;
    paymentStatus: string;
    createdAt: string;
    user?: {
      firstName: string;
      lastName: string;
      email: string;
    };
  }>;
};

const analytics = ref<AnalyticsData | null>(null);
const isLoading = ref(false);
const errorMessage = ref("");

const fetchAnalytics = async () => {
  isLoading.value = true;
  errorMessage.value = "";

  try {
    const result = await apiGet("admin/analytics");

    if (result.success) {
      analytics.value = result.data;
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "Failed to load analytics";
  } finally {
    isLoading.value = false;
  }
};

const formatCurrency = (value: number) => {
  if (value === null || value === undefined || isNaN(value)) {
    return "0.00 лв";
  }
  return `${value.toFixed(2)} лв`;
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("bg-BG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDateShort = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("bg-BG", {
    month: "short",
    day: "numeric",
  });
};

onMounted(() => {
  fetchAnalytics();
});
</script>

<template>
  <div class="space-y-8 pb-8 pt-6">
    <!-- Header Section -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-4xl font-bold tracking-tight">Табло</h1>
        <p class="text-muted-foreground mt-1.5">
          Преглед на цялостната статистика на платформата
        </p>
      </div>
      <Button
        @click="fetchAnalytics"
        :disabled="isLoading"
      >
        <BarChart3 class="h-4 w-4 mr-2" />
        Обнови
      </Button>
    </div>

    <!-- Error State -->
    <Card v-if="errorMessage" class="border-destructive">
      <CardContent class="pt-6">
        <div class="flex items-center gap-3 text-destructive">
          <AlertCircle class="h-5 w-5 flex-shrink-0" />
          <div>
            <p class="font-semibold">Неуспешно зареждане на аналитиката</p>
            <p class="text-sm">{{ errorMessage }}</p>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <div class="text-center">
        <Loader2 class="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
        <p class="text-lg text-muted-foreground">Зареждане на аналитика...</p>
      </div>
    </div>

    <!-- Analytics Content -->
    <div v-else-if="analytics" class="space-y-8">
      <!-- Overview Stats -->
      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">Общ приход</CardTitle>
            <DollarSign class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">
              {{ formatCurrency(analytics.overview.totalRevenue) }}
            </div>
            <p class="text-xs text-muted-foreground">
              От {{ analytics.overview.totalOrders }} поръчки
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">Активни продукти</CardTitle>
            <Package class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">{{ analytics.overview.activeProducts }}</div>
            <p class="text-xs text-muted-foreground">
              От {{ analytics.overview.totalProducts }} общо
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">Потребители</CardTitle>
            <Users class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">{{ analytics.overview.totalUsers }}</div>
            <p class="text-xs text-muted-foreground">
              Регистрирани и гости
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">Отзиви</CardTitle>
            <Star class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">{{ analytics.overview.totalReviews }}</div>
            <p class="text-xs text-muted-foreground">
              Средна оценка: {{ analytics.reviews.averageRating.toFixed(1) }}
            </p>
          </CardContent>
        </Card>
      </div>

      <!-- Revenue Stats -->
      <div class="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">Приход днес</CardTitle>
            <Calendar class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">
              {{ formatCurrency(analytics.orders.revenueToday) }}
            </div>
            <p class="text-xs text-muted-foreground">
              {{ analytics.orders.ordersToday }} поръчки
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">Приход последните 7 дни</CardTitle>
            <TrendingUp class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">
              {{ formatCurrency(analytics.orders.revenue7Days) }}
            </div>
            <p class="text-xs text-muted-foreground">
              {{ analytics.orders.orders7Days }} поръчки
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">Приход последните 30 дни</CardTitle>
            <BarChart3 class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">
              {{ formatCurrency(analytics.orders.revenue30Days) }}
            </div>
            <p class="text-xs text-muted-foreground">
              {{ analytics.orders.orders30Days }} поръчки
            </p>
          </CardContent>
        </Card>
      </div>

      <!-- Products & Inventory -->
      <div class="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Статистика за продукти</CardTitle>
            <CardDescription>Преглед на продуктите и наличността</CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="flex justify-between">
              <span class="text-sm text-muted-foreground">Общо продукти:</span>
              <span class="font-semibold">{{ analytics.products.total }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-sm text-muted-foreground">Активни:</span>
              <span class="font-semibold text-green-600">{{ analytics.products.active }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-sm text-muted-foreground">Неактивни:</span>
              <span class="font-semibold text-gray-600">{{ analytics.products.inactive }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-sm text-muted-foreground">Средна цена:</span>
              <span class="font-semibold">{{ formatCurrency(analytics.products.averagePrice) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-sm text-muted-foreground">Общо наличност:</span>
              <span class="font-semibold">{{ analytics.products.totalVariantStock || analytics.products.totalStock }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-sm text-muted-foreground">Варианти с ниска наличност:</span>
              <span class="font-semibold text-orange-600">{{ analytics.products.lowStockVariants }}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Топ продукти</CardTitle>
            <CardDescription>Най-продавани продукти по приход</CardDescription>
          </CardHeader>
          <CardContent>
            <div v-if="analytics.products.topProducts.length === 0" class="text-sm text-muted-foreground text-center py-4">
              Няма данни за продажби
            </div>
            <div v-else class="space-y-3">
              <div
                v-for="(product, index) in analytics.products.topProducts.slice(0, 5)"
                :key="product.productId"
                class="flex items-center justify-between p-2 rounded-lg border"
              >
                <div class="flex items-center gap-3">
                  <span class="text-sm font-semibold text-muted-foreground">#{{ index + 1 }}</span>
                  <div>
                    <p class="text-sm font-medium">{{ product.productName }}</p>
                    <p class="text-xs text-muted-foreground">
                      {{ product.orderCount }} поръчки • {{ product.totalQuantity }} броя
                    </p>
                  </div>
                </div>
                <span class="text-sm font-semibold">{{ formatCurrency(product.totalRevenue) }}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Orders Status & Reviews -->
      <div class="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Статус на поръчките</CardTitle>
            <CardDescription>Разпределение по статус</CardDescription>
          </CardHeader>
          <CardContent>
            <div v-if="analytics.orders.byStatus.length === 0" class="text-sm text-muted-foreground text-center py-4">
              Няма данни
            </div>
            <div v-else class="space-y-3">
              <div
                v-for="status in analytics.orders.byStatus"
                :key="status._id"
                class="flex items-center justify-between p-2 rounded-lg border"
              >
                <div class="flex items-center gap-3">
                  <ShoppingCart class="h-4 w-4 text-muted-foreground" />
                  <span class="text-sm font-medium capitalize">{{ status._id }}</span>
                </div>
                <div class="text-right">
                  <p class="text-sm font-semibold">{{ status.count }} поръчки</p>
                  <p class="text-xs text-muted-foreground">{{ formatCurrency(status.totalRevenue) }}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Статистика за отзиви</CardTitle>
            <CardDescription>Преглед на отзивите</CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="flex justify-between">
              <span class="text-sm text-muted-foreground">Общо отзиви:</span>
              <span class="font-semibold">{{ analytics.reviews.total }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-sm text-muted-foreground">Одобрени:</span>
              <span class="font-semibold text-green-600">{{ analytics.reviews.approved }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-sm text-muted-foreground">В очакване:</span>
              <span class="font-semibold text-orange-600">{{ analytics.reviews.pending }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-sm text-muted-foreground">Отхвърлени:</span>
              <span class="font-semibold text-red-600">{{ analytics.reviews.rejected }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-sm text-muted-foreground">Средна оценка:</span>
              <span class="font-semibold">{{ analytics.reviews.averageRating.toFixed(1) }} / 5.0</span>
            </div>
            <div class="mt-4 pt-4 border-t">
              <p class="text-xs text-muted-foreground mb-2">Разпределение по оценки:</p>
              <div class="space-y-1">
                <div
                  v-for="rating in [5, 4, 3, 2, 1]"
                  :key="rating"
                  class="flex items-center justify-between text-xs"
                >
                  <span>{{ rating }} звезди:</span>
                  <span class="font-semibold">{{ analytics.reviews.ratingDistribution[rating as keyof typeof analytics.reviews.ratingDistribution] || 0 }}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Contact Messages & External Orders -->
      <div class="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Съобщения за контакт</CardTitle>
            <CardDescription>Статистика за съобщенията</CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="flex justify-between">
              <span class="text-sm text-muted-foreground">Общо съобщения:</span>
              <span class="font-semibold">{{ analytics.contact.total }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-sm text-muted-foreground">Непрочетени:</span>
              <span class="font-semibold text-orange-600">{{ analytics.contact.unread }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-sm text-muted-foreground">Прочетени:</span>
              <span class="font-semibold text-blue-600">{{ analytics.contact.read }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-sm text-muted-foreground">Отговорени:</span>
              <span class="font-semibold text-green-600">{{ analytics.contact.replied }}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Външни поръчки</CardTitle>
            <CardDescription>Статистика за външни поръчки</CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="flex justify-between">
              <span class="text-sm text-muted-foreground">Общо:</span>
              <span class="font-semibold">{{ analytics.externalOrders.total || 0 }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-sm text-muted-foreground">В очакване:</span>
              <span class="font-semibold text-orange-600">{{ analytics.externalOrders.pending || 0 }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-sm text-muted-foreground">В обработка:</span>
              <span class="font-semibold text-blue-600">{{ analytics.externalOrders.processing || 0 }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-sm text-muted-foreground">Изпратени:</span>
              <span class="font-semibold text-purple-600">{{ analytics.externalOrders.shipped || 0 }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-sm text-muted-foreground">Доставени:</span>
              <span class="font-semibold text-green-600">{{ analytics.externalOrders.delivered || 0 }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-sm text-muted-foreground">Отменени:</span>
              <span class="font-semibold text-red-600">{{ analytics.externalOrders.cancelled || 0 }}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Recent Orders -->
      <Card>
        <CardHeader>
          <CardTitle>Последни поръчки</CardTitle>
          <CardDescription>Последните 10 поръчки</CardDescription>
        </CardHeader>
        <CardContent>
          <div v-if="analytics.recentOrders.length === 0" class="text-sm text-muted-foreground text-center py-4">
            Няма поръчки
          </div>
          <div v-else class="space-y-3">
            <div
              v-for="order in analytics.recentOrders"
              :key="order._id"
              class="flex items-center justify-between p-3 rounded-lg border"
            >
              <div class="flex-1">
                <p class="text-sm font-medium">#{{ order.orderNumber }}</p>
                <p class="text-xs text-muted-foreground">
                  {{ order.user ? `${order.user.firstName} ${order.user.lastName}` : "Гост" }} • {{ formatDate(order.createdAt) }}
                </p>
              </div>
              <div class="text-right">
                <p class="text-sm font-semibold">{{ formatCurrency(order.total) }}</p>
                <div class="flex items-center gap-2 mt-1">
                  <span
                    class="text-xs px-2 py-0.5 rounded capitalize"
                    :class="{
                      'bg-orange-100 text-orange-800': order.orderStatus === 'pending',
                      'bg-blue-100 text-blue-800': order.orderStatus === 'processing',
                      'bg-green-100 text-green-800': order.orderStatus === 'completed',
                      'bg-red-100 text-red-800': order.orderStatus === 'cancelled',
                    }"
                  >
                    {{ order.orderStatus }}
                  </span>
                  <span
                    class="text-xs px-2 py-0.5 rounded"
                    :class="{
                      'bg-green-100 text-green-800': order.paymentStatus === 'paid',
                      'bg-yellow-100 text-yellow-800': order.paymentStatus === 'pending',
                      'bg-red-100 text-red-800': order.paymentStatus === 'failed',
                    }"
                  >
                    {{ order.paymentStatus }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
