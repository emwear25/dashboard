<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick, watchEffect } from "vue";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Package, TrendingDown, Save, Plus, Minus } from "lucide-vue-next";

interface Variant {
  size: string;
  color: string;
  stock: number;
  reserved?: number;
  lowStockThreshold?: number;
  price?: number; // Optional variant-specific price
}

interface Props {
  variants: Variant[];
  sizes: string[];
  colors: string[];
  productId?: string;
  readonly?: boolean;
  basePrice?: number; // Base product price for fallback
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false,
});

const emit = defineEmits<{
  (e: "update", variants: Variant[]): void;
  (e: "save", variants: Variant[]): void;
}>();

// Create matrices for editing
const stockMatrix = ref<Record<string, number>>({});
const priceMatrix = ref<Record<string, number | null>>({});

// Local input values for price (to allow typing)
const priceInputValues = ref<Record<string, string>>({});
// Local input values for stock (to allow typing)
const stockInputValues = ref<Record<string, string>>({});

// Initialize matrices from variants (for all size/color combinations)
const initializeMatrix = () => {
  // Only initialize if we have sizes and colors
  if (!props.sizes || props.sizes.length === 0 || !props.colors || props.colors.length === 0) {
    return;
  }

  const stock: Record<string, number> = {};
  const price: Record<string, number | null> = {};
  const priceInput: Record<string, string> = {};
  const stockInput: Record<string, string> = {};

  // Initialize all size/color combinations
  props.sizes.forEach((size) => {
    props.colors.forEach((color) => {
      const key = `${size}-${color}`;
      const existingVariant = props.variants?.find((v) => v.size === size && v.color === color);

      // Preserve user's current stock input if they're typing, otherwise use variant stock
      if (isUserTypingStock.value[key] && stockInputValues.value[key] !== undefined) {
        const typedValue = parseInt(stockInputValues.value[key]) || 0;
        stock[key] = typedValue;
        stockInput[key] = stockInputValues.value[key];
      } else {
        stock[key] = existingVariant?.stock ?? 0;
        stockInput[key] = String(existingVariant?.stock ?? 0);
      }

      const variantPrice = existingVariant?.price;
      price[key] = variantPrice ?? null; // null means use base price

      // Preserve user's current input if they're typing, otherwise use variant price
      if (isUserTyping.value[key] && priceInputValues.value[key] !== undefined) {
        priceInput[key] = priceInputValues.value[key];
      } else {
        priceInput[key] = variantPrice ? variantPrice.toString() : "";
      }
    });
  });

  // Only update if we actually have data to set
  if (Object.keys(stock).length > 0) {
    stockMatrix.value = stock;
    priceMatrix.value = price;
    priceInputValues.value = priceInput;
    stockInputValues.value = stockInput;
  }
};

// Watch for external variant changes (but not our own updates)
let isInternalUpdate = false;
const isUserTyping = ref<Record<string, boolean>>({});
const isUserTypingStock = ref<Record<string, boolean>>({});

// Initialize on mount and when props change
const initializeWhenReady = () => {
  if (
    props.sizes &&
    props.sizes.length > 0 &&
    props.colors &&
    props.colors.length > 0 &&
    !isInternalUpdate
  ) {
    // Check if user is currently typing in any price or stock field
    const isTypingPrice = Object.values(isUserTyping.value).some(Boolean);
    const isTypingStock = Object.values(isUserTypingStock.value).some(Boolean);
    if (!isTypingPrice && !isTypingStock) {
      initializeMatrix();
    }
  }
};

// Initialize immediately if props are already available
if (props.sizes && props.sizes.length > 0 && props.colors && props.colors.length > 0) {
  initializeMatrix();
}

// Initialize on mount
onMounted(() => {
  initializeWhenReady();
});

// Watch all relevant props changes (variants, sizes, colors)
watch(
  () => [props.variants, props.sizes, props.colors],
  () => {
    initializeWhenReady();
  },
  { deep: true, immediate: true }
);

// Get stock for specific size/color
const getStock = (size: string, color: string): number => {
  const key = `${size}-${color}`;
  return stockMatrix.value[key] ?? 0;
};

// Get stock input value (for typing)
const getStockInput = (size: string, color: string): string => {
  const key = `${size}-${color}`;
  // Return input value if exists, otherwise fall back to stock matrix value
  if (stockInputValues.value[key] !== undefined && stockInputValues.value[key] !== "") {
    return stockInputValues.value[key];
  }
  return String(getStock(size, color));
};

// Get price for specific size/color
const getPrice = (size: string, color: string): number | null => {
  const key = `${size}-${color}`;
  return priceMatrix.value[key] ?? null;
};

// Get price input value (for typing)
const getPriceInput = (size: string, color: string): string => {
  const key = `${size}-${color}`;
  return priceInputValues.value[key] ?? "";
};

// Get display price (variant price or base price)
const getDisplayPrice = (size: string, color: string): number => {
  const variantPrice = getPrice(size, color);
  return variantPrice ?? props.basePrice ?? 0;
};

// Get variant for specific size/color
const getVariant = (size: string, color: string): Variant | undefined => {
  return props.variants.find((v) => v.size === size && v.color === color);
};

// Emit updated variants
const emitChanges = () => {
  isInternalUpdate = true;
  const updatedVariants: Variant[] = [];
  props.sizes.forEach((size) => {
    props.colors.forEach((color) => {
      const key = `${size}-${color}`;
      const existingVariant = props.variants.find((v) => v.size === size && v.color === color);
      updatedVariants.push({
        size,
        color,
        stock: stockMatrix.value[key] ?? 0,
        price: priceMatrix.value[key] ?? undefined, // Use undefined if null for optional price
        reserved: existingVariant?.reserved,
        lowStockThreshold: existingVariant?.lowStockThreshold,
      });
    });
  });
  emit("update", updatedVariants);
  // Reset flag after a short delay to allow parent to update
  setTimeout(() => {
    isInternalUpdate = false;
  }, 100);
};

// Update stock input value (allows typing)
const updateStockInput = (size: string, color: string, inputValue: string) => {
  const key = `${size}-${color}`;
  isUserTypingStock.value[key] = true;
  stockInputValues.value[key] = inputValue;
};

// Commit stock value (called on blur or save)
const commitStock = (size: string, color: string) => {
  const key = `${size}-${color}`;
  const inputValue = stockInputValues.value[key] || "";
  const numValue = inputValue === "" ? 0 : parseInt(inputValue) || 0;
  stockMatrix.value[key] = Math.max(0, numValue);
  stockInputValues.value[key] = String(stockMatrix.value[key]);
  isUserTypingStock.value[key] = false;
};

// Update stock for specific size/color (local only, no emit) - for +/- buttons
const updateStock = (size: string, color: string, value: number) => {
  const key = `${size}-${color}`;
  stockMatrix.value[key] = Math.max(0, value);
  stockInputValues.value[key] = String(stockMatrix.value[key]);
};

// Update price input value (allows typing)
const updatePriceInput = (size: string, color: string, inputValue: string) => {
  const key = `${size}-${color}`;
  isUserTyping.value[key] = true;
  priceInputValues.value[key] = inputValue;
};

// Commit price value (called on blur or save)
const commitPrice = (size: string, color: string) => {
  const key = `${size}-${color}`;
  const inputValue = priceInputValues.value[key] || "";
  const numValue = inputValue === "" ? null : parseFloat(inputValue);

  if (numValue !== null && !isNaN(numValue) && numValue > 0) {
    priceMatrix.value[key] = numValue;
  } else {
    priceMatrix.value[key] = null;
    priceInputValues.value[key] = "";
  }

  // Mark that user is no longer typing
  isUserTyping.value[key] = false;
};

// Check if variant is low stock (uses local matrix for real-time updates)
const isLowStock = (size: string, color: string): boolean => {
  const variant = getVariant(size, color);
  const stock = getStock(size, color);
  const available = stock - (variant?.reserved || 0);
  return available <= (variant?.lowStockThreshold || 5) && available > 0;
};

// Check if variant is out of stock (uses local matrix for real-time updates)
const isOutOfStock = (size: string, color: string): boolean => {
  const variant = getVariant(size, color);
  const stock = getStock(size, color);
  return stock - (variant?.reserved || 0) <= 0;
};

// Calculate totals
const totalStock = computed(() => {
  return Object.values(stockMatrix.value).reduce((sum, stock) => sum + stock, 0);
});

const totalReserved = computed(() => {
  return props.variants.reduce((sum, v) => sum + (v.reserved || 0), 0);
});

const lowStockCount = computed(() => {
  let count = 0;
  props.sizes.forEach((size) => {
    props.colors.forEach((color) => {
      if (isLowStock(size, color)) count++;
    });
  });
  return count;
});

const outOfStockCount = computed(() => {
  let count = 0;
  props.sizes.forEach((size) => {
    props.colors.forEach((color) => {
      if (isOutOfStock(size, color)) count++;
    });
  });
  return count;
});

// Save changes
const saveChanges = () => {
  // Commit all pending inputs first
  props.sizes.forEach((size) => {
    props.colors.forEach((color) => {
      commitPrice(size, color);
      commitStock(size, color);
    });
  });

  const updatedVariants: Variant[] = [];
  props.sizes.forEach((size) => {
    props.colors.forEach((color) => {
      const key = `${size}-${color}`;
      const existingVariant = props.variants.find((v) => v.size === size && v.color === color);
      const variantPrice = priceMatrix.value[key];
      updatedVariants.push({
        size,
        color,
        stock: stockMatrix.value[key] ?? 0,
        price:
          variantPrice !== null && variantPrice !== undefined && variantPrice > 0
            ? variantPrice
            : undefined,
        reserved: existingVariant?.reserved,
        lowStockThreshold: existingVariant?.lowStockThreshold,
      });
    });
  });
  emit("update", updatedVariants);
  emit("save", updatedVariants);
};

// Bulk operations
const bulkSetStock = ref<number | undefined>(undefined);
const applyBulkStock = () => {
  if (bulkSetStock.value === undefined || bulkSetStock.value < 0) return;

  props.sizes.forEach((size) => {
    props.colors.forEach((color) => {
      updateStock(size, color, bulkSetStock.value!);
    });
  });

  bulkSetStock.value = undefined;
};

const setUserTypingStock = (size: string, color: string) => {
  const key = `${size}-${color}`;
  isUserTypingStock.value[key] = true;
};

const setUserTyping = (size: string, color: string) => {
  const key = `${size}-${color}`;
  isUserTyping.value[key] = true;
};
</script>

<template>
  <Card>
    <CardHeader>
      <div class="flex items-center justify-between">
        <div>
          <CardTitle class="text-lg">Наличност по Варианти</CardTitle>
          <CardDescription class="text-xs">
            Управлявайте наличността за всяка комбинация размер/цвят
          </CardDescription>
        </div>
        <div class="flex gap-2">
          <Badge variant="outline" class="gap-1">
            <Package class="h-3 w-3" />
            Общо: {{ totalStock }}
          </Badge>
          <Badge v-if="totalReserved > 0" variant="secondary" class="gap-1">
            Резервирани: {{ totalReserved }}
          </Badge>
          <Badge v-if="lowStockCount > 0" variant="destructive" class="gap-1">
            <TrendingDown class="h-3 w-3" />
            Ниски: {{ lowStockCount }}
          </Badge>
        </div>
      </div>
    </CardHeader>
    <CardContent class="space-y-4">
      <!-- Bulk Actions -->
      <div v-if="!readonly" class="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
        <span class="text-sm font-medium">Масово задаване:</span>
        <Input
          v-model.number="bulkSetStock"
          type="number"
          min="0"
          placeholder="Количество"
          class="w-32 h-9"
        />
        <Button
          @click="applyBulkStock"
          :disabled="bulkSetStock === undefined || bulkSetStock < 0"
          size="sm"
          variant="secondary"
        >
          Приложи за всички
        </Button>
      </div>

      <!-- Stock Grid -->
      <div class="overflow-x-auto">
        <table class="w-full border-collapse">
          <thead>
            <tr>
              <th class="border p-2 bg-muted/30 text-left font-semibold">Размер / Цвят</th>
              <th
                v-for="color in colors"
                :key="color"
                class="border p-2 bg-muted/30 text-center font-semibold"
              >
                {{ color }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="size in sizes" :key="size">
              <td class="border p-2 bg-muted/30 font-semibold">
                {{ size }}
              </td>
              <td
                v-for="color in colors"
                :key="`${size}-${color}`"
                class="border p-2"
                :class="{
                  'bg-red-50': isOutOfStock(size, color),
                  'bg-yellow-50': isLowStock(size, color),
                }"
              >
                <div class="space-y-2">
                  <!-- Stock Input -->
                  <div class="flex items-center gap-1">
                    <Button
                      v-if="!readonly"
                      @click="updateStock(size, color, getStock(size, color) - 1)"
                      size="icon"
                      variant="ghost"
                      class="h-7 w-7"
                      :disabled="getStock(size, color) <= 0"
                    >
                      <Minus class="h-3 w-3" />
                    </Button>
                    <input
                      :value="getStockInput(size, color)"
                      @input="
                        (e: any) =>
                          updateStockInput(size, color, (e.target as HTMLInputElement).value)
                      "
                      @focus="setUserTypingStock(size, color)"
                      @blur="commitStock(size, color)"
                      type="text"
                      inputmode="numeric"
                      class="flex h-8 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-center ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      :readonly="readonly"
                    />
                    <Button
                      v-if="!readonly"
                      @click="updateStock(size, color, getStock(size, color) + 1)"
                      size="icon"
                      variant="ghost"
                      class="h-7 w-7"
                    >
                      <Plus class="h-3 w-3" />
                    </Button>
                  </div>

                  <!-- Price Input -->
                  <div class="relative">
                    <input
                      :value="getPriceInput(size, color)"
                      @input="
                        (e: any) =>
                          updatePriceInput(size, color, (e.target as HTMLInputElement).value)
                      "
                      @focus="setUserTyping(size, color)"
                      @blur="commitPrice(size, color)"
                      type="text"
                      inputmode="decimal"
                      :placeholder="basePrice ? `${basePrice.toFixed(2)} лв` : 'Цена'"
                      class="flex h-8 w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-center ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pr-8"
                      :readonly="readonly"
                    />
                    <span
                      class="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none"
                    >
                      лв
                    </span>
                    <div
                      v-if="getPrice(size, color) === null && basePrice"
                      class="text-[10px] text-center text-muted-foreground mt-0.5"
                    >
                      Базова цена: {{ basePrice.toFixed(2) }} лв
                    </div>
                  </div>

                  <!-- Reserved Badge -->
                  <div
                    v-if="
                      getVariant(size, color)?.reserved && getVariant(size, color)!.reserved! > 0
                    "
                    class="text-xs text-center"
                  >
                    <Badge variant="secondary" class="text-[10px]">
                      Резервирани: {{ getVariant(size, color)?.reserved }}
                    </Badge>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Save Button -->
      <div v-if="!readonly" class="flex justify-end gap-2 pt-2">
        <Button @click="saveChanges" class="gap-2">
          <Save class="h-4 w-4" />
          Запази промените
        </Button>
      </div>

      <!-- Legend -->
      <div class="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
        <div class="flex items-center gap-1">
          <div class="w-4 h-4 bg-green-50 border rounded"></div>
          <span>В наличност</span>
        </div>
        <div class="flex items-center gap-1">
          <div class="w-4 h-4 bg-yellow-50 border rounded"></div>
          <span>Нисък запас</span>
        </div>
        <div class="flex items-center gap-1">
          <div class="w-4 h-4 bg-red-50 border rounded"></div>
          <span>Изчерпан</span>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
