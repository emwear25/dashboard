<script setup lang="ts">
import { useToast } from "./use-toast";

const { toasts } = useToast();

// Add defineExpose to make the component available for import
defineExpose({});
</script>

<template>
  <div class="relative">
    <slot />
    <div
      v-for="toast in toasts"
      :key="toast.id"
      class="pointer-events-none fixed inset-0 z-50 flex items-end justify-center sm:items-start"
      :class="{ 'top-0 right-0': toast.position === 'top-right' }"
    >
      <!-- Your toast template here -->
    </div>
  </div>
</template>
