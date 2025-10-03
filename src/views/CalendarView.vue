<template>
  <div class="calendar-view">
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">Calendar</h1>
        <p class="text-muted-foreground mt-1">
          View your availability and scheduled appointments
        </p>
      </div>
    </div>

    <!-- Calendar Navigation -->
    <Card class="mb-6">
      <CardHeader>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <Button variant="outline" size="sm" @click="previousMonth">
              <ChevronLeft class="h-4 w-4" />
            </Button>
            <h2 class="text-xl font-semibold">
              {{ currentMonthYear }}
            </h2>
            <Button variant="outline" size="sm" @click="nextMonth">
              <ChevronRight class="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" @click="goToToday">
            Today
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <!-- Legend -->
        <div class="flex items-center gap-6 mb-4 text-sm">
          <div class="flex items-center gap-2">
            <div
              class="w-4 h-4 rounded bg-blue-500/20 border-2 border-blue-500"
            ></div>
            <span>Available</span>
          </div>
          <div class="flex items-center gap-2">
            <div
              class="w-4 h-4 rounded bg-green-500/20 border-2 border-green-500"
            ></div>
            <span>Appointments</span>
          </div>
          <div class="flex items-center gap-2">
            <div
              class="w-4 h-4 rounded bg-orange-500/20 border-2 border-orange-500"
            ></div>
            <span>Mixed</span>
          </div>
        </div>

        <!-- Calendar Grid -->
        <div class="calendar-grid">
          <!-- Day Headers -->
          <div v-for="day in daysOfWeek" :key="day" class="calendar-header">
            {{ day }}
          </div>

          <!-- Calendar Days -->
          <div
            v-for="(day, index) in calendarDays"
            :key="index"
            :class="[
              'calendar-day',
              {
                'calendar-day--other-month': !day.isCurrentMonth,
                'calendar-day--today': day.isToday,
                'calendar-day--has-events':
                  day.hasAvailability || day.hasAppointments,
              },
            ]"
            @click="openDayDetails(day)"
          >
            <div class="calendar-day__date">{{ day.date }}</div>
            <div class="calendar-day__content">
              <!-- Availability indicator -->
              <div
                v-if="day.hasAvailability && !day.hasAppointments"
                class="event-indicator event-indicator--availability"
                :title="`${day.availabilityCount} availability slot(s)`"
              >
                <Calendar class="h-3 w-3" />
                <span class="text-xs">{{ day.availabilityCount }}</span>
              </div>
              <!-- Appointments indicator -->
              <div
                v-if="day.hasAppointments && !day.hasAvailability"
                class="event-indicator event-indicator--appointment"
                :title="`${day.appointmentCount} appointment(s)`"
              >
                <CalendarCheck class="h-3 w-3" />
                <span class="text-xs">{{ day.appointmentCount }}</span>
              </div>
              <!-- Mixed indicator -->
              <div
                v-if="day.hasAvailability && day.hasAppointments"
                class="event-indicator event-indicator--mixed"
                :title="`${day.availabilityCount} availability, ${day.appointmentCount} appointment(s)`"
              >
                <CalendarDays class="h-3 w-3" />
                <span class="text-xs">{{ day.appointmentCount }}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Day Details Dialog -->
    <Dialog v-model:open="showDayDetails">
      <DialogContent class="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {{ selectedDay ? formatDate(selectedDay.fullDate) : "" }}
          </DialogTitle>
          <DialogDescription>
            Availability and appointments for this day
          </DialogDescription>
        </DialogHeader>

        <div v-if="selectedDay" class="space-y-4 max-h-[400px] overflow-y-auto">
          <!-- Availability Section -->
          <div v-if="selectedDay.availability" class="space-y-2">
            <h3 class="font-semibold text-sm flex items-center gap-2">
              <Calendar class="h-4 w-4 text-blue-500" />
              Available Time Slots ({{ selectedDay.availability.slots.length }})
            </h3>
            <div class="grid grid-cols-3 gap-2">
              <Badge
                v-for="slot in selectedDay.availability.slots"
                :key="slot"
                variant="outline"
                class="justify-center"
              >
                {{ slot }}
              </Badge>
            </div>
          </div>

          <!-- Appointments Section -->
          <div
            v-if="
              selectedDay.appointments && selectedDay.appointments.length > 0
            "
            class="space-y-2"
          >
            <h3 class="font-semibold text-sm flex items-center gap-2">
              <CalendarCheck class="h-4 w-4 text-green-500" />
              Appointments ({{ selectedDay.appointments.length }})
            </h3>
            <div class="space-y-3">
              <div
                v-for="appointment in selectedDay.appointments"
                :key="appointment._id"
                class="p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                @click="viewAppointmentDetails(appointment)"
              >
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <p class="font-medium">{{ appointment.slot }}</p>
                    <p class="text-sm text-muted-foreground">
                      {{ getPatientName(appointment.patientId) }}
                    </p>
                    <Badge
                      :variant="getStatusVariant(appointment.status)"
                      class="mt-1"
                    >
                      {{ appointment.status }}
                    </Badge>
                  </div>
                  <Badge variant="secondary">{{ appointment.plan }}</Badge>
                </div>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div
            v-if="
              !selectedDay.availability &&
              (!selectedDay.appointments ||
                selectedDay.appointments.length === 0)
            "
            class="text-center py-8 text-muted-foreground"
          >
            <Calendar class="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No availability or appointments for this day</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" @click="showDayDetails = false"
            >Close</Button
          >
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Calendar,
  CalendarCheck,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
} from "lucide-vue-next";
import { useApi } from "@/composables/useApi";
import { toast } from "vue-sonner";

interface Availability {
  _id: string;
  doctorId: string;
  date: string;
  slots: string[];
  isActive: boolean;
}

interface Appointment {
  _id: string;
  patientId: any;
  doctorId: string;
  date: string;
  slot: string;
  plan: string;
  status: string;
  notes?: string;
}

interface CalendarDay {
  date: number;
  fullDate: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  hasAvailability: boolean;
  hasAppointments: boolean;
  availabilityCount: number;
  appointmentCount: number;
  availability?: Availability;
  appointments?: Appointment[];
}

const router = useRouter();
const api = useApi();
const currentDate = ref(new Date());
const availabilities = ref<Availability[]>([]);
const appointments = ref<Appointment[]>([]);
const showDayDetails = ref(false);
const selectedDay = ref<CalendarDay | null>(null);

const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const currentMonthYear = computed(() => {
  return currentDate.value.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
});

const calendarDays = computed(() => {
  const year = currentDate.value.getFullYear();
  const month = currentDate.value.getMonth();

  // First day of the month
  const firstDay = new Date(year, month, 1);
  // Last day of the month
  const lastDay = new Date(year, month + 1, 0);

  // Get the day of week for first day (0 = Sunday, 6 = Saturday)
  // We need Monday as first day, so adjust
  let firstDayOfWeek = firstDay.getDay();
  firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  const days: CalendarDay[] = [];

  // Add previous month days
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const date = prevMonthLastDay - i;
    const fullDate = new Date(year, month - 1, date);
    days.push(createCalendarDay(date, fullDate, false));
  }

  // Add current month days
  for (let date = 1; date <= lastDay.getDate(); date++) {
    const fullDate = new Date(year, month, date);
    days.push(createCalendarDay(date, fullDate, true));
  }

  // Add next month days to complete the grid
  const remainingDays = 42 - days.length; // 6 rows × 7 days
  for (let date = 1; date <= remainingDays; date++) {
    const fullDate = new Date(year, month + 1, date);
    days.push(createCalendarDay(date, fullDate, false));
  }

  return days;
});

const createCalendarDay = (
  date: number,
  fullDate: Date,
  isCurrentMonth: boolean
): CalendarDay => {
  const dateString = fullDate.toISOString().split("T")[0];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayDate = new Date(fullDate);
  dayDate.setHours(0, 0, 0, 0);

  const availability = availabilities.value.find((a) => {
    const availDate = new Date(a.date);
    availDate.setHours(0, 0, 0, 0);
    return availDate.getTime() === dayDate.getTime() && a.isActive;
  });

  const dayAppointments = appointments.value.filter((apt) => {
    const aptDate = new Date(apt.date);
    aptDate.setHours(0, 0, 0, 0);
    return aptDate.getTime() === dayDate.getTime();
  });

  return {
    date,
    fullDate,
    isCurrentMonth,
    isToday: dayDate.getTime() === today.getTime(),
    hasAvailability: !!availability,
    hasAppointments: dayAppointments.length > 0,
    availabilityCount: availability?.slots.length || 0,
    appointmentCount: dayAppointments.length,
    availability,
    appointments: dayAppointments,
  };
};

const previousMonth = () => {
  currentDate.value = new Date(
    currentDate.value.getFullYear(),
    currentDate.value.getMonth() - 1,
    1
  );
  fetchData();
};

const nextMonth = () => {
  currentDate.value = new Date(
    currentDate.value.getFullYear(),
    currentDate.value.getMonth() + 1,
    1
  );
  fetchData();
};

const goToToday = () => {
  currentDate.value = new Date();
  fetchData();
};

const openDayDetails = (day: CalendarDay) => {
  if (!day.hasAvailability && !day.hasAppointments) return;
  selectedDay.value = day;
  showDayDetails.value = true;
};

const formatDate = (date: Date) => {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const getPatientName = (patientId: any) => {
  if (!patientId) return "Unknown Patient";
  if (typeof patientId === "string") return `Patient ${patientId.slice(0, 8)}`;
  return (
    `${patientId.firstName || ""} ${patientId.lastName || ""}`.trim() ||
    "Unknown Patient"
  );
};

const getStatusVariant = (
  status: string
): "default" | "secondary" | "destructive" => {
  switch (status.toLowerCase()) {
    case "upcoming":
      return "default";
    case "completed":
      return "secondary";
    case "cancelled":
      return "destructive";
    default:
      return "default";
  }
};

const viewAppointmentDetails = (appointment: Appointment) => {
  router.push(`/appointments/${appointment._id}`);
};

const fetchData = async () => {
  try {
    const year = currentDate.value.getFullYear();
    const month = currentDate.value.getMonth() + 1;

    // Calculate start and end dates for the month
    const startDate = new Date(year, month - 1, 1).toISOString().split("T")[0];
    const endDate = new Date(year, month, 0).toISOString().split("T")[0];

    // Fetch availability for the current month
    const availResponse = await api.availability.getDoctorAvailability({
      startDate,
      endDate,
    });
    availabilities.value = (availResponse as any).data || [];

    // Fetch appointments for the current month
    const aptResponse = await api.appointments.getAll({
      startDate,
      endDate,
      limit: 1000, // Get all appointments for the month
    });
    appointments.value = (aptResponse as any).data || [];
  } catch (error) {
    console.error("Error fetching calendar data:", error);
    toast.error("Failed to load calendar data");
  }
};

onMounted(() => {
  fetchData();
});
</script>

<style lang="scss" scoped>
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  background: hsl(var(--border));
  border: 1px solid hsl(var(--border));
  border-radius: var(--radius);
  overflow: hidden;
}

.calendar-header {
  padding: 0.75rem;
  text-align: center;
  font-weight: 600;
  font-size: 0.875rem;
  background: hsl(var(--muted));
  color: hsl(var(--muted-foreground));
}

.calendar-day {
  min-height: 100px;
  padding: 0.5rem;
  background: hsl(var(--background));
  cursor: pointer;
  transition: background-color 0.2s;
  position: relative;

  &:hover {
    background: hsl(var(--accent));
  }

  &--other-month {
    opacity: 0.4;
  }

  &--today {
    background: hsl(var(--primary) / 0.1);

    .calendar-day__date {
      background: hsl(var(--primary));
      color: hsl(var(--primary-foreground));
    }
  }

  &__date {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
    border-radius: 50%;
    font-size: 0.875rem;
    font-weight: 500;
    margin-bottom: 0.25rem;
  }

  &__content {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
}

.event-indicator {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;

  &--availability {
    background: rgba(59, 130, 246, 0.2);
    border: 1px solid rgb(59, 130, 246);
    color: rgb(59, 130, 246);
  }

  &--appointment {
    background: rgba(34, 197, 94, 0.2);
    border: 1px solid rgb(34, 197, 94);
    color: rgb(34, 197, 94);
  }

  &--mixed {
    background: rgba(249, 115, 22, 0.2);
    border: 1px solid rgb(249, 115, 22);
    color: rgb(249, 115, 22);
  }
}
</style>
