<script setup lang="ts">
import { useDark, useToggle } from '@vueuse/core'
import { Button } from '@/components/ui/button'
import { Moon, Sun } from 'lucide-vue-next'

const isDark = useDark()
const toggleDark = useToggle(isDark)
</script>

<template>
  <Button variant="ghost" size="icon" @click="toggleDark()">
    <Sun v-if="isDark" class="h-5 w-5" />
    <Moon v-else class="h-5 w-5" />
    <span class="sr-only">Toggle theme</span>
  </Button>
</template> 