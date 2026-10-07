import { defineStore } from "pinia";
import { computed, ref } from "vue";
import {
  SHOPS,
  SHOP_IDS,
  SHOP_STORAGE_KEY,
  getCurrentShop,
  isShopId,
  saveCurrentShop,
  type ShopId,
} from "@/utils/shops";

/**
 * The storefront the admin is currently managing.
 * Switching shops re-scopes every subsequent API request (X-Store header).
 */
export const useShopStore = defineStore("shop", () => {
  const current = ref<ShopId>(getCurrentShop());

  const shop = computed(() => SHOPS[current.value]);
  const shops = computed(() => SHOP_IDS.map((id) => SHOPS[id]));

  const select = (id: ShopId) => {
    if (id === current.value) return;
    current.value = id;
    saveCurrentShop(id);
  };

  // Keep several open dashboard tabs on the same shop, so a tab never
  // silently writes into the shop another tab switched away from
  if (typeof window !== "undefined") {
    window.addEventListener("storage", (event) => {
      if (event.key === SHOP_STORAGE_KEY && isShopId(event.newValue)) {
        current.value = event.newValue;
      }
    });
  }

  return { current, shop, shops, select };
});
