import { createRouter, createWebHistory } from "vue-router";
import DashboardLayout from "@/layouts/DashboardLayout.vue";
import LoginView from "@/views/LoginView.vue";
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
import CreateDiscountView from "@/views/CreateDiscountView.vue";
import CreateCouponView from "@/views/CreateCouponView.vue";
import ContactMessagesView from "@/views/ContactMessagesView.vue";
import ReviewsManagementView from "@/views/ReviewsManagementView.vue";
import SubscribersView from "@/views/SubscribersView.vue";
import { useAuthStore } from "@/stores/authStore";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/login",
      name: "login",
      component: LoginView,
      meta: { requiresAuth: false },
    },
    {
      path: "/",
      redirect: "/dashboard",
    },
    {
      path: "/",
      component: DashboardLayout,
      meta: { requiresAuth: true },
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
          path: "contact-messages",
          name: "contact-messages",
          component: ContactMessagesView,
        },
        {
          path: "reviews",
          name: "reviews",
          component: ReviewsManagementView,
        },
        {
          path: "subscribers",
          name: "subscribers",
          component: SubscribersView,
        },
      ],
    },
    {
      path: "/:pathMatch(.*)*",
      redirect: "/dashboard",
    },
  ],
});

// Route guard - protect dashboard routes
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();

  // If route requires auth
  if (to.meta.requiresAuth !== false) {
    // Check if we have a token
    if (!authStore.token) {
      // No token, redirect to login
      next({ name: "login", query: { redirect: to.fullPath } });
      return;
    }

    // Verify token is still valid
    const isValid = await authStore.verifyToken();
    if (!isValid) {
      // Token invalid, redirect to login
      next({ name: "login", query: { redirect: to.fullPath } });
      return;
    }
  } else {
    // Login page - if already authenticated, redirect to dashboard
    if (authStore.isAuthenticated) {
      const redirect = (to.query.redirect as string) || "/dashboard";
      next(redirect);
      return;
    }
  }

  next();
});

// Initialize auth store on app start
router.beforeResolve(async () => {
  const authStore = useAuthStore();
  await authStore.init();
});

export default router;
