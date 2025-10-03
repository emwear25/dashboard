<template>
  <div class="analytics-view">
    <div class="mb-6">
      <h1 class="text-3xl font-bold tracking-tight">Analytics</h1>
      <p class="text-muted-foreground">View system analytics and insights</p>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-8">
      <div
        class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"
      ></div>
      <p class="mt-4 text-muted-foreground">Loading analytics data...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="mb-6">
      <div
        class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
      >
        {{ error }}
      </div>
    </div>

    <div v-else class="grid gap-6">
      <!-- Stats Cards -->
      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader
            class="flex flex-row items-center justify-between space-y-0 pb-2"
          >
            <CardTitle class="text-sm font-medium"
              >Total Appointments</CardTitle
            >
            <Calendar class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">{{ stats.totalAppointments }}</div>
            <p class="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            class="flex flex-row items-center justify-between space-y-0 pb-2"
          >
            <CardTitle class="text-sm font-medium">Active Doctors</CardTitle>
            <Users class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">{{ stats.activeDoctors }}</div>
            <p class="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            class="flex flex-row items-center justify-between space-y-0 pb-2"
          >
            <CardTitle class="text-sm font-medium">Completed Today</CardTitle>
            <CheckCircle class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">{{ stats.completedToday }}</div>
            <p class="text-xs text-muted-foreground">Today's appointments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            class="flex flex-row items-center justify-between space-y-0 pb-2"
          >
            <CardTitle class="text-sm font-medium">Average Rating</CardTitle>
            <Star class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">{{ stats.averageRating }}</div>
            <p class="text-xs text-muted-foreground">Out of 5 stars</p>
          </CardContent>
        </Card>
      </div>

      <!-- Charts Section -->
      <div class="grid gap-6 md:grid-cols-2">
        <!-- Appointments Overview -->
        <Card>
          <CardHeader>
            <CardTitle>Appointments Overview</CardTitle>
            <CardDescription
              >Monthly appointment trends (Last 6 months)</CardDescription
            >
          </CardHeader>
          <CardContent>
            <div class="h-64">
              <div
                v-if="charts.appointmentTrends.labels.length === 0"
                class="h-full flex items-center justify-center text-muted-foreground"
              >
                <p>No data available</p>
              </div>
              <div v-else class="h-full flex flex-col">
                <!-- Simple bar chart -->
                <div class="flex-1 flex items-end justify-between gap-2">
                  <div
                    v-for="(label, index) in charts.appointmentTrends.labels"
                    :key="index"
                    class="flex-1 flex flex-col items-center gap-1"
                  >
                    <div
                      class="w-full flex flex-col gap-1 items-center justify-end"
                      style="height: 180px"
                    >
                      <!-- Completed -->
                      <div
                        class="w-full bg-green-500 rounded-t transition-all hover:opacity-80"
                        :style="{
                          height: getBarHeight(
                            charts.appointmentTrends.datasets[0].data[index]
                          ),
                        }"
                        :title="`Completed: ${charts.appointmentTrends.datasets[0].data[index]}`"
                      ></div>
                      <!-- Upcoming -->
                      <div
                        class="w-full bg-blue-500 transition-all hover:opacity-80"
                        :style="{
                          height: getBarHeight(
                            charts.appointmentTrends.datasets[1].data[index]
                          ),
                        }"
                        :title="`Upcoming: ${charts.appointmentTrends.datasets[1].data[index]}`"
                      ></div>
                      <!-- Cancelled -->
                      <div
                        class="w-full bg-red-500 rounded-b transition-all hover:opacity-80"
                        :style="{
                          height: getBarHeight(
                            charts.appointmentTrends.datasets[2].data[index]
                          ),
                        }"
                        :title="`Cancelled: ${charts.appointmentTrends.datasets[2].data[index]}`"
                      ></div>
                    </div>
                    <span
                      class="text-xs text-muted-foreground text-center"
                      style="font-size: 10px"
                      >{{ label }}</span
                    >
                  </div>
                </div>
                <!-- Legend -->
                <div class="flex justify-center gap-4 mt-4 text-xs">
                  <div class="flex items-center gap-1">
                    <div class="w-3 h-3 bg-green-500 rounded"></div>
                    <span>Completed</span>
                  </div>
                  <div class="flex items-center gap-1">
                    <div class="w-3 h-3 bg-blue-500 rounded"></div>
                    <span>Upcoming</span>
                  </div>
                  <div class="flex items-center gap-1">
                    <div class="w-3 h-3 bg-red-500 rounded"></div>
                    <span>Cancelled</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- Appointment Types -->
        <Card>
          <CardHeader>
            <CardTitle>Appointment Types</CardTitle>
            <CardDescription>Distribution by appointment type</CardDescription>
          </CardHeader>
          <CardContent>
            <div class="h-64">
              <div
                v-if="charts.appointmentTypeDistribution.labels.length === 0"
                class="h-full flex items-center justify-center text-muted-foreground"
              >
                <p>No data available</p>
              </div>
              <div v-else class="h-full flex flex-col justify-center">
                <div
                  v-for="(label, index) in charts.appointmentTypeDistribution
                    .labels"
                  :key="index"
                  class="mb-3"
                >
                  <div class="flex items-center justify-between mb-1">
                    <span class="text-sm font-medium">{{ label }}</span>
                    <span class="text-sm text-muted-foreground">{{
                      charts.appointmentTypeDistribution.data[index]
                    }}</span>
                  </div>
                  <div class="w-full bg-gray-200 rounded-full h-2">
                    <div
                      class="h-2 rounded-full transition-all"
                      :class="getTypeColor(index)"
                      :style="{
                        width:
                          getPercentage(
                            charts.appointmentTypeDistribution.data[index],
                            charts.appointmentTypeDistribution.data
                          ) + '%',
                      }"
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- Specialties (Admin only) -->
        <Card v-if="isAdmin && charts.specialtyDistribution.labels.length > 0">
          <CardHeader>
            <CardTitle>Popular Specialties</CardTitle>
            <CardDescription>Doctor specialties distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div class="h-64">
              <div class="h-full flex flex-col justify-center">
                <div
                  v-for="(label, index) in charts.specialtyDistribution.labels"
                  :key="index"
                  class="mb-3"
                >
                  <div class="flex items-center justify-between mb-1">
                    <span class="text-sm font-medium">{{ label }}</span>
                    <span class="text-sm text-muted-foreground">{{
                      charts.specialtyDistribution.data[index]
                    }}</span>
                  </div>
                  <div class="w-full bg-gray-200 rounded-full h-2">
                    <div
                      class="h-2 rounded-full bg-primary transition-all"
                      :style="{
                        width:
                          getPercentage(
                            charts.specialtyDistribution.data[index],
                            charts.specialtyDistribution.data
                          ) + '%',
                      }"
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Recent Activity -->
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription
            >Latest system activities and appointments</CardDescription
          >
        </CardHeader>
        <CardContent>
          <div
            v-if="recentActivity.length === 0"
            class="text-center py-8 text-muted-foreground"
          >
            <p>No recent activity</p>
          </div>
          <div v-else class="space-y-4">
            <div
              class="flex items-center space-x-4"
              v-for="activity in recentActivity"
              :key="activity.id"
            >
              <div
                class="w-2 h-2 rounded-full"
                :class="{
                  'bg-green-500': activity.type === 'completed',
                  'bg-blue-500': activity.type === 'upcoming',
                  'bg-red-500':
                    activity.type === 'cancelled' ||
                    activity.type === 'canceled',
                  'bg-gray-400':
                    activity.type !== 'completed' &&
                    activity.type !== 'upcoming' &&
                    activity.type !== 'cancelled' &&
                    activity.type !== 'canceled',
                }"
              ></div>
              <div class="flex-1">
                <p class="text-sm">{{ activity.description }}</p>
                <p class="text-xs text-muted-foreground">{{ activity.time }}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useApi } from "@/composables/useApi";
import { useDoctorAuth } from "@/composables/useDoctorAuth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Calendar, Users, CheckCircle, Star } from "lucide-vue-next";

interface ChartData {
  labels: string[];
  data: number[];
}

interface TrendData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
  }>;
}

interface Activity {
  id: string;
  description: string;
  time: string;
  type: string;
}

const api = useApi();
const { isAdmin } = useDoctorAuth();

const loading = ref(true);
const error = ref("");

const stats = ref({
  totalAppointments: 0,
  activeDoctors: 0,
  completedToday: 0,
  averageRating: 0,
});

const charts = ref<{
  appointmentTrends: TrendData;
  specialtyDistribution: ChartData;
  appointmentTypeDistribution: ChartData;
}>({
  appointmentTrends: { labels: [], datasets: [] },
  specialtyDistribution: { labels: [], data: [] },
  appointmentTypeDistribution: { labels: [], data: [] },
});

const recentActivity = ref<Activity[]>([]);

// Helper functions for chart visualization
const getBarHeight = (value: number) => {
  const maxValue = Math.max(
    ...charts.value.appointmentTrends.datasets.flatMap((d) => d.data),
    1
  );
  const percentage = (value / maxValue) * 100;
  return `${percentage}%`;
};

const getPercentage = (value: number, allValues: number[]) => {
  const total = allValues.reduce((sum, v) => sum + v, 0);
  return total > 0 ? Math.round((value / total) * 100) : 0;
};

const getTypeColor = (index: number) => {
  const colors = [
    "bg-blue-500",
    "bg-green-500",
    "bg-purple-500",
    "bg-orange-500",
  ];
  return colors[index % colors.length];
};

onMounted(async () => {
  try {
    loading.value = true;
    error.value = "";

    const response = await api.makeRequest("/api/analytics/overview");

    if (response.success && response.data) {
      stats.value = response.data.stats;
      charts.value = response.data.charts;
      recentActivity.value = response.data.recentActivity;
    } else {
      error.value = "Failed to load analytics data";
    }
  } catch (err) {
    console.error("Error fetching analytics:", err);
    error.value =
      err instanceof Error ? err.message : "Failed to load analytics data";
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.analytics-view {
  @apply p-6;
}
</style>
