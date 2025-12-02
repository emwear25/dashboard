<script setup lang="ts">
import { RouterView } from "vue-router";
import { Toaster } from "@/components/ui/toast";
import { ToastProvider } from "radix-vue";
import ErrorBoundary from "@/components/ErrorBoundary.vue";
</script>

<template>
  <ErrorBoundary>
    <ToastProvider>
      <div class="min-h-screen bg-background text-foreground font-sans antialiased">
        <RouterView />
        <Toaster />
      </div>
    </ToastProvider>
  </ErrorBoundary>
</template>
