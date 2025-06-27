<script setup lang="ts">
import { useFormField } from "./useFormField";
import { SelectTrigger } from "@/components/ui/select";

const { error, formItemId, formDescriptionId, formMessageId } = useFormField();
</script>

<template>
  <SelectTrigger
    :id="formItemId"
    :aria-describedby="
      !error ? formDescriptionId : `${formDescriptionId} ${formMessageId}`
    "
    :aria-invalid="!!error"
    v-bind="$attrs"
  />
</template>
