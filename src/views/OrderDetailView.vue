<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import {
  Loader2,
  Package,
  Truck,
  MapPin,
  Phone,
  Mail,
  User,
  CheckCircle,
  Copy,
  Ticket,
} from "lucide-vue-next";
import { apiGet, apiPost } from "@/utils/api";

const { toast } = useToast();

const route = useRoute();
const router = useRouter();

const order = ref<any>(null);
const isLoading = ref(true);
const isCreatingShipment = ref(false);
const error = ref("");

const fetchOrder = async () => {
  isLoading.value = true;
  error.value = "";

  try {
    const orderId = route.params.id;
    console.log("[OrderDetail] Fetching order:", orderId);

    // Try to get single order by ID first
    const data = await apiGet("orders/admin/all");

    if (!data.success) {
      throw new Error("Failed to fetch orders");
    }
    console.log("[OrderDetail] Response:", data);

    if (data.success && data.data) {
      // Find order by ID
      const foundOrder = data.data.find((o: any) => o._id === orderId || o.orderNumber === orderId);

      if (foundOrder) {
        order.value = foundOrder;
        console.log("[OrderDetail] Order found:", foundOrder.orderNumber);
      } else {
        error.value = "Order not found";
        console.log("[OrderDetail] Order not found in", data.data.length, "orders");
      }
    } else {
      error.value = "No orders returned";
    }
  } catch (err) {
    console.error("[OrderDetail] Failed to load order:", err);
    error.value = "Failed to load order details";
  } finally {
    isLoading.value = false;
  }
};

const createEcontShipment = async () => {
  if (!order.value) return;

  isCreatingShipment.value = true;

  try {
    const data = await apiPost(`orders/${order.value._id}/create-econt-shipment`, {});

    if (data.success) {
      // Refresh order data
      await fetchOrder();

      // Show success toast
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
    isCreatingShipment.value = false;
  }
};

const createSpeedyShipment = async () => {
  if (!order.value) return;

  isCreatingShipment.value = true;

  try {
    const data = await apiPost(`orders/${order.value._id}/create-speedy-shipment`, {});

    if (data.success) {
      // Refresh order data
      await fetchOrder();

      // Show success toast
      toast({
        title: "✅ Speedy пратка създадена!",
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
      description: err.message || "Не успяхме да създадем Speedy пратка",
      variant: "destructive",
      duration: 5000,
    });
  } finally {
    isCreatingShipment.value = false;
  }
};

const getStatusBadgeVariant = (status: string) => {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    pending: "secondary",
    confirmed: "default",
    processing: "default",
    shipped: "default",
    delivered: "outline",
    cancelled: "destructive",
  };
  return variants[status] || "default";
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString("bg-BG", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Helper to convert camelCase field names to readable labels
const formatFieldName = (fieldName: string): string => {
  const fieldLabels: Record<string, string> = {
    babyName: 'Име на бебето',
    birthDate: 'Дата на раждане',
    birthTime: 'Час на раждане',
    babyWeight: 'Тегло при раждане',
    babyLength: 'Ръст при раждане',
  };
  return fieldLabels[fieldName] || fieldName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
};

onMounted(() => {
  fetchOrder();
});
</script>

<template>
  <div class="order-detail">
    <!-- Loading -->
    <div v-if="isLoading" class="flex items-center justify-center p-8">
      <Loader2 class="h-8 w-8 animate-spin text-primary" />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="p-8 text-center text-red-600">
      {{ error }}
    </div>

    <!-- Order Details -->
    <div v-else-if="order" class="space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold">Поръчка #{{ order.orderNumber }}</h1>
          <p class="text-muted-foreground mt-1">
            {{ formatDate(order.createdAt) }}
          </p>
        </div>
        <div class="flex items-center gap-3">
          <Badge :variant="getStatusBadgeVariant(order.orderStatus)">
            {{ order.orderStatus }}
          </Badge>
          <Button variant="outline" @click="router.back()"> ← Назад </Button>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Left Column - Order Items & Shipping -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Items -->
          <Card>
            <CardHeader>
              <CardTitle class="flex items-center gap-2">
                <Package class="h-5 w-5" />
                Продукти
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div class="space-y-4">
                <div
                  v-for="item in order.items"
                  :key="item._id"
                  class="flex gap-4 pb-4 border-b last:border-0"
                >
                  <img
                    v-if="item.image"
                    :src="item.image"
                    :alt="item.name"
                    class="w-20 h-20 object-cover rounded-lg"
                  />
                  <div class="flex-1">
                    <h4 class="font-semibold">{{ item.name }}</h4>
                    <div class="text-sm text-muted-foreground space-y-1 mt-1">
                      <p v-if="item.size">Размер: {{ item.size }}</p>
                      <p v-if="item.color">Цвят: {{ item.color }}</p>
                      <p v-if="item.customization" class="text-primary font-medium">
                        {{ item.customization }}
                      </p>
                      <!-- Priced personalization options (e.g., back embroidery) -->
                      <div
                        v-if="item.pricedOptions && item.pricedOptions.length > 0"
                        class="mt-1 p-2 bg-amber-50 rounded-md border border-amber-200"
                      >
                        <p
                          v-for="opt in item.pricedOptions"
                          :key="opt.name"
                          class="text-sm text-amber-700 font-medium"
                        >
                          ➕ {{ opt.label || opt.name }}: +€{{ (opt.price || 0).toFixed(2) }}
                        </p>
                      </div>
                      <!-- Embroidery Details -->
                      <div v-if="item.embroidery" class="mt-2 p-2 bg-orange-50 rounded-md border border-orange-200">
                        <p class="text-xs font-semibold text-orange-700 mb-1">🧵 Детайли за бродерия:</p>
                        <p v-if="item.embroidery.name" class="text-sm">
                          <strong>Име:</strong> {{ item.embroidery.name }}
                        </p>
                        <p v-if="item.embroidery.color" class="text-sm">
                          <strong>Цвят:</strong> {{ item.embroidery.color }}
                        </p>
                        <p v-if="item.embroidery.font" class="text-sm">
                          <strong>Шрифт:</strong> {{ item.embroidery.font }}
                        </p>
                        <p v-if="item.embroidery.notes" class="text-sm text-orange-600 mt-1">
                          <strong>📝 Инструкции:</strong> {{ item.embroidery.notes }}
                        </p>
                        <!-- Custom Fields (e.g., birth details) -->
                        <div v-if="item.embroidery.customFields && Object.keys(item.embroidery.customFields).length > 0" class="mt-1 pt-1 border-t border-orange-200">
                          <p class="text-xs font-semibold text-orange-700">Персонализирани полета:</p>
                          <div v-for="(value, key) in item.embroidery.customFields" :key="key" class="text-sm">
                            <strong>{{ formatFieldName(String(key)) }}:</strong> {{ value }}
                          </div>
                        </div>
                      </div>
                      <p>Количество: {{ item.quantity }}</p>
                      <p>Цена: €{{ item.price.toFixed(2) }}</p>
                    </div>
                  </div>
                  <div class="text-right font-semibold">
                    €{{ (item.price * item.quantity).toFixed(2) }}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <!-- Shipping Address -->
          <Card>
            <CardHeader>
              <CardTitle class="flex items-center gap-2">
                <MapPin class="h-5 w-5" />
                Адрес за доставка
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div class="space-y-2">
                <div class="flex items-start gap-2">
                  <User class="h-4 w-4 mt-1 text-muted-foreground" />
                  <div>
                    <p class="font-medium">
                      {{ order.shippingAddress.firstName }}
                      {{ order.shippingAddress.lastName }}
                    </p>
                  </div>
                </div>
                <div class="flex items-start gap-2">
                  <Phone class="h-4 w-4 mt-1 text-muted-foreground" />
                  <p>{{ order.shippingAddress.phone }}</p>
                </div>
                <div class="flex items-start gap-2">
                  <Mail class="h-4 w-4 mt-1 text-muted-foreground" />
                  <p>{{ order.shippingAddress.email }}</p>
                </div>
                <div class="flex items-start gap-2">
                  <MapPin class="h-4 w-4 mt-1 text-muted-foreground" />
                  <div>
                    <p>{{ order.shippingAddress.street }}</p>
                    <p>
                      {{ order.shippingAddress.city }},
                      {{ order.shippingAddress.postalCode }}
                    </p>
                    <p>{{ order.shippingAddress.country }}</p>
                  </div>
                </div>
                <div
                  v-if="order.shippingAddress.notes"
                  class="flex items-start gap-2 mt-4 pt-4 border-t"
                >
                  <p class="text-sm text-muted-foreground">
                    <strong>Бележки:</strong> {{ order.shippingAddress.notes }}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <!-- Econt Shipment -->
          <Card
            v-if="
              (order.deliveryProvider === 'econt' || !order.deliveryProvider) &&
              order.deliveryMethod &&
              order.deliveryMethod !== 'courier_address'
            "
          >
            <CardHeader>
              <CardTitle class="flex items-center gap-2">
                <Truck class="h-5 w-5" />
                Econt Доставка
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div class="space-y-4">
                <div v-if="order.econtShipmentNumber">
                  <p class="text-sm text-muted-foreground">Товарителница:</p>
                  <p class="text-lg font-mono font-bold">
                    {{ order.econtShipmentNumber }}
                  </p>
                  <a
                    :href="`https://www.econt.com/track?shipmentNumber=${order.econtShipmentNumber}`"
                    target="_blank"
                    class="text-sm text-blue-600 hover:underline"
                  >
                    🔍 Проследи пратката
                  </a>
                </div>

                <div v-if="order.econtOfficeName">
                  <p class="text-sm text-muted-foreground">Офис за получаване:</p>
                  <p class="font-medium">{{ order.econtOfficeName }}</p>
                  <p class="text-sm text-muted-foreground">Код: {{ order.econtOfficeCode }}</p>
                </div>

                <div v-if="!order.econtShipmentNumber" class="pt-4 border-t">
                  <Button
                    @click="createEcontShipment"
                    :disabled="isCreatingShipment"
                    class="w-full"
                  >
                    <Loader2 v-if="isCreatingShipment" class="mr-2 h-4 w-4 animate-spin" />
                    <Truck v-else class="mr-2 h-4 w-4" />
                    {{ isCreatingShipment ? "Създаване..." : "Създай Econt пратка" }}
                  </Button>
                  <p class="text-xs text-muted-foreground mt-2 text-center">
                    Това ще генерира товарителница и номер за проследяване
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <!-- Speedy Shipment -->
          <Card
            v-if="
              order.deliveryProvider === 'speedy' &&
              order.deliveryMethod &&
              order.deliveryMethod !== 'courier_address'
            "
          >
            <CardHeader>
              <CardTitle class="flex items-center gap-2">
                <Truck class="h-5 w-5" />
                Speedy Доставка
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div class="space-y-4">
                <div v-if="order.speedyShipmentNumber">
                  <p class="text-sm text-muted-foreground">Товарителница:</p>
                  <p class="text-lg font-mono font-bold">
                    {{ order.speedyShipmentNumber }}
                  </p>
                  <a
                    :href="`https://www.speedy.bg/track?parcelNumber=${order.speedyShipmentNumber}`"
                    target="_blank"
                    class="text-sm text-blue-600 hover:underline"
                  >
                    🔍 Проследи пратката
                  </a>
                </div>

                <div v-if="order.speedyOfficeName">
                  <p class="text-sm text-muted-foreground">Офис за получаване:</p>
                  <p class="font-medium">{{ order.speedyOfficeName }}</p>
                  <p class="text-sm text-muted-foreground">ID: {{ order.speedyOfficeId }}</p>
                </div>

                <div v-if="!order.speedyShipmentNumber" class="pt-4 border-t">
                  <Button
                    @click="createSpeedyShipment"
                    :disabled="isCreatingShipment"
                    class="w-full"
                  >
                    <Loader2 v-if="isCreatingShipment" class="mr-2 h-4 w-4 animate-spin" />
                    <Truck v-else class="mr-2 h-4 w-4" />
                    {{ isCreatingShipment ? "Създаване..." : "Създай Speedy пратка" }}
                  </Button>
                  <p class="text-xs text-muted-foreground mt-2 text-center">
                    Това ще генерира товарителница и номер за проследяване
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <!-- Right Column - Summary -->
        <div class="space-y-6">
          <!-- Price Summary -->
          <Card>
            <CardHeader>
              <CardTitle>Обобщение</CardTitle>
            </CardHeader>
            <CardContent>
              <div class="space-y-3">
                <!-- Show original subtotal if discount was applied -->
                <div v-if="order.discountTotal > 0 || order.couponCode" class="flex justify-between text-sm">
                  <span class="text-muted-foreground">Първоначална сума:</span>
                  <span class="line-through text-muted-foreground">€{{ (order.subtotalBeforeDiscount || (order.subtotal + (order.discountTotal || 0))).toFixed(2) }}</span>
                </div>

                <!-- Coupon/Discount Applied -->
                <div v-if="order.couponCode || order.discountTotal > 0" class="p-2 bg-green-50 rounded-md border border-green-200">
                  <div class="flex items-center gap-2 text-green-700">
                    <Ticket class="h-4 w-4" />
                    <span class="font-medium text-sm">Приложена отстъпка</span>
                  </div>
                  <div v-if="order.couponCode" class="mt-1 text-sm">
                    <span class="text-muted-foreground">Код:</span>
                    <Badge variant="outline" class="ml-2 font-mono">{{ order.couponCode }}</Badge>
                  </div>
                  <!-- Show applied discounts details -->
                  <div v-if="order.appliedDiscounts && order.appliedDiscounts.length > 0" class="mt-1 space-y-1">
                    <div v-for="(discount, idx) in order.appliedDiscounts" :key="idx" class="text-xs text-green-600">
                      <span v-if="discount.name">{{ discount.name }}: </span>
                      <span v-if="discount.type === 'percentage'">{{ discount.value }}%</span>
                      <span v-else>-€{{ discount.amount?.toFixed(2) || '0.00' }}</span>
                    </div>
                  </div>
                  <div class="flex justify-between mt-2 text-sm font-medium text-green-700">
                    <span>Отстъпка:</span>
                    <span>-€{{ (order.discountTotal || 0).toFixed(2) }}</span>
                  </div>
                </div>

                <div class="flex justify-between text-sm">
                  <span class="text-muted-foreground">Междинна сума:</span>
                  <span>€{{ order.subtotal.toFixed(2) }}</span>
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-muted-foreground">Доставка:</span>
                  <span>€{{ order.shippingCost.toFixed(2) }}</span>
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-muted-foreground">ДДС:</span>
                  <span>€{{ order.tax.toFixed(2) }}</span>
                </div>
                <div class="flex justify-between font-bold text-lg pt-3 border-t">
                  <span>Общо:</span>
                  <span>€{{ order.total.toFixed(2) }}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <!-- Payment Info -->
          <Card>
            <CardHeader>
              <CardTitle>Плащане</CardTitle>
            </CardHeader>
            <CardContent>
              <div class="space-y-2">
                <div class="flex justify-between text-sm">
                  <span class="text-muted-foreground">Метод:</span>
                  <span class="font-medium">{{
                    order.paymentMethod === "cash_on_delivery"
                      ? "Наложен платеж"
                      : order.paymentMethod
                  }}</span>
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-muted-foreground">Статус:</span>
                  <Badge :variant="order.paymentStatus === 'paid' ? 'default' : 'secondary'">
                    {{ order.paymentStatus }}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <!-- Delivery Method -->
          <Card v-if="order.deliveryMethod">
            <CardHeader>
              <CardTitle>Метод на доставка</CardTitle>
            </CardHeader>
            <CardContent>
              <div class="space-y-2 text-sm">
                <p v-if="order.deliveryMethod === 'courier_address'">🚚 Куриер до адрес</p>
                <p v-else-if="order.deliveryMethod === 'econt_office'">🏢 Офис на Еконт</p>
                <p v-else-if="order.deliveryMethod === 'econt_automat'">📦 Eконтомат</p>
                <p v-else>{{ order.deliveryMethod }}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.order-detail {
  padding: 1.5rem;
}
</style>
