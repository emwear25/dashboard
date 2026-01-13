<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick, watchEffect } from "vue";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Package, TrendingDown, Save, Plus, Minus, Link2, Unlink } from "lucide-vue-next";
import { apiPost } from "@/utils/api";

interface Variant {
  size: string;
  color: string;
  stock: number;
  reserved?: number;
  lowStockThreshold?: number;
  price?: number; // Optional variant-specific price
  masterVariantId?: string; // Reference to master variant for size aliases
  _id?: string; // Variant ID for alias resolution
}

interface Color {
  name: string;
  hex?: string;
}

interface Props {
  variants: Variant[];
  sizes: string[];
  colors: string[] | Color[]; // Support both string and object formats
  productId?: string;
  readonly?: boolean;
  basePrice?: number; // Base product price for fallback
  masterProductId?: string; // If this product is linked to a master
  masterProductName?: string; // Name of the master product
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false,
});

const emit = defineEmits<{
  (e: "update", variants: Variant[]): void;
  (e: "save", variants: Variant[]): void;
  (e: "refresh"): void; // New event to request parent to refresh product data
}>();

// Note: All prices are now stored in EUR directly in the database
// No conversion needed - display and save values as-is

// Helper functions to handle both string and object color formats
const getColorName = (color: string | Color): string => {
  return typeof color === "string" ? color : color.name;
};

const getColorHex = (color: string | Color): string | undefined => {
  return typeof color === "string" ? undefined : color.hex;
};

// Get array of color names for easier iteration
const colorNames = computed(() => {
  return props.colors.map(getColorName);
});

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
      const colorName = getColorName(color);
      const key = `${size}-${colorName}`;
      const existingVariant = props.variants?.find((v) => v.size === size && v.color === colorName);

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
      price[key] = variantPrice ?? null; // null means use base price (stored in EUR)

      // Preserve user's current input if they're typing, otherwise use the price directly (already EUR)
      if (isUserTyping.value[key] && priceInputValues.value[key] !== undefined) {
        priceInput[key] = priceInputValues.value[key];
      } else {
        // Price is already in EUR - display directly
        priceInput[key] = variantPrice ? variantPrice.toFixed(2) : "";
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

// Get stock for a specific size/color combination
const getStock = (size: string, color: string): number => {
  const key = `${size}-${color}`;
  const variant = getVariant(size, color);
  
  // Check if this variant is an alias
  if (variant?.masterVariantId) {
    // If it's an alias, return the master variant's stock from stockMatrix
    const masterVariant = getMasterVariant(size, color);
    if (masterVariant) {
      const masterKey = `${masterVariant.size}-${masterVariant.color}`;
      // Return from stockMatrix if available (for reactive updates), otherwise from master variant
      return stockMatrix.value[masterKey] ?? masterVariant.stock ?? 0;
    }
  }
  
  // Otherwise return the variant's own stock from stockMatrix (for reactive updates)
  return stockMatrix.value[key] ?? variant?.stock ?? 0;
};

// Get stock input value (for typing)
const getStockInput = (size: string, color: string): string => {
  const key = `${size}-${color}`;
  const variant = getVariant(size, color);
  
  // Check if this variant is an alias
  if (variant?.masterVariantId) {
    const masterVariant = getMasterVariant(size, color);
    if (masterVariant) {
      const masterKey = `${masterVariant.size}-${masterVariant.color}`;
      // Return master's input value if user is typing, otherwise master's stock
      if (stockInputValues.value[masterKey] !== undefined && stockInputValues.value[masterKey] !== "") {
        return stockInputValues.value[masterKey];
      }
      return String(stockMatrix.value[masterKey] ?? masterVariant.stock ?? 0);
    }
  }
  
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

// Get reserved stock
const getReserved = (size: string, color: string): number => {
  // Check if this variant is an alias
  const variant = getVariant(size, color);
  if (variant?.masterVariantId) {
    // If it's an alias, return the master variant's reserved count
    const masterVariant = getMasterVariant(size, color);
    if (masterVariant) {
      return masterVariant.reserved ?? 0;
    }
  }
  
  // Otherwise return the variant's own reserved count
  return variant?.reserved ?? 0;
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

// Check if variant is an alias (has a master variant)
const isAliasVariant = (size: string, color: string): boolean => {
  const variant = getVariant(size, color);
  return !!variant?.masterVariantId;
};

// Get master variant for an alias
const getMasterVariant = (size: string, color: string): Variant | undefined => {
  const variant = getVariant(size, color);
  if (!variant?.masterVariantId) return undefined;
  
  // Convert both IDs to strings for comparison (in case one is ObjectId)
  const masterIdStr = String(variant.masterVariantId);
  return props.variants.find((v) => String(v._id) === masterIdStr);
};

// Emit updated variants
const emitChanges = () => {
  isInternalUpdate = true;
  const updatedVariants: Variant[] = [];
  props.sizes.forEach((size) => {
    props.colors.forEach((color) => {
      const colorName = getColorName(color);
      const key = `${size}-${colorName}`;
      const existingVariant = props.variants.find((v) => v.size === size && v.color === colorName);
      updatedVariants.push({
        size,
        color: colorName,
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

// Update stock and emit changes (for +/- buttons)
const updateStockAndEmit = (size: string, color: string, delta: number) => {
  const key = `${size}-${color}`;
  const currentStock = stockMatrix.value[key] ?? 0;
  const updatedValue = Math.max(0, currentStock + delta);
  
  // Update the matrix directly
  stockMatrix.value[key] = updatedValue;
  stockInputValues.value[key] = String(updatedValue);
  
  // Clear typing flag
  isUserTypingStock.value[key] = false;
  
  // Force reactivity by creating a new object reference
  stockMatrix.value = { ...stockMatrix.value };
  
  // Emit changes immediately
  emitChanges();
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
  const reserved = getReserved(size, color);
  const available = stock - reserved;
  return available <= (variant?.lowStockThreshold || 5) && available > 0;
};

// Check if variant is out of stock (uses local matrix for real-time updates)
const isOutOfStock = (size: string, color: string): boolean => {
  const stock = getStock(size, color);
  const reserved = getReserved(size, color);
  return stock - reserved <= 0;
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
      const colorName = getColorName(color);
      if (isLowStock(size, colorName)) count++;
    });
  });
  return count;
});

const outOfStockCount = computed(() => {
  let count = 0;
  props.sizes.forEach((size) => {
    props.colors.forEach((color) => {
      const colorName = getColorName(color);
      if (isOutOfStock(size, colorName)) count++;
    });
  });
  return count;
});

// Save changes
const saveChanges = () => {
  // Commit all pending inputs first
  props.sizes.forEach((size) => {
    props.colors.forEach((color) => {
      const colorName = getColorName(color);
      commitPrice(size, colorName);
      commitStock(size, colorName);
    });
  });

  const updatedVariants: Variant[] = [];
  props.sizes.forEach((size) => {
    props.colors.forEach((color) => {
      const colorName = getColorName(color);
      const key = `${size}-${colorName}`;
      const existingVariant = props.variants.find((v) => v.size === size && v.color === colorName);
      
      // Get the EUR price from input - store directly as EUR (no conversion needed)
      const inputPriceEur = priceMatrix.value[key];
      const priceToSave = inputPriceEur !== null && inputPriceEur !== undefined && inputPriceEur > 0
        ? Math.round(inputPriceEur * 100) / 100 // Round to 2 decimal places
        : undefined;
      
      updatedVariants.push({
        size,
        color: colorName,
        stock: stockMatrix.value[key] ?? 0,
        price: priceToSave,
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
      const colorName = getColorName(color);
      updateStock(size, colorName, bulkSetStock.value!);
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

// Size alias management
const linkingVariant = ref<{ size: string; color: string } | null>(null);

const linkVariantToMaster = async (aliasSize: string, aliasColor: string, masterSize: string, masterColor: string) => {
  if (!props.productId) return;

  try {
    const result = await apiPost('variant-aliases/link', {
      productId: props.productId,
      aliasSize,
      aliasColor,
      masterSize,
      masterColor,
    });

    // Find the alias variant and update it locally
    const aliasVariant = props.variants.find(v => v.size === aliasSize && v.color === aliasColor);
    const masterVariant = props.variants.find(v => v.size === masterSize && v.color === masterColor);
    
    if (aliasVariant && masterVariant?._id) {
      aliasVariant.masterVariantId = masterVariant._id;
      emit('update', props.variants);
    }

    alert(`✅ Успешно! Размер "${aliasSize}" сега споделя наличност с "${masterSize}".`);
  } catch (error: any) {
    console.error('Error linking variant:', error);
    alert(error.message || 'Failed to link variant');
  }
};

const unlinkVariant = async (size: string, color: string) => {
  if (!props.productId) return;

  if (!confirm(`Сигурни ли сте, че искате да премахнете връзката за размер "${size}"?`)) {
    return;
  }

  try {
    await apiPost('variant-aliases/unlink', {
      productId: props.productId,
      size,
      color,
    });

    // Find the variant and remove the masterVariantId locally
    const variant = props.variants.find(v => v.size === size && v.color === color);
    if (variant) {
      variant.masterVariantId = undefined;
      emit('update', props.variants);
    }

    alert(`✅ Успешно! Размер "${size}" вече не споделя наличност.`);
  } catch (error: any) {
    console.error('Error unlinking variant:', error);
    alert(error.message || 'Failed to unlink variant');
  }
};

// Get available master variants for a given color
const getAvailableMasterVariants = (currentSize: string, color: string) => {
  return props.sizes
    .filter(size => size !== currentSize)
    .filter(size => {
      const variant = getVariant(size, color);
      // Only show variants that are not aliases themselves
      return variant && !variant.masterVariantId;
    });
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
          <!-- Product Group Indicator -->
          <div v-if="masterProductId" class="mt-2">
            <Badge variant="outline" class="text-xs gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
              Споделя наличност с: {{ masterProductName || 'Master Product' }}
            </Badge>
          </div>
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
                :key="getColorName(color)"
                class="border p-2 bg-muted/30 text-center font-semibold"
              >
                <div class="flex items-center justify-center gap-2">
                  <div
                    v-if="getColorHex(color)"
                    class="w-4 h-4 rounded border border-border"
                    :style="{ backgroundColor: getColorHex(color) }"
                  ></div>
                  <span>{{ getColorName(color) }}</span>
                </div>
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
                :key="`${size}-${getColorName(color)}`"
                class="border p-2"
                :class="{
                  'bg-red-50': isOutOfStock(size, getColorName(color)),
                  'bg-yellow-50': isLowStock(size, getColorName(color)),
                }"
              >
                <div class="space-y-2">
                  <!-- Alias Indicator -->
                  <div v-if="isAliasVariant(size, getColorName(color))" class="text-center">
                    <Badge variant="outline" class="text-[10px] gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                      Споделя с {{ getMasterVariant(size, getColorName(color))?.size }}
                    </Badge>
                  </div>

                  <!-- Stock Input -->
                  <div class="space-y-1">
                    <label class="text-[10px] text-muted-foreground font-medium">Количество</label>
                    <div class="flex items-center gap-1">
                      <Button
                        v-if="!readonly"
                        @click="updateStockAndEmit(size, getColorName(color), -1)"
                        size="icon"
                        variant="ghost"
                        class="h-7 w-7"
                        :disabled="getStock(size, getColorName(color)) <= 0"
                      >
                        <Minus class="h-3 w-3" />
                      </Button>
                      <input
                        :value="getStockInput(size, getColorName(color))"
                        @input="
                          (e: any) =>
                            updateStockInput(size, getColorName(color), (e.target as HTMLInputElement).value)
                        "
                        @focus="setUserTypingStock(size, getColorName(color))"
                        @blur="commitStock(size, getColorName(color)); saveChanges()"
                        type="text"
                        inputmode="numeric"
                        class="flex h-8 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-center ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        :readonly="readonly || !!masterProductId || isAliasVariant(size, getColorName(color))"
                        :title="masterProductId ? `Този продукт споделя наличност с ${masterProductName}` : (isAliasVariant(size, getColorName(color)) ? `Този размер споделя наличност с ${getMasterVariant(size, getColorName(color))?.size}` : undefined)"
                      />
                      <Button
                        v-if="!readonly && !masterProductId"
                        @click="updateStockAndEmit(size, getColorName(color), 1)"
                        size="icon"
                        variant="ghost"
                        class="h-7 w-7"
                      >
                        <Plus class="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  <!-- Price Input -->
                  <div class="space-y-1">
                    <label class="text-[10px] text-muted-foreground font-medium">Цена</label>
                    <div class="relative">
                      <input
                        :value="getPriceInput(size, getColorName(color))"
                        @input="
                          (e: any) =>
                            updatePriceInput(size, getColorName(color), (e.target as HTMLInputElement).value)
                        "
                        @focus="setUserTyping(size, getColorName(color))"
                        @blur="commitPrice(size, getColorName(color)); saveChanges()"
                        type="text"
                        inputmode="decimal"
                        :placeholder="basePrice ? `€${basePrice.toFixed(2)}` : 'Цена'"
                        class="flex h-8 w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-center ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pr-8"
                        :readonly="readonly"
                      />
                      <span
                        class="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none"
                      >
                        €
                      </span>
                      <div
                        v-if="getPrice(size, getColorName(color)) === null && basePrice"
                        class="text-[10px] text-center text-muted-foreground mt-0.5"
                      >
                        Базова цена: €{{ basePrice.toFixed(2) }}
                      </div>
                    </div>
                  </div>

                  <!-- Size Alias Management -->
                  <div v-if="!readonly && !masterProductId" class="space-y-1">
                    <label class="text-[10px] text-muted-foreground font-medium">Споделя размер с</label>
                    <div v-if="isAliasVariant(size, getColorName(color))" class="flex items-center gap-1">
                      <div class="flex-1 text-xs text-center py-1 px-2 bg-muted rounded">
                        {{ getMasterVariant(size, getColorName(color))?.size }}
                      </div>
                      <Button
                        @click="unlinkVariant(size, getColorName(color))"
                        size="icon"
                        variant="ghost"
                        class="h-7 w-7"
                        title="Премахни връзката"
                      >
                        <Unlink class="h-3 w-3" />
                      </Button>
                    </div>
                    <Select
                      v-else
                      :model-value="''"
                      @update:model-value="(value: string) => {
                        if (value) {
                          linkVariantToMaster(size, getColorName(color), value, getColorName(color));
                        }
                      }"
                    >
                      <SelectTrigger class="h-7 text-xs">
                        <SelectValue placeholder="Избери..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem
                          v-for="masterSize in getAvailableMasterVariants(size, getColorName(color))"
                          :key="masterSize"
                          :value="masterSize"
                        >
                          {{ masterSize }}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <!-- Reserved Badge -->
                  <div
                    v-if="getReserved(size, getColorName(color)) > 0"
                    class="text-xs text-center"
                  >
                    <Badge variant="secondary" class="text-[10px]">
                      Резервирани: {{ getReserved(size, getColorName(color)) }}
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
