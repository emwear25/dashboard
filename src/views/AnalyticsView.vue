<template>
  <div class="analytics-view">
    <div class="mb-6">
      <h1 class="text-3xl font-bold tracking-tight">Analytics</h1>
      <p class="text-muted-foreground">View system analytics and insights</p>
    </div>

    <div class="grid gap-6">
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
            <p class="text-xs text-muted-foreground">+12% from last month</p>
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
            <p class="text-xs text-muted-foreground">+2 new this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            class="flex flex-row items-center justify-between space-y-0 pb-2"
          >
            <CardTitle class="text-sm font-medium">Confirmed Today</CardTitle>
            <CheckCircle class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">{{ stats.confirmedToday }}</div>
            <p class="text-xs text-muted-foreground">+5 from yesterday</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            class="flex flex-row items-center justify-between space-y-0 pb-2"
          >
            <CardTitle class="text-sm font-medium">Revenue</CardTitle>
            <DollarSign class="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div class="text-2xl font-bold">
              ${{ stats.revenue.toLocaleString() }}
            </div>
            <p class="text-xs text-muted-foreground">+8% from last month</p>
          </CardContent>
        </Card>
      </div>

      <!-- Charts Section -->
      <div class="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Appointments Overview</CardTitle>
            <CardDescription> Monthly appointment trends </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              class="h-64 flex items-center justify-center text-muted-foreground"
            >
              <div class="text-center">
                <BarChart3 class="h-8 w-8 mx-auto mb-2" />
                <p>Chart will be implemented soon</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Popular Specialties</CardTitle>
            <CardDescription>
              Most requested medical specialties
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              class="h-64 flex items-center justify-center text-muted-foreground"
            >
              <div class="text-center">
                <PieChart class="h-8 w-8 mx-auto mb-2" />
                <p>Chart will be implemented soon</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Recent Activity -->
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Latest system activities and appointments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div class="space-y-4">
            <div
              class="flex items-center space-x-4"
              v-for="activity in recentActivity"
              :key="activity.id"
            >
              <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
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
import { ref, onMounted } from "vue";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Calendar,
  Users,
  CheckCircle,
  DollarSign,
  BarChart3,
  PieChart,
} from "lucide-vue-next";

// Mock data - replace with real API calls later
const stats = ref({
  totalAppointments: 1284,
  activeDoctors: 24,
  confirmedToday: 18,
  revenue: 45230,
});

const recentActivity = ref([
  {
    id: 1,
    description: "New appointment booked with Dr. Sarah Johnson",
    time: "2 minutes ago",
  },
  {
    id: 2,
    description: "Dr. Michael Chen confirmed appointment for tomorrow",
    time: "5 minutes ago",
  },
  {
    id: 3,
    description: "Patient cancelled appointment with Dr. Emily Rodriguez",
    time: "10 minutes ago",
  },
  {
    id: 4,
    description: "New doctor Dr. James Wilson added to the system",
    time: "1 hour ago",
  },
]);

onMounted(() => {
  // TODO: Fetch real analytics data from API
  console.log("Analytics view mounted - implement API calls here");
});
</script>

<style scoped>
.analytics-view {
  @apply p-6;
}
</style>
