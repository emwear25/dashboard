<template>
  <div class="reviews-management-view">
    <div class="reviews-management-view__header">
      <h1 class="reviews-management-view__title">Управление на Отзиви</h1>
      <div class="reviews-management-view__stats">
        <div class="stat-card">
          <div class="stat-card__value">{{ stats.total || 0 }}</div>
          <div class="stat-card__label">Общо</div>
        </div>
        <div class="stat-card stat-card--pending">
          <div class="stat-card__value">{{ stats.pending || 0 }}</div>
          <div class="stat-card__label">Изчакващи</div>
        </div>
        <div class="stat-card stat-card--approved">
          <div class="stat-card__value">{{ stats.approved || 0 }}</div>
          <div class="stat-card__label">Одобрени</div>
        </div>
        <div class="stat-card stat-card--rejected">
          <div class="stat-card__value">{{ stats.rejected || 0 }}</div>
          <div class="stat-card__label">Отхвърлени</div>
        </div>
      </div>
    </div>

    <div class="reviews-management-view__filters">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Търси по продукт, потребител, заглавие..."
        class="reviews-management-view__search"
        @input="debouncedLoadReviews"
      />

      <select v-model="statusFilter" class="reviews-management-view__select" @change="loadReviews">
        <option value="">Всички статуси</option>
        <option value="pending">Изчакващи</option>
        <option value="approved">Одобрени</option>
        <option value="rejected">Отхвърлени</option>
      </select>

      <select v-model="ratingFilter" class="reviews-management-view__select" @change="loadReviews">
        <option value="">Всички рейтинги</option>
        <option value="5">5 звезди</option>
        <option value="4">4 звезди</option>
        <option value="3">3 звезди</option>
        <option value="2">2 звезди</option>
        <option value="1">1 звезда</option>
      </select>

      <button @click="loadReviews" class="reviews-management-view__refresh-btn">Обнови</button>
    </div>

    <div v-if="loading" class="reviews-management-view__loading">Зареждане...</div>

    <div v-else-if="error" class="reviews-management-view__error">{{ error }}</div>

    <div v-else class="reviews-management-view__table-container">
      <table class="reviews-table">
        <thead>
          <tr>
            <th>Продукт</th>
            <th>Потребител</th>
            <th>Рейтинг</th>
            <th>Заглавие</th>
            <th>Отзив</th>
            <th>Дата</th>
            <th>Статус</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="review in reviews"
            :key="review._id"
            :class="[
              'reviews-table__row',
              {
                'reviews-table__row--pending': review.status === 'pending',
                'reviews-table__row--approved': review.status === 'approved',
                'reviews-table__row--rejected': review.status === 'rejected',
              },
            ]"
          >
            <td class="reviews-table__product">
              <div class="product-info">
                <span class="product-info__name">{{ getProductName(review.product) }}</span>
              </div>
            </td>
            <td class="reviews-table__user">
              <div class="user-info">
                <div class="user-info__avatar">
                  {{ getUserInitials(review.user, review.guestName) }}
                </div>
                <div class="user-info__details">
                  <div class="user-info__name">{{ getUserName(review.user, review.guestName) }}</div>
                  <div v-if="review.user?.email || review.guestEmail" class="user-info__email">
                    {{ review.user?.email || review.guestEmail }}
                  </div>
                </div>
              </div>
            </td>
            <td class="reviews-table__rating">
              <div class="rating-display">
                <span class="rating-display__stars">
                  <span
                    v-for="star in 5"
                    :key="star"
                    class="rating-display__star"
                    :class="{ 'rating-display__star--filled': star <= review.rating }"
                  >
                    ★
                  </span>
                </span>
                <span class="rating-display__value">{{ review.rating }}</span>
              </div>
            </td>
            <td class="reviews-table__title">
              <strong>{{ review.title }}</strong>
            </td>
            <td class="reviews-table__comment">
              <div class="comment-preview">{{ truncateText(review.comment, 80) }}</div>
            </td>
            <td class="reviews-table__date">{{ formatDate(review.createdAt) }}</td>
            <td class="reviews-table__status">
              <span
                :class="[
                  'status-badge',
                  `status-badge--${review.status}`,
                ]"
              >
                {{ getStatusLabel(review.status) }}
              </span>
              <span v-if="review.verifiedPurchase" class="status-badge status-badge--verified">
                Потвърдена покупка
              </span>
            </td>
            <td class="reviews-table__actions">
              <button @click="openReviewModal(review)" class="action-btn action-btn--view">
                Преглед
              </button>
              <button
                v-if="review.status === 'pending'"
                @click="updateStatus(review._id, 'approved')"
                class="action-btn action-btn--approve"
              >
                Одобри
              </button>
              <button
                v-if="review.status === 'pending'"
                @click="updateStatus(review._id, 'rejected')"
                class="action-btn action-btn--reject"
              >
                Отхвърли
              </button>
              <button @click="deleteReview(review._id)" class="action-btn action-btn--delete">
                Изтрий
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="reviews.length === 0" class="reviews-management-view__empty">
        Няма отзиви
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="pagination.pages > 1" class="reviews-management-view__pagination">
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

    <!-- Review Detail Modal -->
    <div v-if="selectedReview" class="modal-overlay" @click="closeReviewModal">
      <div class="modal-content modal-content--large" @click.stop>
        <div class="modal-header">
          <h2 class="modal-title">Детайли на Отзив</h2>
          <button @click="closeReviewModal" class="modal-close">×</button>
        </div>
        <div class="modal-body">
          <div class="review-detail">
            <div class="review-detail__section">
              <h3 class="review-detail__section-title">Информация за отзива</h3>
              <div class="review-detail__field">
                <label>Продукт:</label>
                <div>{{ getProductName(selectedReview.product) }}</div>
              </div>
              <div class="review-detail__field">
                <label>Потребител:</label>
                <div>{{ getUserName(selectedReview.user, selectedReview.guestName) }}</div>
                <div v-if="selectedReview.user?.email || selectedReview.guestEmail" class="text-muted">
                  {{ selectedReview.user?.email || selectedReview.guestEmail }}
                </div>
              </div>
              <div class="review-detail__field">
                <label>Рейтинг:</label>
                <div class="rating-display">
                  <span class="rating-display__stars">
                    <span
                      v-for="star in 5"
                      :key="star"
                      class="rating-display__star rating-display__star--large"
                      :class="{ 'rating-display__star--filled': star <= selectedReview.rating }"
                    >
                      ★
                    </span>
                  </span>
                  <span class="rating-display__value">{{ selectedReview.rating }}/5</span>
                </div>
              </div>
              <div class="review-detail__field">
                <label>Дата:</label>
                <div>{{ formatDate(selectedReview.createdAt) }}</div>
              </div>
              <div class="review-detail__field">
                <label>Статус:</label>
                <span
                  :class="[
                    'status-badge',
                    `status-badge--${selectedReview.status}`,
                  ]"
                >
                  {{ getStatusLabel(selectedReview.status) }}
                </span>
              </div>
            </div>

            <div class="review-detail__section">
              <h3 class="review-detail__section-title">Съдържание</h3>
              <div class="review-detail__field">
                <label>Заглавие:</label>
                <div class="review-detail__title">{{ selectedReview.title }}</div>
              </div>
              <div class="review-detail__field">
                <label>Отзив:</label>
                <div class="review-detail__comment">{{ selectedReview.comment }}</div>
              </div>
            </div>

            <div v-if="selectedReview.adminNotes" class="review-detail__section">
              <h3 class="review-detail__section-title">Администраторски бележки</h3>
              <div class="review-detail__notes">{{ selectedReview.adminNotes }}</div>
            </div>

            <div class="review-detail__section">
              <h3 class="review-detail__section-title">Добави бележка</h3>
              <textarea
                v-model="adminNotes"
                class="review-detail__notes-input"
                placeholder="Добави администраторски бележки..."
                rows="3"
              />
            </div>
          </div>

          <div class="review-detail__actions">
            <button
              v-if="selectedReview.status === 'pending'"
              @click="updateStatus(selectedReview._id, 'approved', true)"
              class="action-btn action-btn--approve"
            >
              Одобри
            </button>
            <button
              v-if="selectedReview.status === 'pending'"
              @click="updateStatus(selectedReview._id, 'rejected', true)"
              class="action-btn action-btn--reject"
            >
              Отхвърли
            </button>
            <button
              v-if="selectedReview.status !== 'pending'"
              @click="updateStatus(selectedReview._id, 'pending', true)"
              class="action-btn action-btn--pending"
            >
              Върни в изчакващи
            </button>
            <button
              @click="saveAdminNotes"
              class="action-btn action-btn--save"
              :disabled="!adminNotes || adminNotes === selectedReview.adminNotes"
            >
              Запази бележки
            </button>
            <button
              @click="deleteReview(selectedReview._id, true)"
              class="action-btn action-btn--delete"
            >
              Изтрий
            </button>
          </div>
        </div>
      </div>
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
import { ref, onMounted } from "vue";
import { apiGet, apiPatch, apiDelete } from "@/utils/api";

interface Review {
  _id: string;
  product: string | { _id: string; name: string };
  user?: {
    _id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  } | null;
  guestName?: string | null;
  guestEmail?: string | null;
  rating: number;
  title: string;
  comment: string;
  verifiedPurchase: boolean;
  status: "pending" | "approved" | "rejected";
  adminNotes?: string;
  createdAt: string;
}

interface Stats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

const reviews = ref<Review[]>([]);
const stats = ref<Stats>({
  total: 0,
  pending: 0,
  approved: 0,
  rejected: 0,
});
const loading = ref(false);
const error = ref("");
const searchQuery = ref("");
const statusFilter = ref("");
const ratingFilter = ref("");
const selectedReview = ref<Review | null>(null);
const adminNotes = ref("");
const pagination = ref({
  page: 1,
  limit: 20,
  total: 0,
  pages: 0,
});

const message = ref<{ type: "success" | "error"; text: string } | null>(null);

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

const showMessage = (type: "success" | "error", text: string) => {
  message.value = { type, text };
  setTimeout(() => {
    message.value = null;
  }, 3000);
};

const fetchStats = async () => {
  try {
    const response = await apiGet("reviews/admin/stats");
    if (response.success && response.data) {
      stats.value = response.data;
    }
  } catch (err: any) {
    console.error("Error fetching stats:", err);
  }
};

const loadReviews = async () => {
  loading.value = true;
  error.value = "";
  try {
    const skip = (pagination.value.page - 1) * pagination.value.limit;
    const params: Record<string, string> = {
      limit: pagination.value.limit.toString(),
      skip: skip.toString(),
      sortBy: "createdAt",
      sortOrder: "desc",
    };

    if (statusFilter.value) {
      params.status = statusFilter.value;
    }

    if (ratingFilter.value) {
      params.rating = ratingFilter.value;
    }

    if (searchQuery.value) {
      // Note: Search might need backend support
      params.search = searchQuery.value;
    }

    const queryString = new URLSearchParams(params).toString();
    const response = await apiGet(`reviews/admin/all?${queryString}`);

    if (response.success && response.data) {
      reviews.value = response.data.reviews || [];
      const paginationData = response.data.pagination || {};
      pagination.value = {
        page: pagination.value.page,
        limit: pagination.value.limit,
        total: paginationData.total || 0,
        pages: Math.ceil((paginationData.total || 0) / pagination.value.limit),
      };
    }
  } catch (err: any) {
    console.error("Error loading reviews:", err);
    error.value = err.message || "Грешка при зареждане на отзиви";
    showMessage("error", error.value);
  } finally {
    loading.value = false;
  }
};

const debouncedLoadReviews = () => {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(() => {
    pagination.value.page = 1;
    loadReviews();
  }, 500);
};

const changePage = (page: number) => {
  if (page < 1 || page > pagination.value.pages) return;
  pagination.value.page = page;
  loadReviews();
  window.scrollTo({ top: 0, behavior: "smooth" });
};

const updateStatus = async (reviewId: string, status: string, reloadAfter = false) => {
  try {
    const response = await apiPatch(`reviews/admin/${reviewId}/status`, {
      status,
      adminNotes: adminNotes.value || undefined,
    });

    if (response.success) {
      showMessage("success", `Отзивът е ${getStatusLabel(status)} успешно`);
      await fetchStats();
      if (reloadAfter) {
        closeReviewModal();
        await loadReviews();
      } else {
        await loadReviews();
      }
    }
  } catch (err: any) {
    showMessage("error", err.message || "Грешка при обновяване на статуса");
  }
};

const saveAdminNotes = async () => {
  if (!selectedReview.value) return;

  try {
    const response = await apiPatch(`reviews/admin/${selectedReview.value._id}/notes`, {
      adminNotes: adminNotes.value || null,
    });

    if (response.success) {
      showMessage("success", "Бележките са запазени успешно");
      selectedReview.value.adminNotes = adminNotes.value || undefined;
      // Reload reviews to update the list
      await loadReviews();
    }
  } catch (err: any) {
    showMessage("error", err.message || "Грешка при запазване на бележките");
  }
};

const deleteReview = async (reviewId: string, reloadAfter = false) => {
  if (!confirm("Сигурни ли сте, че искате да изтриете този отзив?")) return;

  try {
    const response = await apiDelete(`reviews/admin/${reviewId}`);

    if (response.success) {
      showMessage("success", "Отзивът е изтрит успешно");
      await fetchStats();
      if (reloadAfter) {
        closeReviewModal();
        await loadReviews();
      } else {
        await loadReviews();
      }
    }
  } catch (err: any) {
    showMessage("error", err.message || "Грешка при изтриване на отзива");
  }
};

const openReviewModal = (review: Review) => {
  selectedReview.value = review;
  adminNotes.value = review.adminNotes || "";
};

const closeReviewModal = () => {
  selectedReview.value = null;
  adminNotes.value = "";
};

const getProductName = (product: string | { _id: string; name: string } | undefined) => {
  if (!product) return "Неизвестен продукт";
  if (typeof product === "string") return "Зареждане...";
  return product.name || "Неизвестен продукт";
};

const getUserName = (user: any, guestName?: string | null) => {
  if (user && user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  if (user && user.firstName) {
    return user.firstName;
  }
  return guestName || "Гост";
};

const getUserInitials = (user: any, guestName?: string | null) => {
  const name = getUserName(user, guestName);
  const parts = name.split(" ");
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name[0]?.toUpperCase() || "?";
};

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    pending: "Изчакващ",
    approved: "Одобрен",
    rejected: "Отхвърлен",
  };
  return labels[status] || status;
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

const truncateText = (text: string, maxLength: number) => {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
};

onMounted(() => {
  fetchStats();
  loadReviews();
});
</script>

<style lang="scss" scoped>
.reviews-management-view {
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
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }

  &__filters {
    display: flex;
    gap: 1rem;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
    align-items: center;
  }

  &__search {
    flex: 1;
    min-width: 200px;
    padding: 0.75rem;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    font-size: 0.9375rem;
  }

  &__select {
    padding: 0.75rem;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    font-size: 0.9375rem;
    background: white;
    cursor: pointer;
  }

  &__refresh-btn {
    padding: 0.75rem 1.5rem;
    background: #2563eb;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.9375rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;

    &:hover {
      background: #1d4ed8;
    }
  }

  &__loading,
  &__error,
  &__empty {
    text-align: center;
    padding: 3rem;
    color: #6b7280;
  }

  &__error {
    color: #ef4444;
  }

  &__table-container {
    overflow-x: auto;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    background: white;
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
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  text-align: center;

  &__value {
    font-size: 2rem;
    font-weight: 700;
    color: #111827;
    margin-bottom: 0.5rem;
  }

  &__label {
    font-size: 0.875rem;
    color: #6b7280;
  }

  &--pending {
    border-color: #f59e0b;
    background: #fef3c7;
  }

  &--approved {
    border-color: #10b981;
    background: #d1fae5;
  }

  &--rejected {
    border-color: #ef4444;
    background: #fee2e2;
  }
}

.reviews-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;

  thead {
    background: #f9fafb;
  }

  th {
    padding: 1rem;
    text-align: left;
    font-weight: 600;
    color: #374151;
    border-bottom: 2px solid #e5e7eb;
  }

  td {
    padding: 1rem;
    border-bottom: 1px solid #e5e7eb;
    vertical-align: top;
  }

  &__row {
    transition: background 0.2s;

    &:hover {
      background: #f9fafb;
    }

    &--pending {
      background: #fef3c7;
    }

    &--approved {
      background: #d1fae5;
    }

    &--rejected {
      background: #fee2e2;
    }
  }
}

.product-info,
.user-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.user-info__avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #2563eb;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.875rem;
  flex-shrink: 0;
}

.user-info__name {
  font-weight: 500;
  color: #111827;
}

.user-info__email {
  font-size: 0.75rem;
  color: #6b7280;
}

.rating-display {
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &__stars {
    display: flex;
    gap: 2px;
  }

  &__star {
    font-size: 1rem;
    color: #d1d5db;

    &--filled {
      color: #f59e0b;
    }

    &--large {
      font-size: 1.5rem;
    }
  }

  &__value {
    font-weight: 600;
    color: #374151;
  }
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  margin-right: 0.5rem;

  &--pending {
    background: #fef3c7;
    color: #92400e;
  }

  &--approved {
    background: #d1fae5;
    color: #065f46;
  }

  &--rejected {
    background: #fee2e2;
    color: #991b1b;
  }

  &--verified {
    background: #dbeafe;
    color: #1e40af;
  }
}

.action-btn {
  padding: 0.5rem 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  margin-right: 0.5rem;
  margin-bottom: 0.5rem;

  &--view {
    background: white;
    color: #374151;

    &:hover {
      background: #f9fafb;
    }
  }

  &--approve {
    background: #10b981;
    color: white;
    border-color: #10b981;

    &:hover {
      background: #059669;
    }
  }

  &--reject {
    background: #ef4444;
    color: white;
    border-color: #ef4444;

    &:hover {
      background: #dc2626;
    }
  }

  &--pending {
    background: #f59e0b;
    color: white;
    border-color: #f59e0b;

    &:hover {
      background: #d97706;
    }
  }

  &--save {
    background: #2563eb;
    color: white;
    border-color: #2563eb;

    &:hover:not(:disabled) {
      background: #1d4ed8;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  &--delete {
    background: white;
    color: #ef4444;
    border-color: #ef4444;

    &:hover {
      background: #fee2e2;
    }
  }
}

.comment-preview {
  max-width: 300px;
  color: #6b7280;
  line-height: 1.5;
}

.pagination-btn {
  padding: 0.75rem 1.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: #f9fafb;
    border-color: #d1d5db;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.pagination-info {
  font-size: 0.875rem;
  color: #6b7280;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: white;
  border-radius: 8px;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;

  &--large {
    max-width: 900px;
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
}

.modal-close {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  font-size: 1.5rem;
  cursor: pointer;
  color: #6b7280;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background 0.2s;

  &:hover {
    background: #f3f4f6;
  }
}

.modal-body {
  padding: 1.5rem;
}

.review-detail {
  &__section {
    margin-bottom: 2rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid #e5e7eb;

    &:last-child {
      border-bottom: none;
    }
  }

  &__section-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: #111827;
    margin-bottom: 1rem;
  }

  &__field {
    margin-bottom: 1rem;

    label {
      display: block;
      font-weight: 600;
      color: #374151;
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
    }
  }

  &__title {
    font-size: 1.125rem;
    font-weight: 600;
    color: #111827;
    margin-top: 0.5rem;
  }

  &__comment {
    color: #374151;
    line-height: 1.6;
    white-space: pre-wrap;
    margin-top: 0.5rem;
  }

  &__notes {
    background: #f9fafb;
    padding: 1rem;
    border-radius: 6px;
    color: #374151;
    line-height: 1.6;
    white-space: pre-wrap;
  }

  &__notes-input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    font-family: inherit;
    font-size: 0.9375rem;
    resize: vertical;
  }

  &__actions {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    margin-top: 2rem;
    padding-top: 1.5rem;
    border-top: 1px solid #e5e7eb;
  }
}

.text-muted {
  color: #6b7280;
  font-size: 0.875rem;
}
</style>

