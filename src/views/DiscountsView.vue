<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Loader2,
  AlertCircle,
  Tag,
  Percent,
} from "lucide-vue-next";
import { apiGet, apiPut, apiDelete } from "@/utils/api";

type Discount = {
  _id: string;
  name: string;
  type: "percentage" | "fixed_amount" | "buy_x_get_y" | "free_shipping";
  value: number;
  scope: "product" | "category" | "cart" | "shipping";
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  usageCount: number;
  usageLimit?: number;
  conditions?: {
    minPurchaseAmount?: number;
    customerSegment?: string;
  };
};

const router = useRouter();

const searchQuery = ref("");
const selectedType = ref<string | undefined>(undefined);
const selectedStatus = ref<string | undefined>(undefined);
const currentPage = ref(1);
const itemsPerPage = 10;

const discounts = ref<Discount[]>([]);
const isLoading = ref(false);
const errorMessage = ref("");
const showDeleteDialog = ref(false);
const discountToDelete = ref<string | null>(null);

const fetchDiscounts = async () => {
  isLoading.value = true;
  errorMessage.value = "";

  try {
    const result = await apiGet("discounts");

    if (result.success && Array.isArray(result.data)) {
      discounts.value = result.data;
    }
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : "Failed to load discounts";
  } finally {
    isLoading.value = false;
  }
};

const discountsByFilters = computed(() => {
  return discounts.value.filter((discount) => {
    const matchesSearch =
      !searchQuery.value ||
      discount.name.toLowerCase().includes(searchQuery.value.toLowerCase());

    const matchesType =
      !selectedType.value ||
      selectedType.value === "all" ||
      discount.type === selectedType.value;

    const matchesStatus =
      !selectedStatus.value ||
      selectedStatus.value === "all" ||
      (selectedStatus.value === "active" && discount.isActive) ||
      (selectedStatus.value === "inactive" && !discount.isActive);

    return matchesSearch && matchesType && matchesStatus;
  });
});

const paginatedDiscounts = computed(() => {
  const startIndex = (currentPage.value - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  return discountsByFilters.value.slice(startIndex, endIndex);
});

const totalItems = computed(() => discountsByFilters.value.length);
const totalPages = computed(() =>
  totalItems.value === 0 ? 1 : Math.ceil(totalItems.value / itemsPerPage)
);

const formatDiscountType = (type: string) => {
  const types: Record<string, string> = {
    percentage: "Процент",
    fixed_amount: "Фиксирана сума",
    buy_x_get_y: "Купи X Вземи Y",
    free_shipping: "Безплатна доставка",
  };
  return types[type] || type;
};

const formatDiscountValue = (discount: Discount) => {
  if (discount.type === "percentage") {
    return `${discount.value}%`;
  } else if (discount.type === "fixed_amount") {
    return `${discount.value} лв`;
  } else if (discount.type === "free_shipping") {
    return "Безплатна";
  }
  return discount.value.toString();
};

const formatScope = (scope: string) => {
  const scopes: Record<string, string> = {
    product: "Продукт",
    category: "Категория",
    cart: "Количка",
    shipping: "Доставка",
  };
  return scopes[scope] || scope;
};

const toggleDiscountStatus = async (discount: Discount) => {
  try {
    await apiPut(`discounts/${discount._id}`, {
      ...discount,
      isActive: !discount.isActive,
    });

    await fetchDiscounts();
  } catch (error) {
    alert(error instanceof Error ? error.message : "Failed to update discount");
  }
};

const confirmDelete = (id: string) => {
  discountToDelete.value = id;
  showDeleteDialog.value = true;
};

const deleteDiscount = async () => {
  if (!discountToDelete.value) return;

  try {
    await apiDelete(`discounts/${discountToDelete.value}`);

    discounts.value = discounts.value.filter(
      (d) => d._id !== discountToDelete.value
    );
    showDeleteDialog.value = false;
    discountToDelete.value = null;
  } catch (error) {
    alert(error instanceof Error ? error.message : "Failed to delete discount");
  }
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

const navigateToCoupons = () => {
  router.push("/coupons");
};

const navigateToAnalytics = () => {
  router.push("/discount-analytics");
};

onMounted(() => {
  fetchDiscounts();
});
</script>

<template>
  <div class="space-y-8 pb-8 pt-6">
    <!-- Header Section -->
    <div
      class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
    >
      <div>
        <h1 class="text-4xl font-bold tracking-tight">Отстъпки</h1>
        <p class="text-muted-foreground mt-1.5">
          Управлявайте отстъпки и промоционални кампании
        </p>
      </div>
      <div class="flex gap-2">
        <Button @click="router.push('/discounts/create')" size="default">
          <Plus class="mr-2 h-4 w-4" />
          Създай отстъпка
        </Button>
        <Button @click="navigateToCoupons" variant="outline" size="default">
          <Tag class="mr-2 h-4 w-4" />
          Купони
        </Button>
        <Button @click="navigateToAnalytics" variant="outline" size="default">
          <Percent class="mr-2 h-4 w-4" />
          Аналитика
        </Button>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader
          class="flex flex-row items-center justify-between space-y-0 pb-2"
        >
          <CardTitle class="text-sm font-medium">Активни отстъпки</CardTitle>
          <Tag class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">
            {{ discounts.filter((d) => d.isActive).length }}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader
          class="flex flex-row items-center justify-between space-y-0 pb-2"
        >
          <CardTitle class="text-sm font-medium">Общо отстъпки</CardTitle>
          <Percent class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">{{ discounts.length }}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader
          class="flex flex-row items-center justify-between space-y-0 pb-2"
        >
          <CardTitle class="text-sm font-medium">Общо използвания</CardTitle>
          <Tag class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">
            {{ discounts.reduce((sum, d) => sum + d.usageCount, 0) }}
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Search and Filters -->
    <Card>
      <CardContent class="pt-6">
        <div class="flex flex-col sm:flex-row gap-4">
          <div class="flex-1 relative">
            <Search
              class="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4"
            />
            <Input
              v-model="searchQuery"
              type="text"
              placeholder="Търсете отстъпки по име..."
              class="pl-10"
            />
          </div>
          <Select v-model="selectedType">
            <SelectTrigger class="w-full sm:w-[200px]">
              <SelectValue placeholder="Всички типове" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Всички типове</SelectItem>
              <SelectItem value="percentage">Процент</SelectItem>
              <SelectItem value="fixed_amount">Фиксирана сума</SelectItem>
              <SelectItem value="buy_x_get_y">Купи X Вземи Y</SelectItem>
              <SelectItem value="free_shipping">Безплатна доставка</SelectItem>
            </SelectContent>
          </Select>
          <Select v-model="selectedStatus">
            <SelectTrigger class="w-full sm:w-[200px]">
              <SelectValue placeholder="Всички статуси" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Всички статуси</SelectItem>
              <SelectItem value="active">Активни</SelectItem>
              <SelectItem value="inactive">Неактивни</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>

    <!-- Error State -->
    <Card v-if="errorMessage" class="border-destructive">
      <CardContent class="pt-6">
        <div class="flex items-center gap-3 text-destructive">
          <AlertCircle class="h-5 w-5 flex-shrink-0" />
          <div>
            <p class="font-semibold">Неуспешно зареждане на отстъпките</p>
            <p class="text-sm">{{ errorMessage }}</p>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Discounts Table -->
    <Card>
      <CardContent class="p-0">
        <div v-if="isLoading" class="flex items-center justify-center py-20">
          <div class="text-center">
            <Loader2 class="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p class="text-lg text-muted-foreground">
              Зареждане на отстъпки...
            </p>
          </div>
        </div>
        <div v-else>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Име</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead>Стойност</TableHead>
                <TableHead>Обхват</TableHead>
                <TableHead>Използвания</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead class="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-if="!paginatedDiscounts.length">
                <TableCell colspan="7" class="text-center py-12">
                  <div class="flex flex-col items-center gap-2">
                    <Tag class="h-12 w-12 text-muted-foreground/50" />
                    <p class="text-muted-foreground font-medium">
                      Няма намерени отстъпки
                    </p>
                    <p class="text-sm text-muted-foreground">
                      Опитайте да промените търсенето или филтрите
                    </p>
                  </div>
                </TableCell>
              </TableRow>
              <TableRow
                v-for="discount in paginatedDiscounts"
                :key="discount._id"
                class="hover:bg-muted/50"
              >
                <TableCell>
                  <div class="font-medium">{{ discount.name }}</div>
                  <div
                    v-if="discount.conditions?.minPurchaseAmount"
                    class="text-sm text-muted-foreground"
                  >
                    Мин. {{ discount.conditions.minPurchaseAmount }} лв
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{{
                    formatDiscountType(discount.type)
                  }}</Badge>
                </TableCell>
                <TableCell class="font-semibold">{{
                  formatDiscountValue(discount)
                }}</TableCell>
                <TableCell>{{ formatScope(discount.scope) }}</TableCell>
                <TableCell>
                  <div class="text-sm">
                    {{ discount.usageCount
                    }}{{
                      discount.usageLimit ? ` / ${discount.usageLimit}` : ""
                    }}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    :variant="discount.isActive ? 'default' : 'destructive'"
                  >
                    {{ discount.isActive ? "Активна" : "Неактивна" }}
                  </Badge>
                </TableCell>
                <TableCell class="text-right">
                  <div class="flex justify-end space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      @click="router.push(`/discounts/edit/${discount._id}`)"
                      title="Редактирай"
                    >
                      <Edit class="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      @click="confirmDelete(discount._id)"
                    >
                      <Trash2 class="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>

    <!-- Pagination -->
    <div
      class="flex flex-col sm:flex-row items-center justify-between gap-4 px-2"
    >
      <p class="text-sm text-muted-foreground">
        Показване на
        <span class="font-medium text-foreground">{{
          (currentPage - 1) * itemsPerPage + 1
        }}</span>
        до
        <span class="font-medium text-foreground">{{
          Math.min(currentPage * itemsPerPage, totalItems)
        }}</span>
        от
        <span class="font-medium text-foreground">{{ totalItems }}</span>
        резултата
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

    <!-- Delete Confirmation Dialog -->
    <Dialog v-model:open="showDeleteDialog">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Изтриване на отстъпка</DialogTitle>
          <DialogDescription>
            Сигурни ли сте, че искате да изтриете тази отстъпка? Това действие
            не може да бъде отменено.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" @click="showDeleteDialog = false">
            Отказ
          </Button>
          <Button variant="destructive" @click="deleteDiscount">
            Изтрий
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
