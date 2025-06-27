<script setup lang="ts">
import { computed } from "vue";
import { cn } from "@/lib/utils";

// Define component name
defineOptions({
  name: "UiBadge",
});

const props = withDefaults(
  defineProps<{
    variant?:
      | "default"
      | "secondary"
      | "destructive"
      | "outline"
      | "success"
      | "warning";
    class?: string;
  }>(),
  {
    variant: "default",
  }
);

const badgeVariants = computed(() => {
  return cn(
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
    {
      "border-transparent bg-primary text-primary-foreground hover:bg-primary/80":
        props.variant === "default",
      "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80":
        props.variant === "secondary",
      "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80":
        props.variant === "destructive",
      "text-foreground": props.variant === "outline",
      "border-transparent bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400":
        props.variant === "success",
      "border-transparent bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-400":
        props.variant === "warning",
    },
    props.class
  );
});

// Make this component available as default export
defineExpose({});
</script>

<template>
  <div :class="badgeVariants">
    <slot />
  </div>
</template>
