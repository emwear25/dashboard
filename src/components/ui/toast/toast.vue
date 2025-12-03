<template>
  <ToastViewport
    :class="[
      'fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]',
    ]"
  />

  <template v-for="toast in toasts" :key="toast.id">
    <ToastRoot
      :class="[
        'group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full',
        toast.variant === 'destructive' && 'border-red-600 bg-red-100 dark:bg-red-900/50',
        !toast.variant &&
          toast.title === 'Success' &&
          'border-green-600 bg-green-100 dark:bg-green-900/50',
      ]"
      :variant="toast.variant"
      @mouseenter="onMouseEnter"
      @mouseleave="onMouseLeave"
      :duration="toast.duration"
    >
      <div class="grid gap-1">
        <ToastTitle
          v-if="toast.title"
          class="text-sm font-semibold"
          :class="[
            toast.variant === 'destructive'
              ? 'text-red-800 dark:text-red-200'
              : toast.title === 'Success'
                ? 'text-green-800 dark:text-green-200'
                : 'text-foreground',
          ]"
        >
          {{ toast.title }}
        </ToastTitle>
        <ToastDescription
          v-if="toast.description"
          class="text-sm opacity-100"
          :class="[
            toast.variant === 'destructive'
              ? 'text-red-800 dark:text-red-200'
              : toast.title === 'Success'
                ? 'text-green-800 dark:text-green-200'
                : 'text-foreground',
          ]"
        >
          {{ toast.description }}
        </ToastDescription>
      </div>
      <ToastClose
        :class="[
          'absolute right-2 top-2 rounded-md p-1 opacity-70 transition-opacity hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100',
          toast.variant === 'destructive'
            ? 'text-red-800 hover:text-red-900 dark:text-red-200 dark:hover:text-red-100'
            : toast.title === 'Success'
              ? 'text-green-800 hover:text-green-900 dark:text-green-200 dark:hover:text-green-100'
              : 'text-foreground hover:text-foreground',
        ]"
      >
        <X class="h-4 w-4" />
      </ToastClose>
    </ToastRoot>
  </template>
</template>

<script setup lang="ts">
import { X } from "lucide-vue-next";
import { useToast } from "./use-toast";
import { ToastRoot, ToastDescription, ToastTitle, ToastClose, ToastViewport } from "radix-vue";

defineOptions({
  name: "ToastNotification",
});

const { toasts, onMouseEnter, onMouseLeave } = useToast();
</script>
