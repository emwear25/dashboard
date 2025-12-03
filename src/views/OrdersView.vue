<template>
  <div class="orders-view">
    <div class="orders-view__header">
      <h1 class="orders-view__title">Поръчки</h1>
      <div class="orders-view__stats">
        <div class="stat-card">
          <div class="stat-card__value">{{ stats.totalOrders }}</div>
          <div class="stat-card__label">Общо поръчки</div>
        </div>
        <div class="stat-card">
          <div class="stat-card__value">{{ pendingCount }}</div>
          <div class="stat-card__label">Изчакващи</div>
        </div>
        <div class="stat-card">
          <div class="stat-card__value">{{ stats.totalRevenue?.toFixed(2) }} лв</div>
          <div class="stat-card__label">Общ приход</div>
        </div>
      </div>
    </div>

    <div class="orders-view__filters">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Търси по номер или клиент..."
        class="orders-view__search"
      />

      <select v-model="statusFilter" class="orders-view__select">
        <option value="">Всички статуси</option>
        <option value="pending">Изчакващи</option>
        <option value="confirmed">Потвърдени</option>
        <option value="processing">В обработка</option>
        <option value="shipped">Изпратени</option>
        <option value="delivered">Доставени</option>
        <option value="cancelled">Отказани</option>
      </select>

      <button @click="loadOrders" class="orders-view__refresh-btn">Обнови</button>
    </div>

    <div v-if="loading" class="orders-view__loading">Зареждане...</div>

    <div v-else-if="error" class="orders-view__error">
      {{ error }}
    </div>

    <div v-else class="orders-view__table-container">
      <table class="orders-table">
        <thead>
          <tr>
            <th>Номер</th>
            <th>Клиент</th>
            <th>Дата</th>
            <th>Сума</th>
            <th>Статус</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="order in orders" :key="order._id" class="orders-table__row">
            <td class="orders-table__order-number">
              {{ order.orderNumber }}
            </td>
            <td>
              <div class="orders-table__customer">
                <div class="orders-table__customer-name">
                  {{ order.shippingAddress.firstName }}
                  {{ order.shippingAddress.lastName }}
                  <span v-if="!order.user && order.guestEmail" class="guest-badge">👤 Guest</span>
                </div>
                <div class="orders-table__customer-email">
                  <span v-if="order.user">{{ order.shippingAddress.email }}</span>
                  <span v-else class="guest-email">{{
                    order.guestEmail || order.shippingAddress.email
                  }}</span>
                </div>
              </div>
            </td>
            <td>
              {{ formatDate(order.createdAt) }}
            </td>
            <td class="orders-table__total">{{ order.total?.toFixed(2) }} лв</td>
            <td>
              <span :class="['status-badge', `status-badge--${order.orderStatus}`]">
                {{ getStatusLabel(order.orderStatus) }}
              </span>
            </td>
            <td>
              <div class="orders-table__actions">
                <button
                  @click="viewOrder(order._id)"
                  class="orders-table__action-btn orders-table__action-btn--view"
                >
                  Виж
                </button>
                <select
                  @change="updateOrderStatus(order._id, $event)"
                  class="orders-table__status-select"
                  :value="order.orderStatus"
                >
                  <option value="pending">Изчакваща</option>
                  <option value="confirmed">Потвърдена</option>
                  <option value="processing">В обработка</option>
                  <option value="shipped">Изпратена</option>
                  <option value="delivered">Доставена</option>
                  <option value="cancelled">Отказана</option>
                </select>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="orders.length === 0" class="orders-view__empty">Няма намерени поръчки</div>

      <div v-if="pagination.pages > 1" class="orders-view__pagination">
        <button
          @click="changePage(pagination.page - 1)"
          :disabled="pagination.page === 1"
          class="orders-view__page-btn"
        >
          Предишна
        </button>
        <span class="orders-view__page-info">
          Страница {{ pagination.page }} от {{ pagination.pages }}
        </span>
        <button
          @click="changePage(pagination.page + 1)"
          :disabled="pagination.page === pagination.pages"
          class="orders-view__page-btn"
        >
          Следваща
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { apiGet, apiPatch } from "@/utils/api";

const router = useRouter();

// State
const orders = ref<any[]>([]);
const stats = ref<any>({ totalOrders: 0, totalRevenue: 0, byStatus: [] });
const loading = ref(true);
const error = ref("");
const searchQuery = ref("");
const statusFilter = ref("");
const pagination = ref({
  page: 1,
  limit: 20,
  total: 0,
  pages: 1,
});

// Computed
const pendingCount = computed(() => {
  const pending = stats.value.byStatus?.find((s: any) => s._id === "pending");
  return pending?.count || 0;
});

// Methods
const getToken = () => {
  // Try both 'token' and 'accessToken' keys
  const token = localStorage.getItem("token") || localStorage.getItem("accessToken");
  console.log("[Dashboard Orders] Token found:", !!token);
  return token;
};

const loadOrders = async () => {
  loading.value = true;
  error.value = "";

  try {
    const params = new URLSearchParams({
      page: pagination.value.page.toString(),
      limit: pagination.value.limit.toString(),
    });

    if (statusFilter.value) {
      params.append("status", statusFilter.value);
    }

    if (searchQuery.value) {
      params.append("search", searchQuery.value);
    }

    const data = await apiGet(`orders/admin/all?${params}`);

    if (data.success) {
      orders.value = data.data;
      pagination.value = data.pagination;
    } else {
      error.value = "Грешка при зареждане на поръчките";
    }
  } catch (err) {
    console.error("Failed to load orders:", err);
    error.value = "Грешка при зареждане на поръчките";
  } finally {
    loading.value = false;
  }
};

const loadStats = async () => {
  try {
    const data = await apiGet("orders/admin/stats");

    if (data.success) {
      stats.value = data.data;
    }
  } catch (err) {
    console.error("Failed to load stats:", err);
  }
};

const updateOrderStatus = async (orderId: string, event: Event) => {
  const select = event.target as HTMLSelectElement;
  const newStatus = select.value;

  try {
    const data = await apiPatch(`orders/admin/${orderId}/status`, {
      status: newStatus,
    });

    if (data.success) {
      // Reload orders to reflect the change
      await loadOrders();
      await loadStats();
    } else {
      alert("Грешка при обновяване на статуса");
      select.value = orders.value.find((o) => o._id === orderId)?.orderStatus || "";
    }
  } catch (err) {
    console.error("Failed to update status:", err);
    alert("Грешка при обновяване на статуса");
    select.value = orders.value.find((o) => o._id === orderId)?.orderStatus || "";
  }
};

const viewOrder = (orderId: string) => {
  router.push(`/orders/${orderId}`);
};

const changePage = (page: number) => {
  pagination.value.page = page;
  loadOrders();
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("bg-BG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    pending: "Изчакваща",
    confirmed: "Потвърдена",
    processing: "В обработка",
    shipped: "Изпратена",
    delivered: "Доставена",
    cancelled: "Отказана",
  };
  return labels[status] || status;
};

// Watchers
watch([searchQuery, statusFilter], () => {
  pagination.value.page = 1;
  loadOrders();
});

// Lifecycle
onMounted(() => {
  loadOrders();
  loadStats();
});
</script>

<style scoped lang="scss">
.orders-view {
  padding: 2rem;

  &__header {
    margin-bottom: 2rem;
  }

  &__title {
    font-size: 2rem;
    font-weight: 700;
    margin-bottom: 1.5rem;
  }

  &__stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }

  &__filters {
    display: flex;
    gap: 1rem;
    margin-bottom: 2rem;
    flex-wrap: wrap;
  }

  &__search {
    flex: 1;
    min-width: 250px;
    padding: 0.75rem 1rem;
    border: 1px solid #ddd;
    border-radius: 8px;
    font-size: 1rem;

    &:focus {
      outline: none;
      border-color: #3498db;
    }
  }

  &__select {
    padding: 0.75rem 1rem;
    border: 1px solid #ddd;
    border-radius: 8px;
    font-size: 1rem;
    background: white;
    cursor: pointer;

    &:focus {
      outline: none;
      border-color: #3498db;
    }
  }

  &__refresh-btn {
    padding: 0.75rem 1.5rem;
    background: #3498db;
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;

    &:hover {
      background: #2980b9;
    }
  }

  &__loading,
  &__error,
  &__empty {
    text-align: center;
    padding: 3rem;
    color: #666;
    font-size: 1.1rem;
  }

  &__error {
    color: #e74c3c;
  }

  &__table-container {
    background: white;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  &__pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1rem;
    padding: 1.5rem;
    border-top: 1px solid #eee;
  }

  &__page-btn {
    padding: 0.5rem 1rem;
    background: #3498db;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.2s;

    &:hover:not(:disabled) {
      background: #2980b9;
    }

    &:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
  }

  &__page-info {
    color: #666;
  }
}

.stat-card {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

  &__value {
    font-size: 2rem;
    font-weight: 700;
    color: #1a1a1a;
    margin-bottom: 0.5rem;
  }

  &__label {
    color: #666;
    font-size: 0.9rem;
  }
}

.orders-table {
  width: 100%;
  border-collapse: collapse;

  thead {
    background: #f8f9fa;

    th {
      padding: 1rem;
      text-align: left;
      font-weight: 600;
      color: #666;
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
  }

  tbody {
    tr {
      border-bottom: 1px solid #eee;
      transition: background 0.2s;

      &:hover {
        background: #f8f9fa;
      }
    }

    td {
      padding: 1rem;
    }
  }

  &__order-number {
    font-weight: 600;
    color: #3498db;
  }

  &__customer-name {
    font-weight: 600;
    margin-bottom: 0.25rem;
  }

  &__customer-email {
    font-size: 0.85rem;
    color: #666;
  }

  &__total {
    font-weight: 600;
  }

  &__actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  &__action-btn {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 6px;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;

    &--view {
      background: #3498db;
      color: white;

      &:hover {
        background: #2980b9;
      }
    }
  }

  &__status-select {
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 0.85rem;
    cursor: pointer;

    &:focus {
      outline: none;
      border-color: #3498db;
    }
  }
}

.guest-email {
  color: #856404;
  font-weight: 500;
}

.status-badge {
  display: inline-block;
  padding: 0.4rem 0.8rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;

  &--pending {
    background: #fff3cd;
    color: #856404;
  }

  &--confirmed {
    background: #d1ecf1;
    color: #0c5460;
  }

  &--processing {
    background: #cce5ff;
    color: #004085;
  }

  &--shipped {
    background: #d4edda;
    color: #155724;
  }

  &--delivered {
    background: #d4edda;
    color: #155724;
  }

  &--cancelled {
    background: #f8d7da;
    color: #721c24;
  }
}
</style>
