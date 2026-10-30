<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  Plus,
  ShoppingCart,
  Trash2,
  Phone,
  Instagram,
  Facebook,
  MessageCircle,
  Package,
  Minus,
  X,
  Search,
  Truck,
} from "lucide-vue-next";
import EcontOfficeSelector from "@/components/EcontOfficeSelector.vue";
import { useToast } from "@/components/ui/toast/use-toast";
import { apiGet, apiPost, apiPatch } from "@/utils/api";

interface Category {
  _id: string;
  name: string;
  slug: string;
  displayName: string;
  sizes: string[];
  isActive: boolean;
}

interface Variant {
  size: string;
  color: string;
  stock: number;
  reserved?: number;
}

interface Product {
  _id: string;
  name: string;
  price: number;
  stock: number;
  variants?: Variant[];
  sizes?: string[];
  colors?: (string | { name: string })[];
  category: string | { name: string; slug: string };
  images: Array<{ url: string; public_id: string }>;
}

interface OrderItem {
  product: string;
  productName: string;
  size?: string;
  color?: string;
  quantity: number;
  price: number;
  maxStock: number;
  availableVariants?: Variant[];
}

interface ExternalOrder {
  _id: string;
  orderNumber: string;
  source: string;
  customer: {
    name: string;
    phone: string;
    email?: string;
    address: string;
    city?: string;
    postCode?: string;
  };
  items: Array<{
    product: Product;
    productName: string;
    quantity: number;
    priceAtOrder: number;
  }>;
  totalAmount: number;
  shippingProvider: string;
  deliveryMethod?: string;
  shippingNumber?: string;
  shippingCost?: number;
  discountPercent?: number;
  discountAmount?: number;
  econtOfficeCode?: string;
  econtOfficeName?: string;
  status: string;
  notes?: string;
  createdAt: string;
}

const { toast } = useToast();

// State
const isDialogOpen = ref(false);
const isSubmitting = ref(false);
const categoriesLoading = ref(false);
const productsLoading = ref(false);
const ordersLoading = ref(true);

const categories = ref<Category[]>([]);
const products = ref<Product[]>([]);
const orders = ref<ExternalOrder[]>([]);

const selectedCategory = ref("");
const orderItems = ref<OrderItem[]>([]);
const selectedVariants = ref<Record<string, { size?: string; color?: string }>>({});
const productSearch = ref("");
const editingShipping = ref<string | null>(null);
const editShippingNumber = ref("");
const creatingShipment = ref<string | null>(null);

// Form state
const form = reactive({
  source: "",
  customerName: "",
  customerPhone: "",
  customerEmail: "",
  shippingProvider: "",
  deliveryMethod: "courier_address", // courier_address, econt_office, econt_automat
  customerAddress: "",
  customerCity: "",
  customerPostCode: "",
  notes: "",
  econtOfficeCode: "",
  econtOfficeName: "",
  shippingNumber: "",
  discountPercent: 0, // Discount percentage (0-100)
});

// Econt office selection
const selectedOffice = ref<any>(null);
const shippingCost = ref(0);
const calculatingShipping = ref(false);
const econtOfficeType = ref<"office" | "aps" | "all">("all");

const formErrors = reactive({
  source: "",
  customerName: "",
  customerPhone: "",
  customerAddress: "",
  customerCity: "",
  customerPostCode: "",
  shippingProvider: "",
  shippingNumber: "",
  items: "",
});

// Computed
const filteredProducts = computed(() => {
  if (!selectedCategory.value) return [];

  let filtered = products.value.filter((p) => {
    // Handle category comparison (can be string or object)
    const productCategory =
      typeof p.category === "object" && p.category !== null
        ? (p.category as any).slug || (p.category as any).name
        : p.category;

    if (productCategory !== selectedCategory.value) return false;

    // Check variant stock if product has variants
    if (p.variants && p.variants.length > 0) {
      return p.variants.some((v) => v.stock - (v.reserved || 0) > 0);
    }

    // Fallback to old stock field
    return p.stock > 0;
  });

  // Apply search filter
  if (productSearch.value.trim()) {
    const search = productSearch.value.toLowerCase();
    filtered = filtered.filter((p) => p.name.toLowerCase().includes(search));
  }

  return filtered;
});

// Removed totalAmount computed - we show product price and shipping separately

const sourceIcon = (source: string) => {
  switch (source) {
    case "phone":
      return Phone;
    case "instagram":
      return Instagram;
    case "facebook":
      return Facebook;
    case "tiktok":
    case "other":
      return MessageCircle;
    default:
      return Package;
  }
};

const sourceLabel = (source: string) => {
  const labels: Record<string, string> = {
    phone: "Телефон",
    instagram: "Instagram",
    facebook: "Facebook",
    tiktok: "TikTok",
    other: "Друго",
  };
  return labels[source] || source;
};

const statusLabel = (status: string) => {
  const labels: Record<string, string> = {
    pending: "Чакаща",
    processing: "В Обработка",
    shipped: "Изпратена",
    delivered: "Доставена",
    cancelled: "Отказана",
  };
  return labels[status] || status;
};

const statusVariant = (status: string) => {
  const variants: Record<string, "default" | "secondary" | "destructive"> = {
    pending: "secondary",
    processing: "default",
    shipped: "default",
    delivered: "default",
    cancelled: "destructive",
  };
  return variants[status] || "default";
};

// Functions
const fetchCategories = async () => {
  try {
    categoriesLoading.value = true;
    const data = await apiGet("categories?active=true");

    if (data.success) {
      categories.value = data.data;
    }
  } catch (error) {
    console.error("Грешка при зареждане на категориите:", error);
  } finally {
    categoriesLoading.value = false;
  }
};

const fetchProducts = async () => {
  try {
    productsLoading.value = true;
    const data = await apiGet("products?limit=1000");

    if (data.success) {
      products.value = data.data;
      // Initialize selectedVariants for each product and auto-select if only one option
      products.value.forEach((product) => {
        if (!selectedVariants.value[product._id]) {
          const autoSize =
            product.sizes && product.sizes.length === 1 ? product.sizes[0] : undefined;
          const autoColor =
            product.colors && product.colors.length === 1
              ? typeof product.colors[0] === "string"
                ? product.colors[0]
                : product.colors[0].name
              : undefined;

          selectedVariants.value[product._id] = {
            size: autoSize,
            color: autoColor,
          };
        }
      });
    }
  } catch (error) {
    console.error("Грешка при зареждане на продуктите:", error);
  } finally {
    productsLoading.value = false;
  }
};

const fetchOrders = async () => {
  try {
    ordersLoading.value = true;
    const data = await apiGet("external-orders");

    if (data.success) {
      orders.value = data.data;
    }
  } catch (error) {
    console.error("Грешка при зареждане на поръчките:", error);
    toast({
      title: "Грешка",
      description: "Неуспешно зареждане на поръчките",
      variant: "destructive",
    });
  } finally {
    ordersLoading.value = false;
  }
};

const openDialog = () => {
  resetForm();
  isDialogOpen.value = true;
};

const closeDialog = () => {
  isDialogOpen.value = false;
  resetForm();
};

const resetForm = () => {
  form.source = "";
  form.customerName = "";
  form.customerPhone = "";
  form.customerEmail = "";
  form.shippingProvider = "";
  form.deliveryMethod = "courier_address";
  form.customerAddress = "";
  form.customerCity = "";
  form.customerPostCode = "";
  form.shippingNumber = "";
  form.notes = "";
  form.econtOfficeCode = "";
  form.econtOfficeName = "";
  selectedCategory.value = "";
  orderItems.value = [];
  selectedOffice.value = null;
  shippingCost.value = 0;
  resetFormErrors();
};

const resetFormErrors = () => {
  formErrors.source = "";
  formErrors.customerName = "";
  formErrors.customerPhone = "";
  formErrors.customerAddress = "";
  formErrors.customerCity = "";
  formErrors.customerPostCode = "";
  formErrors.shippingProvider = "";
  formErrors.shippingNumber = "";
  formErrors.items = "";
};

const addProductToOrder = (product: Product, size?: string, color?: string) => {
  // For products with variants, size and color are required
  if (product.variants && product.variants.length > 0) {
    if (!size || !color) {
      toast({
        title: "Грешка",
        description: "Моля, изберете размер и цвят",
        variant: "destructive",
      });
      return;
    }
  }

  const itemKey = size && color ? `${product._id}-${size}-${color}` : product._id;
  const existingItem = orderItems.value.find((item) => {
    if (size && color) {
      return item.product === product._id && item.size === size && item.color === color;
    }
    return item.product === product._id;
  });

  // Get max stock for this variant
  let maxStock = product.stock;
  if (product.variants && size && color) {
    const variant = product.variants.find((v) => v.size === size && v.color === color);
    maxStock = variant ? variant.stock - (variant.reserved || 0) : 0;
  }

  if (existingItem) {
    if (existingItem.quantity < maxStock) {
      existingItem.quantity++;
    } else {
      toast({
        title: "Грешка",
        description: `Максималната наличност за ${product.name} ${size ? `(${size}, ${color})` : ""} е ${maxStock}`,
        variant: "destructive",
      });
    }
  } else {
    orderItems.value.push({
      product: product._id,
      productName: product.name,
      size,
      color,
      quantity: 1,
      price: product.price,
      maxStock,
      availableVariants: product.variants,
    });
  }
  formErrors.items = "";
};

const increaseQuantity = (item: OrderItem) => {
  if (item.quantity < item.maxStock) {
    item.quantity++;
  } else {
    toast({
      title: "Грешка",
      description: `Максималната наличност за ${item.productName} е ${item.maxStock}`,
      variant: "destructive",
    });
  }
};

const decreaseQuantity = (item: OrderItem) => {
  if (item.quantity > 1) {
    item.quantity--;
  }
};

const removeItem = (index: number) => {
  orderItems.value.splice(index, 1);
};

const validateForm = (): boolean => {
  resetFormErrors();
  let isValid = true;

  if (!form.source) {
    formErrors.source = "Източникът е задължителен";
    isValid = false;
  }

  if (!form.customerName.trim()) {
    formErrors.customerName = "Името на клиента е задължително";
    isValid = false;
  }

  if (!form.customerPhone.trim()) {
    formErrors.customerPhone = "Телефонът на клиента е задължителен";
    isValid = false;
  }

  // Validate address based on delivery method and shipping provider
  // Only validate address for Econt, not for Speedy
  if (form.shippingProvider === "ekont") {
    if (form.deliveryMethod === "courier_address") {
      if (!form.customerAddress.trim()) {
        formErrors.customerAddress = "Адресът на клиента е задължителен";
        isValid = false;
      }
      if (!form.customerCity.trim()) {
        formErrors.customerCity = "Градът е задължителен";
        isValid = false;
      }
      if (!form.customerPostCode.trim()) {
        formErrors.customerPostCode = "Пощенският код е задължителен";
        isValid = false;
      }
    } else if (form.deliveryMethod === "econt_office" || form.deliveryMethod === "econt_automat") {
      if (!form.econtOfficeCode || !form.econtOfficeName) {
        formErrors.customerAddress = "Моля, изберете офис или еконтомат";
        isValid = false;
      }
    }
  }
  // For Speedy, no address validation needed

  if (!form.shippingProvider) {
    formErrors.shippingProvider = "Доставчикът е задължителен";
    isValid = false;
  }

  // Shipping number is optional - can be added later

  if (orderItems.value.length === 0) {
    formErrors.items = "Добавете поне един продукт";
    isValid = false;
  }

  return isValid;
};

const handleSubmit = async () => {
  if (!validateForm()) {
    // Show error toast when validation fails
    const firstError = Object.values(formErrors).find(err => err !== "");
    toast({
      title: "Грешка при валидация",
      description: firstError || "Моля, попълнете всички задължителни полета",
      variant: "destructive",
    });
    return;
  }

  try {
    isSubmitting.value = true;

    // Build address based on delivery method
    let customerAddress = "";
    if (form.deliveryMethod === "courier_address") {
      customerAddress =
        `${form.customerAddress.trim()}, ${form.customerCity.trim()}, ${form.customerPostCode.trim()}`.trim();
    } else if (
      (form.deliveryMethod === "econt_office" || form.deliveryMethod === "econt_automat") &&
      selectedOffice.value
    ) {
      customerAddress =
        selectedOffice.value.address?.fullAddress ||
        selectedOffice.value.name ||
        form.econtOfficeName;
    } else {
      customerAddress = form.customerAddress.trim();
    }

    const payload = {
      source: form.source,
      customer: {
        name: form.customerName.trim(),
        phone: form.customerPhone.trim(),
        email: form.customerEmail.trim() || undefined,
        address: customerAddress,
        city:
          form.deliveryMethod === "courier_address"
            ? form.customerCity.trim()
            : selectedOffice.value?.address?.city?.name || "",
        postCode:
          form.deliveryMethod === "courier_address"
            ? form.customerPostCode.trim()
            : selectedOffice.value?.address?.city?.postCode || "",
      },
      items: orderItems.value.map((item) => ({
        product: item.product,
        size: item.size,
        color: item.color,
        quantity: item.quantity,
      })),
      shippingProvider: form.shippingProvider,
      deliveryMethod: form.deliveryMethod,
      shippingNumber: form.shippingNumber.trim(),
      shippingCost: shippingCost.value,
      discountPercent: form.discountPercent || 0,
      discountAmount:
        form.discountPercent > 0
          ? (orderItems.value.reduce((sum, item) => sum + item.price * item.quantity, 0) *
              form.discountPercent) /
            100
          : 0,
      econtOfficeCode:
        form.deliveryMethod === "econt_office" || form.deliveryMethod === "econt_automat"
          ? form.econtOfficeCode.trim() || undefined
          : undefined,
      econtOfficeName:
        form.deliveryMethod === "econt_office" || form.deliveryMethod === "econt_automat"
          ? form.econtOfficeName.trim() || undefined
          : undefined,
      notes: form.notes.trim(),
    };

    const data = await apiPost("external-orders", payload);

    if (data.success) {
      toast({
        title: "Успех",
        description: `Поръчка ${data.data.orderNumber} беше създадена успешно`,
      });
      closeDialog();
      fetchOrders();
      // Refresh products to update stock
      fetchProducts();
    } else {
      throw new Error(data.message || "Неуспешна операция");
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Възникна грешка";
    toast({
      title: "Грешка",
      description: errorMessage,
      variant: "destructive",
    });
  } finally {
    isSubmitting.value = false;
  }
};

// Shipping number inline edit functions
const startEditShipping = (order: ExternalOrder) => {
  editingShipping.value = order._id;
  editShippingNumber.value = order.shippingNumber || "";
};

const cancelEditShipping = () => {
  editingShipping.value = null;
  editShippingNumber.value = "";
};

const saveShippingNumber = async (orderId: string) => {
  try {
    const data = await apiPatch(`external-orders/${orderId}/shipping`, {
      shippingNumber: editShippingNumber.value.trim(),
    });

    if (data.success) {
      // Update the order in the list
      const order = orders.value.find((o) => o._id === orderId);
      if (order) {
        order.shippingNumber = editShippingNumber.value.trim();
      }

      toast({
        title: "Успешно",
        description: "Номерът на пратката е обновен",
      });

      cancelEditShipping();
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error("Грешка при запазване на номер:", error);
    toast({
      title: "Грешка",
      description: "Неуспешно запазване на номера",
      variant: "destructive",
    });
  }
};

const handleShippingProviderChange = (value: string) => {
  if (value !== "ekont") {
    selectedOffice.value = null;
    form.econtOfficeCode = "";
    form.econtOfficeName = "";
    form.deliveryMethod = "courier_address";
    shippingCost.value = 0;
    econtOfficeType.value = "all";
  } else {
    // Default to courier for Econt
    form.deliveryMethod = "courier_address";
    selectedOffice.value = null;
    form.econtOfficeCode = "";
    form.econtOfficeName = "";
    shippingCost.value = 0;
  }
};

const handleDeliveryMethodChange = (method: string) => {
  form.deliveryMethod = method;
  if (method === "courier_address") {
    // Clear office selection
    selectedOffice.value = null;
    form.econtOfficeCode = "";
    form.econtOfficeName = "";
    shippingCost.value = 0;
  } else if (method === "econt_office") {
    // Clear address fields
    form.customerAddress = "";
    form.customerCity = "";
    form.customerPostCode = "";
    // Clear office selection to allow new selection
    selectedOffice.value = null;
    form.econtOfficeCode = "";
    form.econtOfficeName = "";
    shippingCost.value = 0;
  } else if (method === "econt_automat") {
    // Clear address fields
    form.customerAddress = "";
    form.customerCity = "";
    form.customerPostCode = "";
    // Clear office selection to allow new selection
    selectedOffice.value = null;
    form.econtOfficeCode = "";
    form.econtOfficeName = "";
    shippingCost.value = 0;
  }
};

const handleOfficeSelected = async (office: any) => {
  if (!office) {
    selectedOffice.value = null;
    form.econtOfficeCode = "";
    form.econtOfficeName = "";
    shippingCost.value = 0;
    return;
  }

  selectedOffice.value = office;
  form.econtOfficeCode = office.code;
  form.econtOfficeName = office.name;

  // Calculate shipping cost
  await calculateShippingCost(office);
};

const calculateShippingCost = async (office: any) => {
  if (!office || !orderItems.value || orderItems.value.length === 0) {
    shippingCost.value = 0;
    calculatingShipping.value = false;
    return;
  }

  try {
    calculatingShipping.value = true;

    // Calculate total weight and dimensions from order items
    // For now, use default weight estimation (0.5kg per item)
    // In production, you might want to get actual product weights
    const totalWeight = orderItems.value.reduce((sum, item) => {
      if (!item || !item.quantity) return sum;
      return sum + item.quantity * 0.5; // Default 0.5kg per item
    }, 0);

    const subtotal = orderItems.value.reduce((sum, item) => {
      if (!item || !item.price || !item.quantity) return sum;
      return sum + item.price * item.quantity;
    }, 0);

    // Free shipping over 90 EUR
    if (subtotal >= 90) {
      shippingCost.value = 0;
      calculatingShipping.value = false;
      return;
    }

    const requestData = {
      receiverCityName: office.address.city.name,
      receiverPostCode: office.address.city.postCode || "1000",
      officeCode: office.code,
      weight: Math.max(totalWeight, 0.5), // Minimum 0.5kg
      receiverName: form.customerName || "Клиент",
      receiverPhone: form.customerPhone || "0888000000",
      services: [
        {
          type: "CD",
          amount: subtotal, // Cash on delivery amount
          currency: "EUR",
        },
      ],
    };

    const response = await apiPost("econt/calculate-price", requestData);

    if (response && response.success && response.data && response.data.totalPrice) {
      shippingCost.value = parseFloat(response.data.totalPrice);
    } else {
      // Fallback price
      shippingCost.value = subtotal >= 90 ? 0 : 5.99;
    }
  } catch (error: any) {
    console.error("Failed to calculate shipping:", error);
    const subtotal =
      orderItems.value && orderItems.value.length > 0
        ? orderItems.value.reduce((sum, item) => {
            if (!item || !item.price || !item.quantity) return sum;
            return sum + item.price * item.quantity;
          }, 0)
        : 0;
    // Fallback: free shipping over 90, otherwise 5.99
    shippingCost.value = subtotal >= 90 ? 0 : 5.99;
  } finally {
    calculatingShipping.value = false;
  }
};

const createEcontShipment = async (orderId: string) => {
  creatingShipment.value = orderId;

  try {
    const data = await apiPost(`external-orders/${orderId}/create-econt-shipment`, {});

    if (data.success) {
      // Refresh orders to reflect the change
      await fetchOrders();

      toast({
        title: "✅ Econt пратка създадена!",
        description: `Номер за проследяване: ${data.data.shipmentNumber}`,
        variant: "default",
        duration: 5000,
      });

      // Copy tracking number to clipboard
      if (navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(data.data.shipmentNumber);
          setTimeout(() => {
            toast({
              title: "📋 Копирано!",
              description: "Номерът за проследяване е копиран",
              duration: 2000,
            });
          }, 500);
        } catch (e) {
          console.log("Failed to copy to clipboard");
        }
      }
    } else {
      throw new Error(data.message || "Failed to create shipment");
    }
  } catch (err: any) {
    console.error("Failed to create shipment:", err);

    toast({
      title: "❌ Грешка",
      description: err.message || "Не успяхме да създадем Econt пратка",
      variant: "destructive",
      duration: 5000,
    });
  } finally {
    creatingShipment.value = null;
  }
};

onMounted(() => {
  fetchCategories();
  fetchProducts();
  fetchOrders();
});
</script>

<template>
  <div class="space-y-8 pt-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-4xl font-bold tracking-tight">Външни Поръчки</h1>
        <p class="text-muted-foreground mt-1.5">Управлявайте поръчки от телефон и социални мрежи</p>
      </div>
      <Button @click="openDialog" size="default" class="sm:self-start">
        <Plus class="mr-2 h-4 w-4" />
        Нова Поръчка
      </Button>
    </div>

    <!-- Stats -->
    <div class="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader class="pb-3">
          <CardTitle class="text-sm font-medium">Всичко Поръчки</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">{{ orders.length }}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader class="pb-3">
          <CardTitle class="text-sm font-medium">Чакащи</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">
            {{ orders.filter((o) => o.status === "pending").length }}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader class="pb-3">
          <CardTitle class="text-sm font-medium">В Обработка</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">
            {{ orders.filter((o) => o.status === "processing").length }}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader class="pb-3">
          <CardTitle class="text-sm font-medium">Изпратени</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">
            {{ orders.filter((o) => o.status === "shipped").length }}
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Orders List -->
    <Card>
      <CardHeader>
        <CardTitle>Списък с Поръчки</CardTitle>
        <CardDescription>Преглеждайте всички външни поръчки</CardDescription>
      </CardHeader>
      <CardContent>
        <div v-if="ordersLoading" class="flex items-center justify-center py-12">
          <Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
        </div>

        <div v-else-if="orders.length === 0" class="text-center py-12">
          <ShoppingCart class="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p class="font-semibold">Няма поръчки</p>
          <p class="text-sm text-muted-foreground mt-1">Започнете като създадете нова поръчка</p>
        </div>

        <div v-else class="space-y-4">
          <Card
            v-for="order in orders"
            :key="order._id"
            class="border-l-4"
            :class="{
              'border-l-yellow-500': order.status === 'pending',
              'border-l-blue-500': order.status === 'processing',
              'border-l-green-500': order.status === 'shipped',
              'border-l-gray-500': order.status === 'delivered',
              'border-l-red-500': order.status === 'cancelled',
            }"
          >
            <CardContent class="pt-6">
              <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <!-- Order Info -->
                <div class="space-y-3 flex-1">
                  <div class="flex items-center gap-3 flex-wrap">
                    <h3 class="text-lg font-semibold">
                      {{ order.orderNumber }}
                    </h3>
                    <Badge :variant="statusVariant(order.status)">
                      {{ statusLabel(order.status) }}
                    </Badge>
                    <div class="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <component :is="sourceIcon(order.source)" class="h-4 w-4" />
                      {{ sourceLabel(order.source) }}
                    </div>
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span class="font-medium">Клиент:</span>
                      {{ order.customer.name }}
                    </div>
                    <div>
                      <span class="font-medium">Телефон:</span>
                      {{ order.customer.phone }}
                    </div>
                    <div class="md:col-span-2">
                      <span class="font-medium">Адрес:</span>
                      {{ order.customer.address }}
                      <span
                        v-if="order.deliveryMethod === 'econt_office'"
                        class="text-xs text-muted-foreground ml-2"
                      >
                        (Офис)
                      </span>
                      <span
                        v-else-if="order.deliveryMethod === 'econt_automat'"
                        class="text-xs text-muted-foreground ml-2"
                      >
                        (Еконтомат)
                      </span>
                    </div>
                    <div>
                      <span class="font-medium">Доставчик:</span>
                      {{ order.shippingProvider === "ekont" ? "Еконт" : "Speedy" }}
                    </div>
                    <div v-if="order.shippingCost && order.shippingCost > 0">
                      <span class="font-medium">Цена за доставка:</span>
                      €{{ order.shippingCost.toFixed(2) }}
                    </div>
                    <div>
                      <span class="font-medium">Номер на пратка:</span>
                      <div
                        v-if="editingShipping === order._id"
                        class="flex items-center gap-2 mt-1"
                      >
                        <Input
                          v-model="editShippingNumber"
                          placeholder="Въведете номер"
                          class="h-8"
                        />
                        <Button @click="saveShippingNumber(order._id)" size="sm" class="h-8">
                          Запази
                        </Button>
                        <Button @click="cancelEditShipping" size="sm" variant="outline" class="h-8">
                          Отказ
                        </Button>
                      </div>
                      <div v-else-if="order.shippingNumber" class="flex items-center gap-2 mt-1">
                        <span>{{ order.shippingNumber }}</span>
                        <Button
                          @click="startEditShipping(order)"
                          size="sm"
                          variant="ghost"
                          class="h-6 px-2"
                        >
                          Редактирай
                        </Button>
                      </div>
                      <div v-else class="mt-1">
                        <span class="text-muted-foreground">Не е добавен</span>
                      </div>
                    </div>
                  </div>

                  <!-- Create Econt Shipment Button -->
                  <div
                    v-if="order.shippingProvider === 'ekont' && !order.shippingNumber"
                    class="pt-3 border-t"
                  >
                    <Button
                      @click="createEcontShipment(order._id)"
                      :disabled="creatingShipment === order._id"
                      size="sm"
                      class="w-full"
                    >
                      <Loader2
                        v-if="creatingShipment === order._id"
                        class="mr-2 h-4 w-4 animate-spin"
                      />
                      <Truck v-else class="mr-2 h-4 w-4" />
                      {{
                        creatingShipment === order._id ? "Създаване..." : "Създайте econt пратка"
                      }}
                    </Button>
                    <p class="text-xs text-muted-foreground mt-2 text-center">
                      Това ще генерира товарителница и номер за проследяване
                    </p>
                  </div>

                  <!-- Order Items -->
                  <div class="pt-2">
                    <p class="text-sm font-medium mb-2">Продукти:</p>
                    <div class="space-y-1">
                      <div
                        v-for="(item, index) in order.items"
                        :key="index"
                        class="text-sm flex items-center gap-2"
                      >
                        <Badge variant="outline" class="font-normal"> {{ item.quantity }}x </Badge>
                        <span>{{ item.productName }}</span>
                        <span class="text-muted-foreground">
                          (€{{ item.priceAtOrder.toFixed(2) }})
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Product Price and Shipping -->
                <div class="text-right">
                  <div class="space-y-2">
                    <div class="text-sm text-muted-foreground">
                      Продукти:
                      <span class="font-semibold text-foreground">
                        {{
                          order.items
                            .reduce((sum, item) => sum + item.priceAtOrder * item.quantity, 0)
                            .toFixed(2)
                        }}
                      €
                      </span>
                    </div>
                    
                    <!-- Discount Display -->
                    <div v-if="order.discountPercent && order.discountPercent > 0" class="text-sm">
                      <div class="text-red-600">
                        Отстъпка ({{ order.discountPercent }}%):
                        <span class="font-semibold">
                          -€{{ (order.discountAmount || 0).toFixed(2) }}
                        </span>
                      </div>
                    </div>
                    
                    <div v-if="order.shippingCost && order.shippingCost > 0" class="text-sm text-muted-foreground">
                      Доставка:
                      <span class="font-semibold text-foreground">
                        €{{ order.shippingCost.toFixed(2) }}
                      </span>
                    </div>
                    <p class="text-xs text-muted-foreground mt-1">
                      {{ new Date(order.createdAt).toLocaleDateString("bg-BG") }}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>

    <!-- Create Order Dialog -->
    <Dialog :open="isDialogOpen" @update:open="closeDialog">
      <DialogContent class="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Създай Нова Поръчка</DialogTitle>
          <DialogDescription>Въведете информация за поръчката</DialogDescription>
        </DialogHeader>

        <div class="space-y-6 py-4">
          <!-- Source -->
          <div class="space-y-2">
            <Label for="source"> Източник <span class="text-destructive">*</span> </Label>
            <Select v-model="form.source">
              <SelectTrigger :class="{ 'border-destructive': formErrors.source }">
                <SelectValue placeholder="Изберете източник" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="phone">Телефон</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
                <SelectItem value="tiktok">TikTok</SelectItem>
                <SelectItem value="other">Друго</SelectItem>
              </SelectContent>
            </Select>
            <p v-if="formErrors.source" class="text-xs text-destructive">
              {{ formErrors.source }}
            </p>
          </div>

          <!-- Customer Info -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label for="customerName">
                Име на Клиент <span class="text-destructive">*</span>
              </Label>
              <Input
                id="customerName"
                v-model="form.customerName"
                placeholder="Име и Фамилия"
                :class="{ 'border-destructive': formErrors.customerName }"
              />
              <p v-if="formErrors.customerName" class="text-xs text-destructive">
                {{ formErrors.customerName }}
              </p>
            </div>

            <div class="space-y-2">
              <Label for="customerPhone"> Телефон <span class="text-destructive">*</span> </Label>
              <Input
                id="customerPhone"
                v-model="form.customerPhone"
                placeholder="+359..."
                :class="{ 'border-destructive': formErrors.customerPhone }"
              />
              <p v-if="formErrors.customerPhone" class="text-xs text-destructive">
                {{ formErrors.customerPhone }}
              </p>
            </div>
          </div>

          <div class="space-y-2">
            <Label for="customerEmail"> Email </Label>
            <Input
              id="customerEmail"
              v-model="form.customerEmail"
              type="email"
              placeholder="email@example.com (незадължително)"
            />
            <p class="text-xs text-muted-foreground">
              За получаване на уведомления за статуса на поръчката
            </p>
          </div>

          <!-- Shipping Provider -->
          <div class="space-y-2">
            <Label for="shippingProvider">
              Доставчик <span class="text-destructive">*</span>
            </Label>
            <Select
              v-model="form.shippingProvider"
              @update:model-value="handleShippingProviderChange"
            >
              <SelectTrigger :class="{ 'border-destructive': formErrors.shippingProvider }">
                <SelectValue placeholder="Изберете доставчик" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ekont">Еконт</SelectItem>
                <SelectItem value="speedy">Speedy</SelectItem>
              </SelectContent>
            </Select>
            <p v-if="formErrors.shippingProvider" class="text-xs text-destructive">
              {{ formErrors.shippingProvider }}
            </p>
          </div>

          <!-- Delivery Method (only for Econt) -->
          <div v-if="form.shippingProvider === 'ekont'" class="space-y-2">
            <Label>Начин на доставка <span class="text-destructive">*</span></Label>
            <div class="flex flex-wrap gap-2">
              <Button
                @click="handleDeliveryMethodChange('courier_address')"
                :variant="form.deliveryMethod === 'courier_address' ? 'default' : 'outline'"
                size="sm"
              >
                Куриер до адрес
              </Button>
              <Button
                @click="handleDeliveryMethodChange('econt_office')"
                :variant="form.deliveryMethod === 'econt_office' ? 'default' : 'outline'"
                size="sm"
              >
                Офис
              </Button>
              <Button
                @click="handleDeliveryMethodChange('econt_automat')"
                :variant="form.deliveryMethod === 'econt_automat' ? 'default' : 'outline'"
                size="sm"
              >
                Еконтомат
              </Button>
            </div>
          </div>

          <!-- Address Fields (only for courier) -->
          <div
            v-if="form.shippingProvider === 'ekont' && form.deliveryMethod === 'courier_address'"
            class="space-y-4"
          >
            <div class="space-y-2">
              <Label for="customerAddress"> Адрес <span class="text-destructive">*</span> </Label>
              <Input
                id="customerAddress"
                v-model="form.customerAddress"
                placeholder="Улица, номер, блок, вход..."
                :class="{ 'border-destructive': formErrors.customerAddress }"
              />
              <p v-if="formErrors.customerAddress" class="text-xs text-destructive">
                {{ formErrors.customerAddress }}
              </p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-2">
                <Label for="customerCity"> Град <span class="text-destructive">*</span> </Label>
                <Input
                  id="customerCity"
                  v-model="form.customerCity"
                  placeholder="Град"
                  :class="{ 'border-destructive': formErrors.customerCity }"
                />
                <p v-if="formErrors.customerCity" class="text-xs text-destructive">
                  {{ formErrors.customerCity }}
                </p>
              </div>

              <div class="space-y-2">
                <Label for="customerPostCode">
                  Пощенски код <span class="text-destructive">*</span>
                </Label>
                <Input
                  id="customerPostCode"
                  v-model="form.customerPostCode"
                  placeholder="1000"
                  :class="{ 'border-destructive': formErrors.customerPostCode }"
                />
                <p v-if="formErrors.customerPostCode" class="text-xs text-destructive">
                  {{ formErrors.customerPostCode }}
                </p>
              </div>
            </div>
          </div>

          <!-- Office/Econtomat Selection (only for office/automat) -->
          <div
            v-if="
              form.shippingProvider === 'ekont' &&
              (form.deliveryMethod === 'econt_office' || form.deliveryMethod === 'econt_automat')
            "
            class="space-y-4"
          >
            <EcontOfficeSelector
              :office-type="form.deliveryMethod === 'econt_office' ? 'office' : 'aps'"
              @office-selected="handleOfficeSelected"
            />
            <div
              v-if="calculatingShipping && selectedOffice"
              class="text-sm text-muted-foreground flex items-center gap-2"
            >
              <Loader2 class="h-4 w-4 animate-spin" />
              Изчисляване на цена за доставка...
            </div>
            <div
              v-else-if="!calculatingShipping && selectedOffice && shippingCost > 0"
              class="text-sm font-medium text-green-600"
            >
              Цена за доставка: €{{ shippingCost.toFixed(2) }}
            </div>
            <div
              v-else-if="!calculatingShipping && selectedOffice && shippingCost === 0"
              class="text-sm font-medium text-green-600"
            >
              Безплатна доставка (над 90 €)
            </div>
          </div>

          <!-- Notes -->
          <div class="space-y-2">
            <Label for="notes">Бележки</Label>
            <Textarea
              id="notes"
              v-model="form.notes"
              placeholder="Допълнителна информация..."
              rows="2"
            />
          </div>

          <!-- Product Selection -->
          <div class="space-y-4 border-t pt-4">
            <h3 class="font-semibold">Продукти</h3>

            <div class="space-y-2">
              <Label for="category">Изберете Категория</Label>
              <Select v-model="selectedCategory" :disabled="categoriesLoading">
                <SelectTrigger>
                  <SelectValue
                    :placeholder="categoriesLoading ? 'Зареждане...' : 'Изберете категория'"
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="cat in categories" :key="cat._id" :value="cat.slug">
                    {{ cat.displayName }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <!-- Products Grid -->
            <div v-if="selectedCategory" class="space-y-3">
              <div class="flex items-center justify-between">
                <Label>Налични Продукти ({{ filteredProducts.length }})</Label>
              </div>

              <!-- Search Input -->
              <div class="relative">
                <Search
                  class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                />
                <Input
                  v-model="productSearch"
                  placeholder="Търсене по име на продукт..."
                  class="pl-9"
                />
              </div>

              <div v-if="productsLoading" class="text-center py-4">
                <Loader2 class="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
              </div>
              <div
                v-else-if="filteredProducts.length === 0"
                class="text-center py-4 text-sm text-muted-foreground"
              >
                {{
                  productSearch
                    ? "Няма продукти, съответстващи на търсенето"
                    : "Няма налични продукти в тази категория"
                }}
              </div>
              <div
                v-else
                class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-[600px] overflow-y-auto pr-2"
              >
                <Card
                  v-for="product in filteredProducts"
                  :key="product._id"
                  class="overflow-hidden hover:shadow-md transition-shadow"
                >
                  <CardContent class="p-2">
                    <!-- Product Image -->
                    <div class="aspect-square w-full bg-muted rounded-md mb-2 overflow-hidden">
                      <img
                        v-if="product.images && product.images.length > 0"
                        :src="product.images[0].url"
                        :alt="product.name"
                        class="w-full h-full object-cover"
                      />
                      <div v-else class="w-full h-full flex items-center justify-center">
                        <Package class="h-8 w-8 text-muted-foreground/50" />
                      </div>
                    </div>

                    <!-- Product Info -->
                    <div class="space-y-1.5">
                      <div>
                        <h4 class="font-medium text-xs line-clamp-2 min-h-[2rem] leading-tight">
                          {{ product.name }}
                        </h4>
                        <p class="text-sm font-bold text-primary mt-0.5">
                          €{{ product.price.toFixed(2) }}
                        </p>
                      </div>

                      <!-- Variant Selection for products with variants -->
                      <div
                        v-if="product.variants && product.variants.length > 0"
                        class="space-y-1.5"
                      >
                        <div class="grid grid-cols-2 gap-1.5">
                          <div>
                            <Label class="text-[10px]">Размер</Label>
                            <Select
                              :model-value="selectedVariants[product._id]?.size"
                              @update:model-value="
                                (val) => {
                                  if (!selectedVariants[product._id])
                                    selectedVariants[product._id] = {};
                                  selectedVariants[product._id].size = val;
                                }
                              "
                            >
                              <SelectTrigger class="h-7 text-[10px]">
                                <SelectValue
                                  :placeholder="
                                    product.sizes && product.sizes.length === 1
                                      ? product.sizes[0]
                                      : 'Избери'
                                  "
                                />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem v-for="size in product.sizes" :key="size" :value="size">
                                  {{ size }}
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label class="text-[10px]">Цвят</Label>
                            <Select
                              :model-value="selectedVariants[product._id]?.color"
                              @update:model-value="
                                (val) => {
                                  if (!selectedVariants[product._id])
                                    selectedVariants[product._id] = {};
                                  selectedVariants[product._id].color = val;
                                }
                              "
                            >
                              <SelectTrigger class="h-7 text-[10px]">
                                <SelectValue
                                  :placeholder="
                                    product.colors && product.colors.length === 1
                                      ? typeof product.colors[0] === 'string'
                                        ? product.colors[0]
                                        : product.colors[0].name
                                      : 'Избери'
                                  "
                                />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem
                                  v-for="color in product.colors"
                                  :key="typeof color === 'string' ? color : color.name"
                                  :value="typeof color === 'string' ? color : color.name"
                                >
                                  {{ typeof color === "string" ? color : color.name }}
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <Button
                          @click="
                            (() => {
                              const size = selectedVariants[product._id]?.size;
                              const color = selectedVariants[product._id]?.color;
                              const colorName = typeof color === 'string' ? color : (color as any)?.name || color;
                              addProductToOrder(product, size, colorName as string);
                            })()
                          "
                          :disabled="
                            product.variants &&
                            product.variants.length > 0 &&
                            (!selectedVariants[product._id]?.size ||
                              !selectedVariants[product._id]?.color)
                          "
                          size="sm"
                          class="w-full h-7 text-xs"
                        >
                          <Plus class="h-3 w-3 mr-1" />
                          Добави
                        </Button>
                      </div>

                      <!-- Simple add button for products without variants -->
                      <Button
                        v-else
                        @click="addProductToOrder(product)"
                        size="sm"
                        class="w-full h-7 text-xs"
                      >
                        <Plus class="h-3 w-3 mr-1" />
                        Добави • {{ product.stock }}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <!-- Selected Items -->
            <div v-if="orderItems.length > 0" class="space-y-2">
              <Label>Избрани Продукти</Label>
              <div class="space-y-2">
                <div
                  v-for="(item, index) in orderItems"
                  :key="index"
                  class="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div class="flex-1">
                    <p class="font-medium">{{ item.productName }}</p>
                    <p v-if="item.size && item.color" class="text-xs text-muted-foreground">
                      Размер: {{ item.size }}, Цвят:
                      {{ typeof item.color === "string" ? item.color : (item.color as any)?.name || item.color }}
                    </p>
                    <p class="text-sm text-muted-foreground">
                      €{{ item.price.toFixed(2) }} × {{ item.quantity }} =
                      €{{ (item.price * item.quantity).toFixed(2) }}
                    </p>
                  </div>
                  <div class="flex items-center gap-2">
                    <Button
                      @click="decreaseQuantity(item)"
                      variant="outline"
                      size="icon"
                      class="h-8 w-8"
                    >
                      <Minus class="h-3 w-3" />
                    </Button>
                    <span class="w-8 text-center font-medium">{{ item.quantity }}</span>
                    <Button
                      @click="increaseQuantity(item)"
                      variant="outline"
                      size="icon"
                      class="h-8 w-8"
                    >
                      <Plus class="h-3 w-3" />
                    </Button>
                    <Button @click="removeItem(index)" variant="ghost" size="icon" class="h-8 w-8">
                      <X class="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
              <div class="space-y-2 pt-2 border-t">
                <div class="flex justify-between items-center">
                  <span class="text-sm text-muted-foreground">Стойност на продуктите:</span>
                  <span class="font-medium">
                    €{{
                      (orderItems && orderItems.length > 0
                        ? orderItems.reduce((sum: number, item: OrderItem) => {
                            if (!item || !item.price || !item.quantity) return sum;
                            return sum + item.price * item.quantity;
                          }, 0)
                        : 0
                      ).toFixed(2)
                    }}
                  </span>
                </div>
                
                <!-- Discount Input -->
                <div class="flex justify-between items-center gap-2">
                  <span class="text-sm text-muted-foreground">Отстъпка (%):</span>
                  <div class="flex items-center gap-2">
                    <input
                      v-model.number="form.discountPercent"
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      class="w-20 h-8 px-2 text-sm text-right border rounded"
                      placeholder="0"
                    />
                    <span class="text-sm">%</span>
                  </div>
                </div>
                
                <!-- Discount Amount (if discount applied) -->
                <div v-if="form.discountPercent > 0" class="flex justify-between items-center text-sm text-red-600">
                  <span>Отстъпка:</span>
                  <span>
                    -€{{
                      (
                        (orderItems && orderItems.length > 0
                          ? orderItems.reduce((sum: number, item: OrderItem) => {
                              if (!item || !item.price || !item.quantity) return sum;
                              return sum + item.price * item.quantity;
                            }, 0)
                          : 0) *
                        (form.discountPercent / 100)
                      ).toFixed(2)
                    }}
                  </span>
                </div>
                
                <!-- Subtotal after discount -->
                <div v-if="form.discountPercent > 0" class="flex justify-between items-center font-medium">
                  <span class="text-sm">Междинна сума:</span>
                  <span>
                    €{{
                      (
                        (orderItems && orderItems.length > 0
                          ? orderItems.reduce((sum: number, item: OrderItem) => {
                              if (!item || !item.price || !item.quantity) return sum;
                              return sum + item.price * item.quantity;
                            }, 0)
                          : 0) *
                        (1 - form.discountPercent / 100)
                      ).toFixed(2)
                    }}
                  </span>
                </div>
                
                <div
                  v-if="
                    form.shippingProvider === 'ekont' &&
                    (form.deliveryMethod === 'econt_office' ||
                      form.deliveryMethod === 'econt_automat') &&
                    selectedOffice &&
                    calculatingShipping
                  "
                  class="flex justify-between items-center"
                >
                  <span class="text-sm text-muted-foreground">Доставка:</span>
                  <span class="text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 class="h-3 w-3 animate-spin" />
                    Изчислява се...
                  </span>
                </div>
                <div v-else-if="shippingCost > 0" class="flex justify-between items-center">
                  <span class="text-sm text-muted-foreground">Доставка:</span>
                  <span class="font-medium">€{{ shippingCost.toFixed(2) }}</span>
                </div>
                <div
                  v-else-if="
                    form.shippingProvider === 'ekont' &&
                    (form.deliveryMethod === 'econt_office' ||
                      form.deliveryMethod === 'econt_automat') &&
                    selectedOffice &&
                    !calculatingShipping
                  "
                  class="flex justify-between items-center"
                >
                  <span class="text-sm text-muted-foreground">Доставка:</span>
                  <span class="text-sm text-muted-foreground">Безплатна (над 90 €)</span>
                </div>
              </div>
            </div>
            <p v-if="formErrors.items" class="text-xs text-destructive">
              {{ formErrors.items }}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button @click="closeDialog" variant="outline" :disabled="isSubmitting"> Отказ </Button>
          <Button @click="handleSubmit" :disabled="isSubmitting">
            <Loader2 v-if="isSubmitting" class="mr-2 h-4 w-4 animate-spin" />
            Създай Поръчка
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
