import { createRouter, createWebHistory } from "vue-router";
import DashboardLayout from "@/layouts/DashboardLayout.vue";
import DashboardView from "@/views/DashboardView.vue";
import ProductsView from "@/views/ProductsView.vue";
import AddProductView from "@/views/AddProductView.vue";
import ProductDetailsView from "@/views/ProductDetailsView.vue";
import StockManagementView from "@/views/StockManagementView.vue";
import CategoriesManagementView from "@/views/CategoriesManagementView.vue";
import ExternalOrdersView from "@/views/ExternalOrdersView.vue";
import OrdersView from "@/views/OrdersView.vue";
import DiscountsView from "@/views/DiscountsView.vue";
import CouponsView from "@/views/CouponsView.vue";
import DiscountAnalyticsView from "@/views/DiscountAnalyticsView.vue";
import CreateDiscountView from "@/views/CreateDiscountView.vue";
import CreateCouponView from "@/views/CreateCouponView.vue";
import ContactMessagesView from "@/views/ContactMessagesView.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      redirect: "/dashboard",
    },
    {
      path: "/",
      component: DashboardLayout,
      children: [
        {
          path: "dashboard",
          name: "dashboard",
          component: DashboardView,
        },
        {
          path: "products",
          name: "products",
          component: ProductsView,
        },
        {
          path: "products/add",
          name: "products-add",
          component: AddProductView,
        },
        {
          path: "products/edit/:id",
          name: "products-edit",
          component: AddProductView,
        },
        {
          path: "products/:id",
          name: "product-details",
          component: ProductDetailsView,
        },
        {
          path: "stock",
          name: "stock-management",
          component: StockManagementView,
        },
        {
          path: "categories",
          name: "categories-management",
          component: CategoriesManagementView,
        },
        {
          path: "external-orders",
          name: "external-orders",
          component: ExternalOrdersView,
        },
        {
          path: "orders",
          name: "orders",
          component: OrdersView,
        },
        {
          path: "orders/:id",
          name: "order-detail",
          component: () => import("@/views/OrderDetailView.vue"),
        },
        {
          path: "discounts",
          name: "discounts",
          component: DiscountsView,
        },
        {
          path: "discounts/create",
          name: "create-discount",
          component: CreateDiscountView,
        },
        {
          path: "discounts/edit/:id",
          name: "edit-discount",
          component: CreateDiscountView,
        },
        {
          path: "coupons",
          name: "coupons",
          component: CouponsView,
        },
        {
          path: "coupons/create",
          name: "create-coupon",
          component: CreateCouponView,
        },
        {
          path: "discount-analytics",
          name: "discount-analytics",
          component: DiscountAnalyticsView,
        },
        {
          path: "contact-messages",
          name: "contact-messages",
          component: ContactMessagesView,
        },
      ],
    },
    {
      path: "/:pathMatch(.*)*",
      redirect: "/dashboard",
    },
  ],
});

export default router;