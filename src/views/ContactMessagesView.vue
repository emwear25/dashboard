<template>
  <div class="contact-messages-view">
    <div class="contact-messages-view__header">
      <h1 class="contact-messages-view__title">Контактни Съобщения</h1>
      <div class="contact-messages-view__stats">
        <div class="stat-card">
          <div class="stat-card__value">{{ stats.total }}</div>
          <div class="stat-card__label">Общо</div>
        </div>
        <div class="stat-card stat-card--unread">
          <div class="stat-card__value">{{ stats.unread }}</div>
          <div class="stat-card__label">Непрочетени</div>
        </div>
        <div class="stat-card">
          <div class="stat-card__value">{{ stats.recent }}</div>
          <div class="stat-card__label">Последни 30 дни</div>
        </div>
      </div>
    </div>

    <div class="contact-messages-view__filters">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Търси по име, имейл или съобщение..."
        class="contact-messages-view__search"
        @input="debouncedLoadMessages"
      />

      <select v-model="readFilter" class="contact-messages-view__select" @change="loadMessages">
        <option value="">Всички</option>
        <option value="false">Непрочетени</option>
        <option value="true">Прочетени</option>
      </select>

      <button @click="loadMessages" class="contact-messages-view__refresh-btn">Обнови</button>
    </div>

    <div v-if="loading" class="contact-messages-view__loading">Зареждане...</div>

    <div v-else-if="error" class="contact-messages-view__error">
      {{ error }}
    </div>

    <div v-else class="contact-messages-view__table-container">
      <table class="contact-messages-table">
        <thead>
          <tr>
            <th>Име</th>
            <th>Имейл</th>
            <th>Телефон</th>
            <th>Съобщение</th>
            <th>Дата</th>
            <th>Статус</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="message in messages"
            :key="message._id"
            :class="[
              'contact-messages-table__row',
              { 'contact-messages-table__row--unread': !message.isRead },
            ]"
          >
            <td class="contact-messages-table__name">
              <strong>{{ message.name }}</strong>
            </td>
            <td class="contact-messages-table__email">
              <a :href="`mailto:${message.email}`" class="email-link">
                {{ message.email }}
              </a>
            </td>
            <td class="contact-messages-table__phone">
              <a v-if="message.phone" :href="`tel:${message.phone}`" class="phone-link">
                {{ message.phone }}
              </a>
              <span v-else class="text-muted">-</span>
            </td>
            <td class="contact-messages-table__message">
              <div class="message-preview">
                {{ truncateMessage(message.message, 100) }}
              </div>
            </td>
            <td class="contact-messages-table__date">
              {{ formatDate(message.createdAt) }}
            </td>
            <td class="contact-messages-table__status">
              <span
                :class="[
                  'status-badge',
                  message.isRead ? 'status-badge--read' : 'status-badge--unread',
                ]"
              >
                {{ message.isRead ? "Прочетено" : "Непрочетено" }}
              </span>
              <span v-if="message.repliedAt" class="status-badge status-badge--replied">
                Отговорено
              </span>
            </td>
            <td class="contact-messages-table__actions">
              <button @click="openMessageModal(message)" class="action-btn action-btn--view">
                Преглед
              </button>
              <button
                v-if="!message.isRead"
                @click="markAsRead(message._id)"
                class="action-btn action-btn--read"
              >
                Отбележи като прочетено
              </button>
              <button
                v-else
                @click="markAsUnread(message._id)"
                class="action-btn action-btn--unread"
              >
                Отбележи като непрочетено
              </button>
              <button @click="deleteMessage(message._id)" class="action-btn action-btn--delete">
                Изтрий
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="messages.length === 0" class="contact-messages-view__empty">
        Няма контактни съобщения
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="pagination.pages > 1" class="contact-messages-view__pagination">
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

    <!-- Message Detail Modal -->
    <div v-if="selectedMessage" class="modal-overlay" @click="closeMessageModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2 class="modal-title">Детайли на Съобщението</h2>
          <button @click="closeMessageModal" class="modal-close">×</button>
        </div>
        <div class="modal-body">
          <div class="message-detail">
            <div class="message-detail__field">
              <label>Име:</label>
              <div>{{ selectedMessage.name }}</div>
            </div>
            <div class="message-detail__field">
              <label>Имейл:</label>
              <div>
                <a :href="`mailto:${selectedMessage.email}`" class="email-link">
                  {{ selectedMessage.email }}
                </a>
              </div>
            </div>
            <div class="message-detail__field" v-if="selectedMessage.phone">
              <label>Телефон:</label>
              <div>
                <a :href="`tel:${selectedMessage.phone}`" class="phone-link">
                  {{ selectedMessage.phone }}
                </a>
              </div>
            </div>
            <div class="message-detail__field">
              <label>Дата:</label>
              <div>{{ formatDate(selectedMessage.createdAt) }}</div>
            </div>
            <div class="message-detail__field">
              <label>Съобщение:</label>
              <div class="message-detail__message">{{ selectedMessage.message }}</div>
            </div>
            <div class="message-detail__field" v-if="selectedMessage.adminNotes">
              <label>Администраторски бележки:</label>
              <div class="message-detail__notes">
                {{ selectedMessage.adminNotes }}
              </div>
            </div>
          </div>
          <div class="message-detail__actions">
            <button
              v-if="!selectedMessage.isRead"
              @click="markAsRead(selectedMessage._id, true)"
              class="action-btn action-btn--read"
            >
              Отбележи като прочетено
            </button>
            <button
              v-else
              @click="markAsUnread(selectedMessage._id, true)"
              class="action-btn action-btn--unread"
            >
              Отбележи като непрочетено
            </button>
            <button
              v-if="!selectedMessage.repliedAt"
              @click="markAsReplied(selectedMessage._id)"
              class="action-btn action-btn--reply"
            >
              Отбележи като отговорено
            </button>
            <button
              @click="deleteMessage(selectedMessage._id, true)"
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

interface ContactMessage {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
  isRead: boolean;
  readAt?: string;
  repliedAt?: string;
  adminNotes?: string;
  createdAt: string;
}

interface Stats {
  total: number;
  unread: number;
  read: number;
  replied: number;
  recent: number;
}

const messages = ref<ContactMessage[]>([]);
const stats = ref<Stats>({
  total: 0,
  unread: 0,
  read: 0,
  replied: 0,
  recent: 0,
});
const loading = ref(false);
const error = ref("");
const searchQuery = ref("");
const readFilter = ref("");
const selectedMessage = ref<ContactMessage | null>(null);
const pagination = ref({
  page: 1,
  limit: 20,
  total: 0,
  pages: 0,
});

const message = ref<{ type: "success" | "error"; text: string } | null>(null);

const showMessage = (type: "success" | "error", text: string) => {
  message.value = { type, text };
  setTimeout(() => {
    message.value = null;
  }, 5000);
};

let searchTimeout: ReturnType<typeof setTimeout> | null = null;

const debouncedLoadMessages = () => {
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }
  searchTimeout = setTimeout(() => {
    pagination.value.page = 1;
    loadMessages();
  }, 500);
};

const loadMessages = async () => {
  loading.value = true;
  error.value = "";

  try {
    const params: Record<string, string> = {
      page: pagination.value.page.toString(),
      limit: pagination.value.limit.toString(),
    };

    if (readFilter.value) {
      params.isRead = readFilter.value;
    }

    if (searchQuery.value.trim()) {
      params.search = searchQuery.value.trim();
    }

    const queryString = new URLSearchParams(params).toString();
    const response = await apiGet(`/contact/admin?${queryString}`);

    if (response.success) {
      messages.value = response.data;
      pagination.value = response.pagination;
    } else {
      error.value = "Неуспешно зареждане на съобщения";
    }
  } catch (err: any) {
    error.value = err.message || "Грешка при зареждане на съобщения";
    console.error("Load messages error:", err);
  } finally {
    loading.value = false;
  }
};

const loadStats = async () => {
  try {
    const response = await apiGet("/contact/admin/stats");
    if (response.success) {
      stats.value = response.data;
    }
  } catch (err) {
    console.error("Load stats error:", err);
  }
};

const markAsRead = async (id: string, reload = false) => {
  try {
    const response = await apiPatch(`/contact/admin/${id}/read`);
    if (response.success) {
      showMessage("success", "Съобщението е отбелязано като прочетено");
      if (reload) {
        loadMessages();
        loadStats();
      } else {
        const message = messages.value.find((m) => m._id === id);
        if (message) {
          message.isRead = true;
          message.readAt = new Date().toISOString();
        }
        loadStats();
      }
    }
  } catch (err: any) {
    showMessage("error", err.message || "Грешка при отбелязване като прочетено");
  }
};

const markAsUnread = async (id: string, reload = false) => {
  try {
    const response = await apiPatch(`/contact/admin/${id}/unread`);
    if (response.success) {
      showMessage("success", "Съобщението е отбелязано като непрочетено");
      if (reload) {
        loadMessages();
        loadStats();
      } else {
        const message = messages.value.find((m) => m._id === id);
        if (message) {
          message.isRead = false;
          message.readAt = undefined;
        }
        loadStats();
      }
    }
  } catch (err: any) {
    showMessage("error", err.message || "Грешка при отбелязване като непрочетено");
  }
};

const markAsReplied = async (id: string) => {
  try {
    const response = await apiPatch(`/contact/admin/${id}/replied`);
    if (response.success) {
      showMessage("success", "Съобщението е отбелязано като отговорено");
      loadMessages();
      loadStats();
      if (selectedMessage.value?._id === id) {
        selectedMessage.value.repliedAt = new Date().toISOString();
      }
    }
  } catch (err: any) {
    showMessage("error", err.message || "Грешка при отбелязване като отговорено");
  }
};

const deleteMessage = async (id: string, closeModal = false) => {
  if (!confirm("Сигурни ли сте, че искате да изтриете това съобщение?")) {
    return;
  }

  try {
    const response = await apiDelete(`/contact/admin/${id}`);
    if (response.success) {
      showMessage("success", "Съобщението е изтрито");
      if (closeModal) {
        closeMessageModal();
      }
      loadMessages();
      loadStats();
    }
  } catch (err: any) {
    showMessage("error", err.message || "Грешка при изтриване на съобщение");
  }
};

const openMessageModal = async (message: ContactMessage) => {
  try {
    const response = await apiGet(`/contact/admin/${message._id}`);
    if (response.success) {
      selectedMessage.value = response.data;
      // Mark as read when viewing
      if (!message.isRead) {
        await markAsRead(message._id);
      }
    }
  } catch (err: any) {
    showMessage("error", err.message || "Грешка при зареждане на детайли");
  }
};

const closeMessageModal = () => {
  selectedMessage.value = null;
};

const changePage = (page: number) => {
  pagination.value.page = page;
  loadMessages();
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

const truncateMessage = (message: string, maxLength: number) => {
  if (message.length <= maxLength) return message;
  return message.substring(0, maxLength) + "...";
};

onMounted(() => {
  loadMessages();
  loadStats();
});
</script>

<style scoped lang="scss">
.contact-messages-view {
  &__header {
    margin-bottom: 2rem;
  }

  &__title {
    font-size: 2rem;
    font-weight: 700;
    margin-bottom: 1.5rem;
    color: hsl(var(--foreground));
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
    min-width: 250px;
    padding: 0.75rem 1rem;
    border: 1px solid hsl(var(--border));
    border-radius: 0.5rem;
    font-size: 0.875rem;
    background: hsl(var(--background));
    color: hsl(var(--foreground));

    &:focus {
      outline: none;
      border-color: hsl(var(--ring));
    }
  }

  &__select {
    padding: 0.75rem 1rem;
    border: 1px solid hsl(var(--border));
    border-radius: 0.5rem;
    font-size: 0.875rem;
    background: hsl(var(--background));
    color: hsl(var(--foreground));
    cursor: pointer;
  }

  &__refresh-btn {
    padding: 0.75rem 1.5rem;
    background: hsl(var(--primary));
    color: hsl(var(--primary-foreground));
    border: none;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
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
    color: hsl(var(--muted-foreground));
  }

  &__error {
    color: hsl(var(--destructive));
  }

  &__table-container {
    overflow-x: auto;
    border: 1px solid hsl(var(--border));
    border-radius: 0.5rem;
    background: hsl(var(--card));
  }

  &__empty {
    text-align: center;
    padding: 3rem;
    color: hsl(var(--muted-foreground));
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
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 0.5rem;

  &--unread {
    border-color: hsl(var(--primary));
    background: hsl(var(--primary) / 0.1);
  }

  &__value {
    font-size: 2rem;
    font-weight: 700;
    color: hsl(var(--foreground));
  }

  &__label {
    font-size: 0.875rem;
    color: hsl(var(--muted-foreground));
    margin-top: 0.5rem;
  }
}

.contact-messages-table {
  width: 100%;
  border-collapse: collapse;

  thead {
    background: hsl(var(--muted) / 0.5);
  }

  th {
    padding: 1rem;
    text-align: left;
    font-weight: 600;
    font-size: 0.875rem;
    color: hsl(var(--muted-foreground));
    border-bottom: 1px solid hsl(var(--border));
  }

  &__row {
    border-bottom: 1px solid hsl(var(--border));
    transition: background 0.2s;

    &:hover {
      background: hsl(var(--muted) / 0.3);
    }

    &--unread {
      background: hsl(var(--primary) / 0.05);
      font-weight: 500;
    }
  }

  td {
    padding: 1rem;
    font-size: 0.875rem;
    color: hsl(var(--foreground));
  }

  &__name {
    font-weight: 600;
  }

  &__email,
  &__phone {
    a {
      color: hsl(var(--primary));
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
    }
  }

  &__message {
    max-width: 300px;
  }

  &__actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
}

.message-preview {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 500;
  margin-right: 0.5rem;

  &--unread {
    background: hsl(var(--primary));
    color: hsl(var(--primary-foreground));
  }

  &--read {
    background: hsl(var(--muted));
    color: hsl(var(--muted-foreground));
  }

  &--replied {
    background: hsl(var(--success));
    color: hsl(var(--success-foreground));
  }
}

.action-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.8;
  }

  &--view {
    background: hsl(var(--primary));
    color: hsl(var(--primary-foreground));
  }

  &--read,
  &--unread {
    background: hsl(var(--secondary));
    color: hsl(var(--secondary-foreground));
  }

  &--delete {
    background: hsl(var(--destructive));
    color: hsl(var(--destructive-foreground));
  }

  &--reply {
    background: hsl(var(--success));
    color: hsl(var(--success-foreground));
  }
}

.pagination-btn {
  padding: 0.5rem 1rem;
  border: 1px solid hsl(var(--border));
  border-radius: 0.375rem;
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  cursor: pointer;
  transition: background 0.2s;

  &:hover:not(:disabled) {
    background: hsl(var(--muted));
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.pagination-info {
  color: hsl(var(--muted-foreground));
  font-size: 0.875rem;
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
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 0.5rem;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid hsl(var(--border));
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: hsl(var(--foreground));
}

.modal-close {
  background: none;
  border: none;
  font-size: 2rem;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  padding: 0;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: hsl(var(--foreground));
  }
}

.modal-body {
  padding: 1.5rem;
}

.message-detail {
  &__field {
    margin-bottom: 1.5rem;

    label {
      display: block;
      font-weight: 600;
      font-size: 0.875rem;
      color: hsl(var(--muted-foreground));
      margin-bottom: 0.5rem;
    }

    div {
      color: hsl(var(--foreground));
    }
  }

  &__message {
    white-space: pre-wrap;
    padding: 1rem;
    background: hsl(var(--muted) / 0.3);
    border-radius: 0.375rem;
    line-height: 1.6;
  }

  &__notes {
    padding: 1rem;
    background: hsl(var(--warning) / 0.1);
    border-radius: 0.375rem;
    border-left: 3px solid hsl(var(--warning));
  }

  &__actions {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    margin-top: 2rem;
    padding-top: 1.5rem;
    border-top: 1px solid hsl(var(--border));
  }
}

.email-link,
.phone-link {
  color: hsl(var(--primary));
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}
</style>
