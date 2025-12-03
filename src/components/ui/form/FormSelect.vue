<script setup lang="ts">
import { useFormField } from "./useFormField";
import { Select } from "@/components/ui/select";

const { error, formItemId, formDescriptionId, formMessageId } = useFormField();
</script>

<template>
  <Select
    :id="formItemId"
    :aria-describedby="!error ? formDescriptionId : `${formDescriptionId} ${formMessageId}`"
    :aria-invalid="!!error"
    v-bind="$attrs"
  />
</template>
