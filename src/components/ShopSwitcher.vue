<script setup lang="ts">
import { useRoute, useRouter } from "vue-router";
import { Check, ChevronsUpDown, Store } from "lucide-vue-next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useShopStore } from "@/stores/shopStore";
import type { ShopId } from "@/utils/shops";

defineProps<{ collapsed?: boolean }>();

const shopStore = useShopStore();
const route = useRoute();
const router = useRouter();

// Detail/edit pages point at a record of the previous shop - go to the list
const LIST_FOR_ROUTE: Record<string, string> = {
  "products-edit": "/products",
  "product-details": "/products",
  "order-detail": "/orders",
  "edit-discount": "/discounts",
  "articles-edit": "/articles",
};

const selectShop = async (id: ShopId) => {
  if (id === shopStore.current) return;
  const listPath = LIST_FOR_ROUTE[String(route.name)];
  shopStore.select(id);
  if (listPath) await router.push(listPath);
};
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <button
        type="button"
        :title="collapsed ? `Магазин: ${shopStore.shop.name}` : undefined"
        :aria-label="`Активен магазин: ${shopStore.shop.name}. Смяна на магазин`"
        class="flex w-full items-center gap-3 rounded-lg border border-border bg-background px-3 py-2 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        :class="collapsed ? 'justify-center px-2' : ''"
      >
        <span
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sm font-bold text-white"
          :style="{ backgroundColor: shopStore.shop.color }"
          aria-hidden="true"
        >
          {{ shopStore.shop.name.slice(0, 1).toUpperCase() }}
        </span>
        <span v-if="!collapsed" class="min-w-0 flex-1">
          <span class="block truncate text-sm font-semibold leading-tight">{{ shopStore.shop.name }}</span>
          <span class="block truncate text-xs text-muted-foreground">{{ shopStore.shop.tagline }}</span>
        </span>
        <ChevronsUpDown v-if="!collapsed" class="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" class="w-60">
      <DropdownMenuLabel class="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Store class="h-3.5 w-3.5" aria-hidden="true" />
        Магазин
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        v-for="item in shopStore.shops"
        :key="item.id"
        class="gap-3"
        @select="selectShop(item.id)"
      >
        <span
          class="flex h-6 w-6 items-center justify-center rounded text-xs font-bold text-white"
          :style="{ backgroundColor: item.color }"
          aria-hidden="true"
        >
          {{ item.name.slice(0, 1).toUpperCase() }}
        </span>
        <span class="flex-1">
          <span class="block text-sm font-medium">{{ item.name }}</span>
          <span class="block text-xs text-muted-foreground">{{ item.tagline }}</span>
        </span>
        <Check v-if="item.id === shopStore.current" class="h-4 w-4" aria-hidden="true" />
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
