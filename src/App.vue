<script setup lang="ts">
import { RouterView } from "vue-router";
import { useDark } from "@vueuse/core";
import { onMounted, ref } from "vue";
import { useDoctorAuth } from "@/composables/useDoctorAuth";
import { useToast } from "@/components/ui/toast/use-toast";

// Initialize dark mode
const isDark = useDark();
const { initialize, isAuthenticated, doctor } = useDoctorAuth();
const isLoading = ref(true);
const { toast } = useToast();

onMounted(async () => {
  try {
    await initialize();
    console.log("Doctor auth initialized:", {
      isAuthenticated: isAuthenticated.value,
      doctor: doctor.value,
    });
  } catch (error) {
    console.error("Failed to initialize doctor auth:", error);
    toast({
      title: "Authentication Error",
      description:
        "Failed to restore your session. Please try logging in again.",
    });
  } finally {
    isLoading.value = false;
  }
});
</script>

<template>
  <div
    :class="{ dark: isDark }"
    class="min-h-screen bg-background font-sans antialiased"
  >
    <template v-if="isLoading">
      <div class="flex items-center justify-center min-h-screen">
        Loading...
      </div>
    </template>
    <RouterView v-else />
  </div>
</template>
