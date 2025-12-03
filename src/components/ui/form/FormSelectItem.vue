<script setup lang="ts">
import { SelectItem } from "@/components/ui/select";

interface Props {
  value: string;
  disabled?: boolean;
  textValue?: string;
}

const props = defineProps<Props>();
</script>

<template>
  <SelectItem :value="props.value" :disabled="props.disabled" :text-value="props.textValue" />
</template>
