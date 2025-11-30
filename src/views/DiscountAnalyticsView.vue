<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Loader2, AlertCircle, TrendingUp, Tag, Percent, Users } from 'lucide-vue-next';

type AnalyticsData = {
  totalDiscounts: number;
  activeDiscounts: number;
  totalUsage: number;
  totalRevenue: number;
  topDiscounts: Array<{
    name: string;
    usageCount: number;
    revenue: number;
  }>;
  recentActivity: Array<{
    discountName: string;
    couponCode?: string;
    usedAt: string;
    amount: number;
  }>;
};

const analytics = ref<AnalyticsData | null>(null);
const isLoading = ref(false);
const errorMessage = ref('');

const fetchAnalytics = async () => {
  isLoading.value = true;
  errorMessage.value = '';

  try {
    const response = await fetch('http://localhost:3030/api/discounts/analytics', {
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch analytics');
    }

    const result = await response.json();

    if (result.success) {
      analytics.value = result.data;
    }
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'Failed to load analytics';
  } finally {
    isLoading.value = false;
  }
};

const formatCurrency = (value: number) => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0.00 лв';
  }
  return `${value.toFixed(2)} лв`;
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('bg-BG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

onMounted(() => {
  fetchAnalytics();
});
</script>

<template>
  <div class="space-y-8 pb-8 pt-6">
    <!-- Header Section -->
    <div>
      <h1 class="text-4xl font-bold tracking-tight">Аналитика на отстъпките</h1>
      <p class="text-muted-foreground mt-1.5">
        Преглед на ефективността на вашите промоционални кампании
      </p>
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
      <!-- Stats Overview -->
      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">Общо отстъпки</CardTitle>
            <Tag class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">{{ analytics.totalDiscounts }}</div>
            <p class="text-xs text-muted-foreground">
              {{ analytics.activeDiscounts }} активни
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">Общо използвания</CardTitle>
            <Users class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">{{ analytics.totalUsage }}</div>
            <p class="text-xs text-muted-foreground">
              Всички отстъпки
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">Общ приход</CardTitle>
            <TrendingUp class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">{{ formatCurrency(analytics.totalRevenue) }}</div>
            <p class="text-xs text-muted-foreground">
              От поръчки с отстъпки
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle class="text-sm font-medium">Средна отстъпка</CardTitle>
            <Percent class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">
              {{ analytics.totalUsage > 0 ? ((analytics.totalRevenue / analytics.totalUsage)).toFixed(2) : '0' }} лв
            </div>
            <p class="text-xs text-muted-foreground">
              На използване
            </p>
          </CardContent>
        </Card>
      </div>

      <!-- Top Performing Discounts -->
      <Card>
        <CardHeader>
          <CardTitle>Най-използвани отстъпки</CardTitle>
          <CardDescription>Топ 5 отстъпки по брой използвания</CardDescription>
        </CardHeader>
        <CardContent>
          <div class="space-y-4">
            <div
              v-for="(discount, index) in analytics.topDiscounts.slice(0, 5)"
              :key="index"
              class="flex items-center justify-between p-4 rounded-lg bg-muted/50"
            >
              <div class="flex items-center gap-4">
                <div class="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold">
                  {{ index + 1 }}
                </div>
                <div>
                  <div class="font-semibold">{{ discount.name }}</div>
                  <div class="text-sm text-muted-foreground">
                    {{ discount.usageCount }} използвания
                  </div>
                </div>
              </div>
              <div class="text-right">
                <div class="font-semibold">{{ formatCurrency(discount.revenue) }}</div>
                <div class="text-sm text-muted-foreground">Приход</div>
              </div>
            </div>
            <div v-if="analytics.topDiscounts.length === 0" class="text-center py-8 text-muted-foreground">
              Няма данни за отстъпки
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Recent Activity -->
      <Card>
        <CardHeader>
          <CardTitle>Последна активност</CardTitle>
          <CardDescription>Последни използвания на отстъпки</CardDescription>
        </CardHeader>
        <CardContent>
          <div class="space-y-3">
            <div
              v-for="(activity, index) in analytics.recentActivity.slice(0, 10)"
              :key="index"
              class="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div>
                <div class="font-medium">{{ activity.discountName }}</div>
                <div class="text-sm text-muted-foreground">
                  {{ activity.couponCode ? `Код: ${activity.couponCode}` : 'Автоматична отстъпка' }}
                  • {{ formatDate(activity.usedAt) }}
                </div>
              </div>
              <div class="font-semibold text-green-600">
                -{{ formatCurrency(activity.amount) }}
              </div>
            </div>
            <div v-if="analytics.recentActivity.length === 0" class="text-center py-8 text-muted-foreground">
              Няма последна активност
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
