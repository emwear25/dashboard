<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useRouter } from "vue-router";
import { apiGet, apiDelete } from "@/utils/api";
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
  Search,
  Plus,
  Edit,
  Trash2,
  Loader2,
  AlertCircle,
  Package,
  Eye,
} from "lucide-vue-next";

type ProductImage = {
  url: string;
  publicId: string;
};

type Product = {
  _id: string;
  name: string;
  category:
    | string
    | { _id: string; name: string; slug: string; displayName: string }
    | null;
  price: number;
  stock: number;
  isActive: boolean;
  image?: ProductImage;
  images?: ProductImage[];
};

type ProductsResponse = {
  success: boolean;
  data: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

const router = useRouter();

const searchQuery = ref("");
const selectedCategory = ref<string | undefined>(undefined);
const selectedStatus = ref<string | undefined>(undefined);
const currentPage = ref(1);
const itemsPerPage = 10;
const fallbackImageUrl = "https://via.placeholder.com/80?text=No+Image";

const products = ref<Product[]>([]);
const isLoading = ref(false);
const errorMessage = ref("");

const fetchProducts = async () => {
  isLoading.value = true;
  errorMessage.value = "";

  try {
    const result: ProductsResponse = await apiGet("products?limit=100");

    if (result.success && Array.isArray(result.data)) {
      products.value = result.data;
    }
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : "Failed to load products";
  } finally {
    isLoading.value = false;
  }
};

const productsByFilters = computed(() => {
  return products.value.filter((product) => {
    const categoryName = getCategoryName(product.category);
    const categorySlug = getCategorySlug(product.category);

    const matchesSearch =
      !searchQuery.value ||
      product.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      categoryName.toLowerCase().includes(searchQuery.value.toLowerCase());

    const matchesCategory =
      !selectedCategory.value ||
      selectedCategory.value === "all" ||
      categorySlug.toLowerCase() === selectedCategory.value.toLowerCase();

    const matchesStatus =
      !selectedStatus.value ||
      selectedStatus.value === "all" ||
      (selectedStatus.value === "active" && product.isActive) ||
      (selectedStatus.value === "inactive" && !product.isActive);

    return matchesSearch && matchesCategory && matchesStatus;
  });
});

const paginatedProducts = computed(() => {
  const startIndex = (currentPage.value - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  return productsByFilters.value.slice(startIndex, endIndex);
});

const totalItems = computed(() => productsByFilters.value.length);
const totalPages = computed(() =>
  totalItems.value === 0 ? 1 : Math.ceil(totalItems.value / itemsPerPage)
);

watch([searchQuery, selectedCategory, selectedStatus], () => {
  currentPage.value = 1;
});

watch(
  () => totalPages.value,
  (newTotal) => {
    if (currentPage.value > newTotal) {
      currentPage.value = newTotal;
    }
  }
);

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

const formatPrice = (value: number) => currencyFormatter.format(value);

const productStatusLabel = (product: Product) =>
  product.isActive ? "Активен" : "Неактивен";

const getCategoryName = (
  category:
    | string
    | { name: string; displayName?: string; slug: string }
    | null
    | undefined
): string => {
  if (!category) return "Без категория";
  if (typeof category === "string") return category;
  if (typeof category === "object") {
    return (
      category.displayName || category.name || category.slug || "Без категория"
    );
  }
  return "Без категория";
};

const getCategorySlug = (
  category: string | { slug: string; name?: string } | null | undefined
): string => {
  if (!category) return "";
  if (typeof category === "string") return category;
  if (typeof category === "object") {
    return category.slug || category.name || "";
  }
  return "";
};

const navigateToAddProduct = () => {
  router.push("/products/add");
};

const viewProduct = (id: string) => {
  router.push(`/products/${id}`);
};

const editProduct = (id: string) => {
  router.push(`/products/edit/${id}`);
};

const deleteProduct = async (id: string) => {
  if (!confirm("Are you sure you want to delete this product?")) {
    return;
  }

  try {
    const result = await apiDelete(`products/${id}`);

    if (result.success) {
      products.value = products.value.filter((product) => product._id !== id);
    }
  } catch (error) {
    alert(error instanceof Error ? error.message : "Failed to delete product");
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

fetchProducts();
</script>

<template>
  <div class="space-y-8 pb-8 pt-6">
    <!-- Header Section -->
    <div
      class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
    >
      <div>
        <h1 class="text-4xl font-bold tracking-tight">Продукти</h1>
        <p class="text-muted-foreground mt-1.5">
          Управлявайте вашия инвентар и списъци с продукти
        </p>
      </div>
      <Button
        @click="navigateToAddProduct"
        size="default"
        class="sm:self-start"
      >
        <Plus class="mr-2 h-4 w-4" />
        Добави Продукт
      </Button>
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
              placeholder="Търсете продукти по име или категория..."
              class="pl-10"
            />
          </div>
          <Select v-model="selectedCategory">
            <SelectTrigger class="w-full sm:w-[200px]">
              <SelectValue placeholder="Всички Категории" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Всички Категории</SelectItem>
              <SelectItem value="t-shirts">Тениски</SelectItem>
              <SelectItem value="hoodies">Суитчъри</SelectItem>
              <SelectItem value="sweatshirts">Блузи</SelectItem>
              <SelectItem value="polo-shirts">Поло Тениски</SelectItem>
              <SelectItem value="tank-tops">Потници</SelectItem>
              <SelectItem value="bags">Чанти</SelectItem>
              <SelectItem value="accessories">Аксесоари</SelectItem>
            </SelectContent>
          </Select>
          <Select v-model="selectedStatus">
            <SelectTrigger class="w-full sm:w-[200px]">
              <SelectValue placeholder="Всички Статуси" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Всички Статуси</SelectItem>
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
            <p class="font-semibold">Неуспешно зареждане на продуктите</p>
            <p class="text-sm">{{ errorMessage }}</p>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Products Table -->
    <Card>
      <CardContent class="p-0">
        <div v-if="isLoading" class="flex items-center justify-center py-20">
          <div class="text-center">
            <Loader2 class="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p class="text-lg text-muted-foreground">
              Зареждане на продукти...
            </p>
          </div>
        </div>
        <div v-else>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Продукт</TableHead>
                <TableHead>Категория</TableHead>
                <TableHead>Цена</TableHead>
                <TableHead>Наличност</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead class="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-if="!paginatedProducts.length">
                <TableCell colspan="6" class="text-center py-12">
                  <div class="flex flex-col items-center gap-2">
                    <Package class="h-12 w-12 text-muted-foreground/50" />
                    <p class="text-muted-foreground font-medium">
                      Няма намерени продукти
                    </p>
                    <p class="text-sm text-muted-foreground">
                      Опитайте да промените търсенето или филтрите
                    </p>
                  </div>
                </TableCell>
              </TableRow>
              <TableRow v-for="product in paginatedProducts" :key="product._id">
                <TableCell>
                  <div class="flex items-center space-x-3">
                    <img
                      :src="
                        (product.images?.[0]?.url || product.image?.url) ??
                        fallbackImageUrl
                      "
                      :alt="product.name"
                      class="w-10 h-10 rounded-md object-contain bg-muted"
                    />
                    <div>
                      <div class="font-medium">{{ product.name }}</div>
                      <div class="text-sm text-muted-foreground">
                        {{ getCategoryName(product.category) }}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{{
                    getCategoryName(product.category)
                  }}</Badge>
                </TableCell>
                <TableCell>{{ formatPrice(product.price) }}</TableCell>
                <TableCell>{{ product.stock }}</TableCell>
                <TableCell>
                  <Badge
                    :variant="product.isActive ? 'default' : 'destructive'"
                  >
                    {{ productStatusLabel(product) }}
                  </Badge>
                </TableCell>
                <TableCell class="text-right">
                  <div class="flex justify-end space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      @click="viewProduct(product._id)"
                      title="Виж продукта"
                    >
                      <Eye class="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      @click="editProduct(product._id)"
                      title="Редактирай"
                    >
                      <Edit class="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      @click="deleteProduct(product._id)"
                      title="Изтрий"
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
  </div>
</template>
