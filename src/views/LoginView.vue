<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useDoctorAuth } from "@/composables/useDoctorAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useDark, useToggle } from "@vueuse/core";
import { Sun, Moon } from "lucide-vue-next";

// Theme setup
const isDark = useDark();
const toggleDark = useToggle(isDark);

// Form state
const email = ref("");
const password = ref("");
const isSubmitting = ref(false);
const errorMessage = ref("");

const router = useRouter();
const { login, isAuthenticated } = useDoctorAuth();

// Submit handler
const handleSubmit = async () => {
  if (isSubmitting.value) return;

  try {
    errorMessage.value = "";
    isSubmitting.value = true;

    await login(email.value, password.value);

    if (isAuthenticated.value) {
      router.push("/dashboard");
    } else {
      errorMessage.value = "Authentication failed";
    }
  } catch (error: unknown) {
    errorMessage.value =
      error instanceof Error ? error.message : "Login failed";
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-background p-4">
    <Card class="w-full max-w-md">
      <CardHeader class="space-y-1">
        <!-- Theme Toggle Button -->
        <div class="flex justify-end">
          <Button variant="ghost" size="icon" @click="toggleDark()">
            <Sun v-if="isDark" class="h-4 w-4" />
            <Moon v-else class="h-4 w-4" />
          </Button>
        </div>

        <!-- Logo and Title -->
        <div class="text-center space-y-2">
          <CardTitle class="text-2xl font-bold">Telemedker</CardTitle>
          <p class="text-sm text-muted-foreground">
            Doctor Dashboard - Sign in to continue
          </p>
        </div>
      </CardHeader>

      <CardContent class="space-y-4">
        <!-- Error Message -->
        <div
          v-if="errorMessage"
          class="bg-destructive/15 text-destructive px-3 py-2 rounded-md text-sm"
        >
          {{ errorMessage }}
        </div>

        <!-- Login Form -->
        <form @submit.prevent="handleSubmit" class="space-y-4">
          <div class="space-y-2">
            <label for="email" class="text-sm font-medium leading-none">
              Email
            </label>
            <Input
              id="email"
              v-model="email"
              type="email"
              placeholder="Enter your email"
              required
              :disabled="isSubmitting"
            />
          </div>

          <div class="space-y-2">
            <label for="password" class="text-sm font-medium leading-none">
              Password
            </label>
            <Input
              id="password"
              v-model="password"
              type="password"
              placeholder="Enter your password"
              required
              :disabled="isSubmitting"
            />
          </div>

          <Button type="submit" class="w-full" :disabled="isSubmitting">
            {{ isSubmitting ? "Signing in..." : "Sign in" }}
          </Button>
        </form>
      </CardContent>
    </Card>
  </div>
</template>

<style scoped>
.min-h-screen {
  min-height: 100vh;
}
</style>
