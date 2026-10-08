<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { ExternalLink, Printer, Loader2 } from "lucide-vue-next";
import { apiGet, apiPatch } from "@/utils/api";

/**
 * Internal link to the 3D print file (e.g. the MakerWorld model page), so an
 * order can go straight to printing. Only admins can read or change it; the
 * shop never shows it. Loads and saves on its own.
 */
const props = defineProps<{ productId: string }>();
const { toast } = useToast();

const url = ref("");
const note = ref("");
const savedUrl = ref("");
const loading = ref(true);
const saving = ref(false);

async function load() {
  loading.value = true;
  try {
    const res = await apiGet(`products/print-sources?ids=${props.productId}`);
    const src = res?.data?.[props.productId];
    url.value = savedUrl.value = src?.url || "";
    note.value = src?.note || "";
  } finally {
    loading.value = false;
  }
}

async function save() {
  saving.value = true;
  try {
    const res = await apiPatch(`products/${props.productId}`, { printSource: { url: url.value.trim(), note: note.value.trim() } });
    if (res?.success === false) throw new Error(res.message);
    savedUrl.value = url.value.trim();
    toast({ title: "Линкът за печат е запазен" });
  } catch (e: any) {
    toast({ title: "Неуспешно запазване", description: e?.message || String(e), variant: "destructive" });
  } finally {
    saving.value = false;
  }
}

onMounted(load);
watch(() => props.productId, load);
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle class="flex items-center gap-2"><Printer class="h-5 w-5" /> Файл за печат</CardTitle>
      <CardDescription>Линк към модела (напр. MakerWorld) — вижда се само в админ панела, не и в магазина.</CardDescription>
    </CardHeader>
    <CardContent class="space-y-4">
      <div v-if="loading" class="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 class="h-4 w-4 animate-spin" /> Зареждане…
      </div>
      <template v-else>
        <div class="space-y-2">
          <Label for="print-url">Линк към файла</Label>
          <Input id="print-url" v-model="url" type="url" placeholder="https://makerworld.com/en/models/…" />
        </div>
        <div class="space-y-2">
          <Label for="print-note">Бележка за печат</Label>
          <Input id="print-note" v-model="note" maxlength="300" placeholder="напр. профил 0.2 мм, мащаб 100%, без подпори" />
        </div>
        <div class="flex flex-wrap gap-2">
          <Button type="button" :disabled="saving" @click="save">
            <Loader2 v-if="saving" class="mr-2 h-4 w-4 animate-spin" /> Запази линка
          </Button>
          <Button v-if="savedUrl" as="a" :href="savedUrl" target="_blank" rel="noopener" variant="outline">
            <ExternalLink class="mr-2 h-4 w-4" /> Отвори за печат
          </Button>
        </div>
      </template>
    </CardContent>
  </Card>
</template>
