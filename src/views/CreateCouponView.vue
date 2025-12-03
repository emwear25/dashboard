<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, Plus } from "lucide-vue-next";
import { apiPost } from "@/utils/api";

const router = useRouter();

const form = ref({
  code: "",
  discountPercentage: 0,
  expiresAt: "",
});

const isSubmitting = ref(false);
const errorMessage = ref("");

const generateRandomCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  form.value.code = code;
};

const handleSubmit = async () => {
  if (!form.value.code) {
    errorMessage.value = "Моля въведете код на купон";
    return;
  }

  if (form.value.discountPercentage <= 0 || form.value.discountPercentage > 100) {
    errorMessage.value = "Отстъпката трябва да е между 1% и 100%";
    return;
  }

  isSubmitting.value = true;
  errorMessage.value = "";

  try {
    const data: any = {
      code: form.value.code.toUpperCase(),
      discountPercentage: form.value.discountPercentage,
    };

    if (form.value.expiresAt) {
      data.expiresAt = form.value.expiresAt;
    }

    const result = await apiPost("coupons", data);

    if (!result.success) {
      throw new Error(result.message || "Failed to create coupon");
    }

    router.push("/coupons");
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "Failed to create coupon";
  } finally {
    isSubmitting.value = false;
  }
};

onMounted(() => {
  generateRandomCode();
});
</script>

<template>
  <div class="space-y-6 pb-8 pt-6 max-w-2xl mx-auto">
    <!-- Header -->
    <div class="flex items-center gap-4">
      <Button variant="ghost" size="icon" @click="router.push('/coupons')">
        <ArrowLeft class="h-5 w-5" />
      </Button>
      <div>
        <h1 class="text-4xl font-bold tracking-tight">Създай купон</h1>
        <p class="text-muted-foreground mt-1.5">Генерирай код за отстъпка на цялата количка</p>
      </div>
    </div>

    <!-- Form -->
    <form @submit.prevent="handleSubmit" class="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Информация за купона</CardTitle>
          <CardDescription>Код, процент отстъпка и валидност</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <!-- Coupon Code -->
          <div class="space-y-2">
            <Label for="code">Код на купон <span class="text-destructive">*</span></Label>
            <div class="flex gap-2">
              <Input
                id="code"
                v-model="form.code"
                placeholder="напр. SUMMER20"
                class="uppercase flex-1"
                required
                maxlength="20"
              />
              <Button type="button" variant="outline" @click="generateRandomCode">
                <Plus class="h-4 w-4 mr-2" />
                Генерирай
              </Button>
            </div>
          </div>

          <!-- Discount Percentage -->
          <div class="space-y-2">
            <Label for="percentage">Отстъпка (%) <span class="text-destructive">*</span></Label>
            <Input
              id="percentage"
              v-model.number="form.discountPercentage"
              type="number"
              min="1"
              max="100"
              placeholder="напр. 20"
              required
            />
            <p class="text-sm text-muted-foreground">Процент отстъпка върху цялата количка</p>
          </div>

          <!-- Expiration Date -->
          <div class="space-y-2">
            <Label for="expiresAt">Валиден до (опционално)</Label>
            <Input id="expiresAt" v-model="form.expiresAt" type="datetime-local" />
            <p class="text-sm text-muted-foreground">Оставете празно за неограничена валидност</p>
          </div>
        </CardContent>
      </Card>

      <!-- Error Message -->
      <div
        v-if="errorMessage"
        class="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-lg"
      >
        {{ errorMessage }}
      </div>

      <!-- Submit Button -->
      <div class="flex gap-4">
        <Button type="submit" :disabled="isSubmitting" class="flex-1">
          <Loader2 v-if="isSubmitting" class="mr-2 h-4 w-4 animate-spin" />
          {{ isSubmitting ? "Създаване..." : "Създай купон" }}
        </Button>
        <Button type="button" variant="outline" @click="router.push('/coupons')"> Отказ </Button>
      </div>
    </form>
  </div>
</template>
