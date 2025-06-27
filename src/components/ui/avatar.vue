<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  name: string;
  image?: string;
  size?: "sm" | "md" | "lg";
}>();

const initials = computed(() => {
  return props.name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
});

const sizeClasses = computed(() => {
  switch (props.size) {
    case "sm":
      return "w-8 h-8 text-xs";
    case "lg":
      return "w-12 h-12 text-lg";
    default:
      return "w-10 h-10 text-sm";
  }
});
</script>

<template>
  <div
    :class="[
      'rounded-full flex items-center justify-center bg-primary text-primary-foreground',
      sizeClasses,
    ]"
  >
    <img
      v-if="image"
      :src="image"
      :alt="name"
      class="w-full h-full rounded-full object-cover"
    />
    <span v-else>{{ initials }}</span>
  </div>
</template>
