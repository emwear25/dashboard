<template>
  <div class="articles-view">
    <!-- Header -->
    <div class="articles-view__header">
      <div class="articles-view__title-section">
        <h1>📝 Статии</h1>
        <p class="articles-view__subtitle">Управление на блог статии</p>
      </div>
      <button class="btn btn--primary" @click="$router.push('/articles/create')">
        <span class="btn__icon">+</span>
        Нова статия
      </button>
    </div>

    <!-- Stats Cards -->
    <div class="articles-view__stats">
      <div
        v-for="stat in statusStats"
        :key="stat.key"
        class="stat-card"
        :class="{ 'stat-card--active': currentStatus === stat.key }"
        @click="filterByStatus(stat.key)"
      >
        <span class="stat-card__icon">{{ stat.icon }}</span>
        <div class="stat-card__content">
          <span class="stat-card__count">{{ stat.count }}</span>
          <span class="stat-card__label">{{ stat.label }}</span>
        </div>
      </div>
    </div>

    <!-- Search -->
    <div class="articles-view__filters">
      <div class="search-box">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Търсене по заглавие..."
          @input="debouncedSearch"
        />
        <span class="search-box__icon">🔍</span>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="articles-view__loading">
      <div class="spinner"></div>
      <p>Зареждане на статии...</p>
    </div>

    <!-- Articles Table -->
    <div v-else-if="articles.length > 0" class="articles-view__table-wrapper">
      <table class="articles-table">
        <thead>
          <tr>
            <th>Изображение</th>
            <th>Заглавие</th>
            <th>Статус</th>
            <th>Прегледи</th>
            <th>Дата</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="article in articles" :key="article._id">
            <td class="articles-table__image-cell">
              <img
                v-if="article.featuredImage?.url"
                :src="article.featuredImage.url"
                :alt="article.title"
                class="articles-table__image"
              />
              <div v-else class="articles-table__no-image">📄</div>
            </td>
            <td class="articles-table__title-cell">
              <div class="article-info">
                <span class="article-info__title">{{ article.title }}</span>
                <span class="article-info__excerpt">{{ truncate(article.excerpt, 80) }}</span>
              </div>
            </td>
            <td>
              <span class="status-badge" :class="`status-badge--${article.status}`">
                {{ getStatusLabel(article.status) }}
              </span>
            </td>
            <td>{{ article.views || 0 }}</td>
            <td>{{ formatDate(article.publishedAt || article.createdAt) }}</td>
            <td class="articles-table__actions">
              <button
                class="btn btn--icon btn--ghost"
                title="Редактиране"
                @click="editArticle(article._id)"
              >
                ✏️
              </button>
              <button
                v-if="article.status === 'published'"
                class="btn btn--icon btn--ghost"
                title="Преглед"
                @click="viewArticle(article.slug)"
              >
                👁️
              </button>
              <button
                class="btn btn--icon btn--ghost btn--danger"
                title="Изтриване"
                @click="confirmDelete(article)"
              >
                🗑️
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Empty State -->
    <div v-else class="articles-view__empty">
      <span class="articles-view__empty-icon">📝</span>
      <h3>Няма намерени статии</h3>
      <p>Създайте първата си статия, за да привлечете повече посетители.</p>
      <button class="btn btn--primary" @click="$router.push('/articles/create')">
        Създай статия
      </button>
    </div>

    <!-- Pagination -->
    <div v-if="pagination.pages > 1" class="articles-view__pagination">
      <button
        class="btn btn--secondary"
        :disabled="pagination.page <= 1"
        @click="changePage(pagination.page - 1)"
      >
        ← Предишна
      </button>
      <span class="pagination-info">
        Страница {{ pagination.page }} от {{ pagination.pages }}
      </span>
      <button
        class="btn btn--secondary"
        :disabled="pagination.page >= pagination.pages"
        @click="changePage(pagination.page + 1)"
      >
        Следваща →
      </button>
    </div>

    <!-- Delete Modal -->
    <div v-if="showDeleteModal" class="modal-overlay" @click.self="showDeleteModal = false">
      <div class="modal">
        <h3>Изтриване на статия</h3>
        <p>Сигурни ли сте, че искате да изтриете "{{ articleToDelete?.title }}"?</p>
        <div class="modal__actions">
          <button class="btn btn--secondary" @click="showDeleteModal = false">Отказ</button>
          <button class="btn btn--danger" :disabled="deleting" @click="deleteArticle">
            {{ deleting ? "Изтриване..." : "Изтрий" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { apiGet, apiDelete } from "@/utils/api";

const router = useRouter();

interface Article {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  featuredImage?: { url: string };
  status: "draft" | "published" | "scheduled";
  views: number;
  publishedAt: string;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface Stats {
  all: number;
  draft: number;
  published: number;
  scheduled: number;
}

const articles = ref<Article[]>([]);
const loading = ref(true);
const searchQuery = ref("");
const currentStatus = ref("all");
const pagination = ref<Pagination>({ page: 1, limit: 20, total: 0, pages: 0 });
const stats = ref<Stats>({ all: 0, draft: 0, published: 0, scheduled: 0 });
const showDeleteModal = ref(false);
const articleToDelete = ref<Article | null>(null);
const deleting = ref(false);

const statusStats = computed(() => [
  { key: "all", label: "Всички", icon: "📋", count: stats.value.all },
  { key: "published", label: "Публикувани", icon: "✅", count: stats.value.published },
  { key: "draft", label: "Чернови", icon: "📝", count: stats.value.draft },
  { key: "scheduled", label: "Насрочени", icon: "⏰", count: stats.value.scheduled },
]);

const fetchArticles = async (page = 1) => {
  loading.value = true;
  try {
    const params = new URLSearchParams();
    params.append("page", String(page));
    params.append("limit", "20");
    if (currentStatus.value !== "all") {
      params.append("status", currentStatus.value);
    }
    if (searchQuery.value) {
      params.append("search", searchQuery.value);
    }

    const response = await apiGet(`articles/admin/list?${params.toString()}`);
    if (response.success) {
      articles.value = response.data.articles;
      pagination.value = response.data.pagination;
      stats.value = response.data.stats;
    }
  } catch (error) {
    console.error("Error fetching articles:", error);
  } finally {
    loading.value = false;
  }
};

const filterByStatus = (status: string) => {
  currentStatus.value = status;
  fetchArticles(1);
};

let searchTimeout: ReturnType<typeof setTimeout>;
const debouncedSearch = () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    fetchArticles(1);
  }, 300);
};

const changePage = (page: number) => {
  fetchArticles(page);
};

const editArticle = (id: string) => {
  router.push(`/articles/edit/${id}`);
};

const viewArticle = (slug: string) => {
  window.open(`${import.meta.env.VITE_CLIENT_URL || "http://localhost:3000"}/blog/${slug}`, "_blank");
};

const confirmDelete = (article: Article) => {
  articleToDelete.value = article;
  showDeleteModal.value = true;
};

const deleteArticle = async () => {
  if (!articleToDelete.value) return;
  deleting.value = true;
  try {
    const response = await apiDelete(`articles/admin/${articleToDelete.value._id}`);
    if (response.success) {
      showDeleteModal.value = false;
      articleToDelete.value = null;
      fetchArticles(pagination.value.page);
    }
  } catch (error) {
    console.error("Error deleting article:", error);
  } finally {
    deleting.value = false;
  }
};

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    draft: "Чернова",
    published: "Публикувана",
    scheduled: "Насрочена",
  };
  return labels[status] || status;
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString("bg-BG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const truncate = (text: string, length: number) => {
  return text.length > length ? text.substring(0, length) + "..." : text;
};

onMounted(() => {
  fetchArticles();
});
</script>

<style scoped lang="scss">
.articles-view {
  padding: 2rem;

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;

    h1 {
      margin: 0;
      font-size: 1.75rem;
    }
  }

  &__subtitle {
    margin: 0.25rem 0 0;
    color: #64748b;
    font-size: 0.875rem;
  }

  &__stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  &__filters {
    margin-bottom: 1.5rem;
  }

  &__loading,
  &__empty {
    text-align: center;
    padding: 4rem 2rem;
    color: #64748b;
  }

  &__empty-icon {
    font-size: 4rem;
    display: block;
    margin-bottom: 1rem;
  }

  &__table-wrapper {
    background: white;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  &__pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1rem;
    margin-top: 1.5rem;
  }
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.25rem;
  background: white;
  border-radius: 12px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

  &:hover {
    border-color: #e2e8f0;
  }

  &--active {
    border-color: #3b82f6;
    background: #eff6ff;
  }

  &__icon {
    font-size: 1.5rem;
  }

  &__count {
    font-size: 1.5rem;
    font-weight: 700;
    color: #1e293b;
  }

  &__label {
    font-size: 0.75rem;
    color: #64748b;
    display: block;
  }
}

.search-box {
  position: relative;
  max-width: 400px;

  input {
    width: 100%;
    padding: 0.75rem 1rem 0.75rem 2.5rem;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 0.875rem;

    &:focus {
      outline: none;
      border-color: #3b82f6;
    }
  }

  &__icon {
    position: absolute;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
  }
}

.articles-table {
  width: 100%;
  border-collapse: collapse;

  th,
  td {
    padding: 1rem;
    text-align: left;
    border-bottom: 1px solid #f1f5f9;
  }

  th {
    background: #f8fafc;
    font-weight: 600;
    font-size: 0.75rem;
    text-transform: uppercase;
    color: #64748b;
  }

  &__image-cell {
    width: 80px;
  }

  &__image {
    width: 60px;
    height: 40px;
    object-fit: cover;
    border-radius: 4px;
  }

  &__no-image {
    width: 60px;
    height: 40px;
    background: #f1f5f9;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
  }

  &__title-cell {
    max-width: 300px;
  }

  &__actions {
    display: flex;
    gap: 0.25rem;
  }
}

.article-info {
  &__title {
    display: block;
    font-weight: 600;
    color: #1e293b;
    margin-bottom: 0.25rem;
  }

  &__excerpt {
    font-size: 0.75rem;
    color: #64748b;
  }
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;

  &--draft {
    background: #fef3c7;
    color: #92400e;
  }

  &--published {
    background: #d1fae5;
    color: #065f46;
  }

  &--scheduled {
    background: #dbeafe;
    color: #1e40af;
  }
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &--primary {
    background: #3b82f6;
    color: white;

    &:hover {
      background: #2563eb;
    }
  }

  &--secondary {
    background: #f1f5f9;
    color: #475569;

    &:hover {
      background: #e2e8f0;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  &--danger {
    background: #ef4444;
    color: white;

    &:hover {
      background: #dc2626;
    }
  }

  &--icon {
    padding: 0.5rem;
  }

  &--ghost {
    background: transparent;

    &:hover {
      background: #f1f5f9;
    }
  }

  &__icon {
    font-size: 1rem;
  }
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  max-width: 400px;
  width: 90%;

  h3 {
    margin: 0 0 1rem;
  }

  p {
    color: #64748b;
    margin-bottom: 1.5rem;
  }

  &__actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
  }
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e2e8f0;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.pagination-info {
  color: #64748b;
  font-size: 0.875rem;
}
</style>
