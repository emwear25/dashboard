<script setup lang="ts">
import { RouterView } from "vue-router";
import { Toaster } from "@/components/ui/toast";
import { ToastProvider } from "radix-vue";
</script>

<template>
  <ToastProvider>
  <div class="min-h-screen bg-background text-foreground font-sans antialiased">
    <RouterView />
      <Toaster />
  </div>
  </ToastProvider>
</template>
