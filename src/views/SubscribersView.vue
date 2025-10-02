<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-3xl font-bold text-foreground">
          Newsletter Subscribers
        </h1>
        <p class="text-muted-foreground">Manage your newsletter subscribers</p>
      </div>
      <div class="flex gap-2">
        <Button @click="refreshSubscribers" variant="outline" size="sm">
          <RefreshCw :class="cn('mr-2 h-4 w-4', isLoading && 'animate-spin')" />
          Refresh
        </Button>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardHeader
          class="flex flex-row items-center justify-between space-y-0 pb-2"
        >
          <CardTitle class="text-sm font-medium">Total Subscribers</CardTitle>
          <Users class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">{{ stats.totalSubscribers }}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          class="flex flex-row items-center justify-between space-y-0 pb-2"
        >
          <CardTitle class="text-sm font-medium">Active</CardTitle>
          <UserCheck class="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">{{ stats.activeSubscribers }}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          class="flex flex-row items-center justify-between space-y-0 pb-2"
        >
          <CardTitle class="text-sm font-medium">Unsubscribed</CardTitle>
          <UserX class="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">{{ stats.unsubscribed }}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          class="flex flex-row items-center justify-between space-y-0 pb-2"
        >
          <CardTitle class="text-sm font-medium">Recent (30 days)</CardTitle>
          <TrendingUp class="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold">{{ stats.recentSubscribers }}</div>
        </CardContent>
      </Card>
    </div>

    <!-- Search and Filters -->
    <Card class="p-6">
      <div class="space-y-4">
        <!-- Search Bar -->
        <div class="relative">
          <Search
            class="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4"
          />
          <Input
            v-model="searchQuery"
            placeholder="Search by email or name..."
            class="pl-10"
            @input="debouncedSearch"
          />
        </div>

        <!-- Filters -->
        <div class="flex flex-wrap gap-4">
          <div class="flex items-center space-x-2">
            <label class="text-sm font-medium text-foreground">Status:</label>
            <Select
              v-model="activeFilter"
              @update:model-value="fetchSubscribers"
            >
              <SelectTrigger class="w-40">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Unsubscribed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            v-if="searchQuery || activeFilter !== 'all'"
            @click="clearFilters"
            variant="ghost"
            size="sm"
            class="text-muted-foreground"
          >
            <X class="h-4 w-4 mr-1" />
            Clear Filters
          </Button>
        </div>
      </div>
    </Card>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center p-8">
      <Loader2 class="h-8 w-8 animate-spin" />
      <span class="ml-2 text-muted-foreground">Loading subscribers...</span>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-center py-8">
      <div
        class="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded relative flex items-center justify-center gap-2"
      >
        <AlertTriangle class="h-4 w-4" />
        <span>{{ error }}</span>
      </div>
    </div>

    <!-- Subscribers Table -->
    <Card v-else>
      <CardHeader>
        <div class="flex items-center justify-between">
          <CardTitle>Subscribers ({{ pagination.totalCount }})</CardTitle>
          <div class="text-sm text-muted-foreground">
            Page {{ pagination.page }} of {{ pagination.totalPages }}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b">
                <th class="text-left p-4 font-medium text-muted-foreground">
                  Email
                </th>
                <th class="text-left p-4 font-medium text-muted-foreground">
                  Name
                </th>
                <th class="text-left p-4 font-medium text-muted-foreground">
                  Source
                </th>
                <th class="text-left p-4 font-medium text-muted-foreground">
                  Status
                </th>
                <th class="text-left p-4 font-medium text-muted-foreground">
                  Subscribed
                </th>
                <th class="text-left p-4 font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="subscriber in subscribers"
                :key="subscriber._id"
                class="border-b hover:bg-muted/50"
              >
                <td class="p-4">
                  <div class="flex items-center">
                    <Mail class="h-4 w-4 mr-2 text-muted-foreground" />
                    {{ subscriber.email }}
                  </div>
                </td>
                <td class="p-4">
                  {{ subscriber.firstName || "" }}
                  {{ subscriber.lastName || "" }}
                  <span
                    v-if="!subscriber.firstName && !subscriber.lastName"
                    class="text-muted-foreground"
                    >-</span
                  >
                </td>
                <td class="p-4">
                  <span
                    class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                    :class="{
                      'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300':
                        subscriber.source === 'registration',
                      'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300':
                        subscriber.source === 'landing_page',
                      'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-300':
                        subscriber.source === 'manual',
                    }"
                  >
                    {{ subscriber.source }}
                  </span>
                </td>
                <td class="p-4">
                  <span
                    v-if="subscriber.isActive"
                    class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300"
                  >
                    <div
                      class="w-1.5 h-1.5 bg-green-500 rounded-full mr-1"
                    ></div>
                    Active
                  </span>
                  <span
                    v-else
                    class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300"
                  >
                    <div class="w-1.5 h-1.5 bg-red-500 rounded-full mr-1"></div>
                    Unsubscribed
                  </span>
                </td>
                <td class="p-4 text-sm text-muted-foreground">
                  {{ formatDate(subscriber.subscribedAt) }}
                </td>
                <td class="p-4">
                  <Button
                    v-if="subscriber.isActive"
                    @click="unsubscribeUser(subscriber._id)"
                    variant="ghost"
                    size="sm"
                  >
                    <UserX class="h-4 w-4" />
                  </Button>
                  <Button
                    @click="deleteSubscriber(subscriber._id)"
                    variant="ghost"
                    size="sm"
                    class="text-red-600 hover:text-red-700"
                  >
                    <Trash2 class="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Empty State -->
          <div v-if="subscribers.length === 0" class="text-center py-12">
            <Users class="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p class="text-lg font-semibold text-foreground">
              No subscribers found
            </p>
            <p class="text-muted-foreground">
              {{
                searchQuery
                  ? "Try adjusting your search criteria."
                  : "Subscribers will appear here once users sign up for the newsletter."
              }}
            </p>
          </div>
        </div>

        <!-- Pagination -->
        <div
          v-if="pagination.totalPages > 1"
          class="flex justify-center items-center gap-2 mt-6"
        >
          <Button
            @click="goToPage(pagination.page - 1)"
            :disabled="pagination.page === 1"
            variant="outline"
            size="sm"
          >
            <ChevronLeft class="h-4 w-4" />
          </Button>
          <span class="text-sm text-muted-foreground">
            Page {{ pagination.page }} of {{ pagination.totalPages }}
          </span>
          <Button
            @click="goToPage(pagination.page + 1)"
            :disabled="pagination.page === pagination.totalPages"
            variant="outline"
            size="sm"
          >
            <ChevronRight class="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useApi } from "@/composables/useApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RefreshCw,
  Loader2,
  AlertTriangle,
  Users,
  UserCheck,
  UserX,
  TrendingUp,
  Search,
  X,
  Mail,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-vue-next";
import { cn } from "@/lib/utils";

// Types
interface Subscriber {
  _id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  source: "registration" | "manual" | "landing_page";
  isActive: boolean;
  subscribedAt: string;
  unsubscribedAt?: string;
}

interface Stats {
  totalSubscribers: number;
  activeSubscribers: number;
  unsubscribed: number;
  recentSubscribers: number;
}

// State
const subscribers = ref<Subscriber[]>([]);
const stats = ref<Stats>({
  totalSubscribers: 0,
  activeSubscribers: 0,
  unsubscribed: 0,
  recentSubscribers: 0,
});
const pagination = ref({
  page: 1,
  limit: 50,
  totalPages: 1,
  totalCount: 0,
});
const isLoading = ref(false);
const error = ref<string | null>(null);
const searchQuery = ref("");
const activeFilter = ref("all");

// API
const api = useApi();

// Methods
const fetchSubscribers = async () => {
  try {
    isLoading.value = true;
    error.value = null;

    const params = new URLSearchParams({
      page: pagination.value.page.toString(),
      limit: pagination.value.limit.toString(),
    });

    if (activeFilter.value !== "all") {
      params.append("isActive", activeFilter.value);
    }

    if (searchQuery.value) {
      params.append("search", searchQuery.value);
    }

    const data = await api.makeRequest(
      `/api/newsletter/subscribers?${params.toString()}`
    );

    subscribers.value = data.subscribers || [];
    pagination.value = data.pagination || pagination.value;
  } catch (err) {
    console.error("Failed to fetch subscribers:", err);
    error.value = "Failed to load subscribers. Please try again.";
  } finally {
    isLoading.value = false;
  }
};

const fetchStats = async () => {
  try {
    const data = await api.makeRequest("/api/newsletter/stats");
    stats.value = data;
  } catch (err) {
    console.error("Failed to fetch stats:", err);
  }
};

const refreshSubscribers = () => {
  fetchSubscribers();
  fetchStats();
};

const debouncedSearch = (() => {
  let timeout: ReturnType<typeof setTimeout>;
  return () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      pagination.value.page = 1;
      fetchSubscribers();
    }, 500);
  };
})();

const clearFilters = () => {
  searchQuery.value = "";
  activeFilter.value = "all";
  pagination.value.page = 1;
  fetchSubscribers();
};

const goToPage = (page: number) => {
  pagination.value.page = page;
  fetchSubscribers();
};

const unsubscribeUser = async (id: string) => {
  if (!confirm("Are you sure you want to unsubscribe this user?")) return;

  try {
    await api.makeRequest(`/api/newsletter/unsubscribe/${id}`, {
      method: "POST",
    });

    await refreshSubscribers();
  } catch (err) {
    console.error("Failed to unsubscribe user:", err);
    alert("Failed to unsubscribe user. Please try again.");
  }
};

const deleteSubscriber = async (id: string) => {
  if (
    !confirm(
      "Are you sure you want to delete this subscriber? This action cannot be undone."
    )
  )
    return;

  try {
    await api.makeRequest(`/api/newsletter/${id}`, {
      method: "DELETE",
    });

    await refreshSubscribers();
  } catch (err) {
    console.error("Failed to delete subscriber:", err);
    alert("Failed to delete subscriber. Please try again.");
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// Lifecycle
onMounted(() => {
  fetchSubscribers();
  fetchStats();
});
</script>
