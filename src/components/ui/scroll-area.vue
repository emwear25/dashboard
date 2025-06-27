<script setup lang="ts">
defineOptions({
  inheritAttrs: false,
});
</script>

<template>
  <div class="scroll-area" v-bind="$attrs">
    <div class="scroll-area-viewport">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.scroll-area {
  position: relative;
  overflow: hidden;
}

.scroll-area-viewport {
  height: 100%;
  width: 100%;
  border-radius: inherit;
  overflow-y: auto;
  overflow-x: hidden;
}

/* Custom scrollbar styling */
.scroll-area-viewport::-webkit-scrollbar {
  width: 8px;
}

.scroll-area-viewport::-webkit-scrollbar-track {
  background: transparent;
}

.scroll-area-viewport::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 20px;
}

.scroll-area-viewport::-webkit-scrollbar-thumb:hover {
  background-color: rgba(0, 0, 0, 0.3);
}
</style>
