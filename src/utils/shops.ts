/**
 * Storefronts managed by this dashboard.
 *
 * Every API request carries the selected shop in the `X-Store` header and the
 * server scopes all data (products, orders, customers, ...) to that shop.
 * Keep the ids in sync with server/config/stores.js.
 */
export type ShopId = "emwear" | "imagoo";

export interface ShopMeta {
  id: ShopId;
  name: string;
  tagline: string;
  /** Accent colour used to make the active shop obvious in the UI */
  color: string;
  /** Public storefront URL (previews, "view on site" links) */
  siteUrl: string;
  /** Storefront path for an article preview */
  articlePath: (slug: string) => string | null;
}

export const SHOPS: Record<ShopId, ShopMeta> = {
  emwear: {
    id: "emwear",
    name: "emWear",
    tagline: "Бродирани изделия",
    color: "#2F3A2A",
    siteUrl: import.meta.env.VITE_EMWEAR_SITE_URL || import.meta.env.VITE_CLIENT_URL || "http://localhost:3000",
    articlePath: (slug) => `/blog/${slug}`,
  },
  imagoo: {
    id: "imagoo",
    name: "Imagoo",
    tagline: "3D принтирани продукти",
    color: "#3b176f",
    siteUrl: import.meta.env.VITE_IMAGOO_SITE_URL || "http://localhost:3001",
    // The Imagoo storefront has no blog yet
    articlePath: () => null,
  },
};

export const SHOP_IDS = Object.keys(SHOPS) as ShopId[];
export const DEFAULT_SHOP: ShopId = "emwear";

const STORAGE_KEY = "admin_shop";

const isShopId = (value: unknown): value is ShopId =>
  typeof value === "string" && (SHOP_IDS as string[]).includes(value);

/** The shop selected in this browser (read synchronously by the API helpers). */
export const getCurrentShop = (): ShopId => {
  try {
    const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    return isShopId(stored) ? stored : DEFAULT_SHOP;
  } catch {
    return DEFAULT_SHOP;
  }
};

export const saveCurrentShop = (id: ShopId): void => {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Storage unavailable (private mode) - selection lasts for this page only
  }
};

export { isShopId, STORAGE_KEY as SHOP_STORAGE_KEY };
