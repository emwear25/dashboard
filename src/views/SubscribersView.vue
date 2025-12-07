<template>
  <div class="subscribers-view">
    <div class="subscribers-view__header">
      <h1 class="subscribers-view__title">Абонати за Бюлетин</h1>
      <div class="subscribers-view__stats">
        <div class="stat-card">
          <div class="stat-card__value">{{ stats.total }}</div>
          <div class="stat-card__label">Общо</div>
        </div>
        <div class="stat-card stat-card--active">
          <div class="stat-card__value">{{ stats.active }}</div>
          <div class="stat-card__label">Активни</div>
        </div>
        <div class="stat-card">
          <div class="stat-card__value">{{ stats.inactive }}</div>
          <div class="stat-card__label">Неактивни</div>
        </div>
      </div>
    </div>

    <div class="subscribers-view__filters">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Търси по имейл..."
        class="subscribers-view__search"
        @input="debouncedLoadSubscribers"
      />

      <select v-model="activeFilter" class="subscribers-view__select" @change="loadSubscribers">
        <option value="">Всички</option>
        <option value="true">Активни</option>
        <option value="false">Неактивни</option>
      </select>

      <button @click="loadSubscribers" class="subscribers-view__refresh-btn">Обнови</button>
    </div>

    <div v-if="loading" class="subscribers-view__loading">Зареждане...</div>

    <div v-else-if="error" class="subscribers-view__error">{{ error }}</div>

    <div v-else class="subscribers-view__table-container">
      <table class="subscribers-table">
        <thead>
          <tr>
            <th>Имейл</th>
            <th>Статус</th>
            <th>Дата на абониране</th>
            <th>Източник</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="subscriber in subscribers"
            :key="subscriber._id"
            :class="[
              'subscribers-table__row',
              { 'subscribers-table__row--inactive': !subscriber.isActive },
            ]"
          >
            <td class="subscribers-table__email">
              <a :href="`mailto:${subscriber.email}`" class="email-link">
                {{ subscriber.email }}
              </a>
            </td>
            <td class="subscribers-table__status">
              <span
                :class="[
                  'status-badge',
                  subscriber.isActive ? 'status-badge--active' : 'status-badge--inactive',
                ]"
              >
                {{ subscriber.isActive ? "Активен" : "Неактивен" }}
              </span>
            </td>
            <td class="subscribers-table__date">
              {{ formatDate(subscriber.subscribedAt) }}
            </td>
            <td class="subscribers-table__source">
              {{ getSourceLabel(subscriber.source) }}
            </td>
            <td class="subscribers-table__actions">
              <button
                @click="deleteSubscriber(subscriber._id)"
                class="action-btn action-btn--delete"
              >
                Изтрий
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="subscribers.length === 0" class="subscribers-view__empty">Няма абонати</div>
    </div>

    <!-- Pagination -->
    <div v-if="pagination.pages > 1" class="subscribers-view__pagination">
      <button
        @click="changePage(pagination.page - 1)"
        :disabled="pagination.page === 1"
        class="pagination-btn"
      >
        Назад
      </button>
      <span class="pagination-info">
        Страница {{ pagination.page }} от {{ pagination.pages }}
      </span>
      <button
        @click="changePage(pagination.page + 1)"
        :disabled="pagination.page >= pagination.pages"
        class="pagination-btn"
      >
        Напред
      </button>
    </div>

    <!-- Success/Error Message -->
    <div
      v-if="message"
      :class="[
        'fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg border p-4 shadow-lg transition-all',
        message.type === 'success'
          ? 'bg-green-50 border-green-200 text-green-900'
          : 'bg-red-50 border-red-200 text-red-900',
      ]"
    >
      <div class="font-semibold">
        <p>{{ message.type === "success" ? "Успешно!" : "Грешка" }}</p>
        <p class="text-sm font-normal">{{ message.text }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { apiGet, apiDelete } from "@/utils/api";

interface Subscriber {
  _id: string;
  email: string;
  isActive: boolean;
  subscribedAt: string;
  unsubscribedAt?: string | null;
  source: string;
  ipAddress?: string;
}

interface Stats {
  total: number;
  active: number;
  inactive: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const subscribers = ref<Subscriber[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const searchQuery = ref("");
const activeFilter = ref("");
const stats = ref<Stats>({
  total: 0,
  active: 0,
  inactive: 0,
});
const pagination = ref<Pagination>({
  page: 1,
  limit: 50,
  total: 0,
  pages: 0,
});
const message = ref<{ type: "success" | "error"; text: string } | null>(null);

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

const debouncedLoadSubscribers = () => {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(() => {
    pagination.value.page = 1;
    loadSubscribers();
  }, 500);
};

const loadSubscribers = async () => {
  loading.value = true;
  error.value = null;

  try {
    const params = new URLSearchParams({
      page: pagination.value.page.toString(),
      limit: pagination.value.limit.toString(),
    });

    if (activeFilter.value) {
      params.append("isActive", activeFilter.value);
    }

    if (searchQuery.value.trim()) {
      params.append("search", searchQuery.value.trim());
    }

    const response = await apiGet(`/subscriptions?${params.toString()}`);

    if (response && response.success) {
      subscribers.value = response.data || [];
      pagination.value = {
        page: response.pagination.page,
        limit: response.pagination.limit,
        total: response.pagination.total,
        pages: response.pagination.pages,
      };
      stats.value = response.stats || {
        total: 0,
        active: 0,
        inactive: 0,
      };
    } else {
      error.value = "Неуспешно зареждане на абонати";
    }
  } catch (err: any) {
    console.error("Load subscribers error:", err);
    error.value = err?.response?.data?.message || "Грешка при зареждане на абонати";
  } finally {
    loading.value = false;
  }
};

const deleteSubscriber = async (id: string) => {
  if (!confirm("Сигурни ли сте, че искате да изтриете този абонат?")) {
    return;
  }

  try {
    const response = await apiDelete(`/subscriptions/${id}`);

    if (response && response.success) {
      showMessage("success", "Абонатът е изтрит успешно");
      loadSubscribers();
    } else {
      showMessage("error", "Грешка при изтриване на абонат");
    }
  } catch (err: any) {
    console.error("Delete subscriber error:", err);
    showMessage("error", err?.response?.data?.message || "Грешка при изтриване на абонат");
  }
};

const changePage = (newPage: number) => {
  if (newPage >= 1 && newPage <= pagination.value.pages) {
    pagination.value.page = newPage;
    loadSubscribers();
  }
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("bg-BG", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getSourceLabel = (source: string) => {
  const labels: Record<string, string> = {
    newsletter: "Бюлетин",
    manual: "Ръчно",
    import: "Импорт",
  };
  return labels[source] || source;
};

const showMessage = (type: "success" | "error", text: string) => {
  message.value = { type, text };
  setTimeout(() => {
    message.value = null;
  }, 5000);
};

onMounted(() => {
  loadSubscribers();
});
</script>

<style scoped lang="scss">
.subscribers-view {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;

  &__header {
    margin-bottom: 2rem;
  }

  &__title {
    font-size: 2rem;
    font-weight: 700;
    margin-bottom: 1.5rem;
    color: var(--foreground);
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
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
  }

  &__search {
    flex: 1;
    min-width: 200px;
    padding: 0.5rem 1rem;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--background);
    color: var(--foreground);
  }

  &__select {
    padding: 0.5rem 1rem;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--background);
    color: var(--foreground);
  }

  &__refresh-btn {
    padding: 0.5rem 1rem;
    background: var(--primary);
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: opacity 0.2s;

    &:hover {
      opacity: 0.9;
    }
  }

  &__loading,
  &__error {
    text-align: center;
    padding: 2rem;
    color: var(--foreground);
  }

  &__error {
    color: red;
  }

  &__table-container {
    overflow-x: auto;
    border: 1px solid var(--border);
    border-radius: 8px;
  }

  &__empty {
    text-align: center;
    padding: 3rem;
    color: var(--muted-foreground);
  }

  &__pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1rem;
    margin-top: 2rem;
  }
}

.stat-card {
  padding: 1.5rem;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 8px;
  text-align: center;

  &__value {
    font-size: 2rem;
    font-weight: 700;
    color: var(--foreground);
    margin-bottom: 0.5rem;
  }

  &__label {
    font-size: 0.875rem;
    color: var(--muted-foreground);
  }

  &--active {
    border-color: var(--primary);
    background: var(--primary) / 0.1;
  }
}

.subscribers-table {
  width: 100%;
  border-collapse: collapse;
  background: var(--background);

  thead {
    background: var(--muted);
  }

  th {
    padding: 1rem;
    text-align: left;
    font-weight: 600;
    color: var(--foreground);
    border-bottom: 2px solid var(--border);
  }

  &__row {
    border-bottom: 1px solid var(--border);
    transition: background 0.2s;

    &:hover {
      background: var(--muted) / 0.5;
    }

    &--inactive {
      opacity: 0.7;
    }
  }

  td {
    padding: 1rem;
    color: var(--foreground);
  }

  &__email {
    .email-link {
      color: var(--primary);
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
    }
  }

  &__status {
    .status-badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.875rem;
      font-weight: 500;

      &--active {
        background: #10b981;
        color: white;
      }

      &--inactive {
        background: #6b7280;
        color: white;
      }
    }
  }

  &__actions {
    .action-btn {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.875rem;
      transition: opacity 0.2s;

      &--delete {
        background: #ef4444;
        color: white;

        &:hover {
          opacity: 0.9;
        }
      }
    }
  }
}

.pagination-btn {
  padding: 0.5rem 1rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--background);
  color: var(--foreground);
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: var(--muted);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.pagination-info {
  color: var(--muted-foreground);
}
</style>


