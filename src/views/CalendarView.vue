<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-3xl font-bold">Calendar</h1>
        <p class="text-muted-foreground mt-1">
          View your appointments and schedule
        </p>
      </div>
    </div>

    <div class="grid gap-6">
      <!-- Calendar placeholder -->
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <Calendar class="h-5 w-5" />
            Appointment Calendar
          </CardTitle>
          <CardDescription>
            Your scheduled appointments and availability
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            class="flex items-center justify-center h-64 text-muted-foreground"
          >
            <div class="text-center">
              <Calendar class="h-12 w-12 mx-auto mb-4" />
              <p class="text-lg font-medium mb-2">Calendar Integration</p>
              <p class="text-sm">
                Calendar functionality will be implemented here
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Calendar } from "lucide-vue-next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
</script>
