<script setup lang="ts">
import { computed } from "vue";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import type { StorefrontDetails } from "@/utils/storefront";

const props = defineProps<{
  colors: { name: string; hex: string }[];
  categories: { _id: string; slug: string; displayName: string; name: string }[];
  mainCategory: string;
}>();
const model = defineModel<StorefrontDetails>({ required: true });

const BADGES = [
  { id: "new", label: "Ново" },
  { id: "personalizable", label: "С персонализация" },
  { id: "set", label: "Комплект" },
  { id: "picked", label: "Избрано за теб" },
];
const PLATFORMS = ["MakerWorld", "Printables", "Thingiverse", "Cults3D", "MyMiniFactory", "Thangs"];

// One item per line in textareas
const lines = (key: "highlights") =>
  computed({
    get: () => model.value[key].join("\n"),
    set: (v: string) => (model.value[key] = v.split("\n").map((s) => s.trim()).filter(Boolean)),
  });
const highlights = lines("highlights");
const care = computed({
  get: () => model.value.specs.care.join("\n"),
  set: (v: string) => (model.value.specs.care = v.split("\n").map((s) => s.trim()).filter(Boolean)),
});
const tags = computed({
  get: () => model.value.tags.join(", "),
  set: (v: string) => (model.value.tags = v.split(",").map((s) => s.trim()).filter(Boolean)),
});

const toggleBadge = (id: string) => {
  const has = model.value.badges.includes(id);
  model.value.badges = has ? model.value.badges.filter((b) => b !== id) : [...model.value.badges, id];
};
const toggleAlsoIn = (id: string) => {
  const has = model.value.alsoIn.includes(id);
  model.value.alsoIn = has ? model.value.alsoIn.filter((c) => c !== id) : [...model.value.alsoIn, id];
};
const otherCategories = computed(() => props.categories.filter((c) => c.slug !== props.mainCategory));

const personalizationOn = computed({
  get: () => !!model.value.personalization,
  set: (on: boolean) =>
    (model.value.personalization = on
      ? { label: "Име", placeholder: "напр. Мария", help: "До 12 символа.", maxLength: 12, required: true }
      : null),
});
const designOn = computed({
  get: () => !!model.value.design,
  set: (on: boolean) =>
    (model.value.design = on
      ? { title: "", designer: "", platform: "Printables", url: "", license: "CC BY 4.0", licenseUrl: "", checkedOn: new Date().toISOString().slice(0, 10), note: "" }
      : null),
});

// Multi-colour swatches per colour (extra colours shown in the swatch dot)
const swatchText = (color: string) => {
  const entry = model.value.colorSwatches.find((c) => c.color === color);
  return entry ? entry.swatches.map((s) => s.replace(/^silk:/, "")).join(", ") : "";
};
const isSilk = (color: string) =>
  !!model.value.colorSwatches.find((c) => c.color === color)?.swatches.some((s) => s.startsWith("silk:"));
const setSwatches = (color: string, text: string, silk: boolean) => {
  const hexes = text
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^#[0-9a-f]{6}$/i.test(s))
    .map((h) => (silk ? `silk:${h}` : h));
  const rest = model.value.colorSwatches.filter((c) => c.color !== color);
  model.value.colorSwatches = hexes.length ? [...rest, { color, swatches: hexes }] : rest;
};
const swatchDefault = (color: { name: string; hex: string }) => swatchText(color.name) || color.hex;
</script>

<template>
  <Card>
    <CardHeader class="pb-4">
      <div class="flex items-center gap-2">
        <div class="h-8 w-1 rounded-full" style="background: #3b176f"></div>
        <div>
          <CardTitle class="text-lg">Страница на продукта в Imagoo</CardTitle>
          <CardDescription class="text-xs">
            Кратко описание, предимства, размери, етикети, персонализация и автор на дизайна
          </CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent class="space-y-6">
      <div class="space-y-2">
        <Label for="sf-tagline">Подзаглавие</Label>
        <Input id="sf-tagline" v-model="model.tagline" maxlength="160" placeholder="напр. Спирални ребра, които улавят светлината" />
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <div class="space-y-2">
          <Label for="sf-highlights">Предимства (по едно на ред)</Label>
          <Textarea id="sf-highlights" v-model="highlights" rows="4" placeholder="Стабилно широко дъно" />
        </div>
        <div class="space-y-2">
          <Label for="sf-care">Грижа (по едно на ред)</Label>
          <Textarea id="sf-care" v-model="care" rows="4" placeholder="Почиствай с влажна кърпа" />
        </div>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <div class="space-y-2">
          <Label for="sf-dim">Размери</Label>
          <Input id="sf-dim" v-model="model.specs.dimensions" placeholder="Височина 24 см, ⌀ 12 см" />
        </div>
        <div class="space-y-2">
          <Label for="sf-mat">Материал</Label>
          <Input id="sf-mat" v-model="model.specs.material" placeholder="PLA (биополимер)" />
        </div>
        <div class="space-y-2">
          <Label for="sf-weight">Тегло</Label>
          <Input id="sf-weight" v-model="model.specs.weight" placeholder="около 120 г" />
        </div>
        <div class="space-y-2">
          <Label for="sf-includes">Включва</Label>
          <Input id="sf-includes" v-model="model.specs.includes" placeholder="Кашпа и подложка" />
        </div>
      </div>

      <div class="space-y-2">
        <Label for="sf-notice">Важно за клиента (по избор)</Label>
        <Textarea id="sf-notice" v-model="model.notice" rows="2" placeholder="напр. Съдържа малки части. Не е подходящо за деца под 3 години." />
      </div>

      <div class="space-y-2">
        <Label>Етикети</Label>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="b in BADGES"
            :key="b.id"
            type="button"
            class="rounded-full border px-3 py-1 text-sm transition-colors"
            :class="model.badges.includes(b.id) ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-accent'"
            :aria-pressed="model.badges.includes(b.id)"
            @click="toggleBadge(b.id)"
          >
            {{ b.label }}
          </button>
        </div>
      </div>

      <div class="grid gap-4 md:grid-cols-3">
        <label class="flex items-center justify-between gap-3 rounded-lg border p-3">
          <span class="text-sm font-medium">На началната страница</span>
          <Switch v-model:checked="model.featured" />
        </label>
        <label class="flex items-center justify-between gap-3 rounded-lg border p-3">
          <span class="text-sm font-medium">„За всеки ден“</span>
          <Switch v-model:checked="model.everyday" />
        </label>
        <div class="space-y-1">
          <Label for="sf-rank" class="text-sm">Подредба (по-малко = по-напред)</Label>
          <Input id="sf-rank" v-model.number="model.rank" type="number" min="0" />
        </div>
      </div>

      <div class="space-y-2">
        <Label for="sf-tags">Ключови думи за търсене (разделени със запетая)</Label>
        <Input id="sf-tags" v-model="tags" placeholder="ваза, декорация, подарък" />
      </div>

      <div v-if="otherCategories.length" class="space-y-2">
        <Label>Показвай и в категории</Label>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="c in otherCategories"
            :key="c._id"
            type="button"
            class="rounded-full border px-3 py-1 text-sm transition-colors"
            :class="model.alsoIn.includes(c._id) ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-accent'"
            :aria-pressed="model.alsoIn.includes(c._id)"
            @click="toggleAlsoIn(c._id)"
          >
            {{ c.displayName || c.name }}
          </button>
        </div>
      </div>

      <div v-if="colors.length" class="space-y-2">
        <Label>Многоцветни мостри (по избор)</Label>
        <p class="text-xs text-muted-foreground">
          За продукти в няколко цвята въведи HEX кодовете, разделени със запетая (напр. #4b2a86, #ee6b62). Сатен = с блясък.
        </p>
        <div v-for="c in colors" :key="c.name" class="flex flex-wrap items-center gap-3">
          <span class="w-32 truncate text-sm font-medium">{{ c.name }}</span>
          <Input
            class="max-w-xs"
            :model-value="swatchDefault(c)"
            @update:model-value="(v) => setSwatches(c.name, String(v), isSilk(c.name))"
          />
          <label class="flex items-center gap-2 text-sm">
            <input type="checkbox" :checked="isSilk(c.name)" @change="setSwatches(c.name, swatchDefault(c), ($event.target as HTMLInputElement).checked)" />
            Сатен
          </label>
        </div>
      </div>

      <div class="space-y-3 rounded-lg border p-4">
        <label class="flex items-center justify-between gap-3">
          <span class="text-sm font-medium">Персонализация с текст (име, надпис)</span>
          <Switch v-model:checked="personalizationOn" />
        </label>
        <div v-if="model.personalization" class="grid gap-3 md:grid-cols-2">
          <div class="space-y-1">
            <Label for="sf-pz-label" class="text-sm">Етикет на полето</Label>
            <Input id="sf-pz-label" v-model="model.personalization.label" placeholder="Име" />
          </div>
          <div class="space-y-1">
            <Label for="sf-pz-ph" class="text-sm">Пример в полето</Label>
            <Input id="sf-pz-ph" v-model="model.personalization.placeholder" placeholder="напр. Мария" />
          </div>
          <div class="space-y-1 md:col-span-2">
            <Label for="sf-pz-help" class="text-sm">Подсказка</Label>
            <Input id="sf-pz-help" v-model="model.personalization.help" placeholder="До 12 символа, кирилица или латиница." />
          </div>
          <div class="space-y-1">
            <Label for="sf-pz-max" class="text-sm">Максимум символи</Label>
            <Input id="sf-pz-max" v-model.number="model.personalization.maxLength" type="number" min="1" max="60" />
          </div>
          <label class="flex items-center gap-3 self-end pb-2 text-sm">
            <Switch v-model:checked="model.personalization.required" />
            Задължително поле
          </label>
        </div>
      </div>

      <div class="space-y-3 rounded-lg border p-4">
        <label class="flex items-center justify-between gap-3">
          <span class="text-sm font-medium">Дизайн от друг автор (лиценз)</span>
          <Switch v-model:checked="designOn" />
        </label>
        <div v-if="model.design" class="grid gap-3 md:grid-cols-2">
          <div class="space-y-1">
            <Label for="sf-d-title" class="text-sm">Име на модела</Label>
            <Input id="sf-d-title" v-model="model.design.title" />
          </div>
          <div class="space-y-1">
            <Label for="sf-d-designer" class="text-sm">Автор</Label>
            <Input id="sf-d-designer" v-model="model.design.designer" />
          </div>
          <div class="space-y-1">
            <Label for="sf-d-platform" class="text-sm">Платформа</Label>
            <select id="sf-d-platform" v-model="model.design.platform" class="h-10 w-full rounded-md border bg-background px-3 text-sm">
              <option v-for="p in PLATFORMS" :key="p" :value="p">{{ p }}</option>
            </select>
          </div>
          <div class="space-y-1">
            <Label for="sf-d-url" class="text-sm">Линк към модела</Label>
            <Input id="sf-d-url" v-model="model.design.url" type="url" placeholder="https://" />
          </div>
          <div class="space-y-1">
            <Label for="sf-d-license" class="text-sm">Лиценз</Label>
            <Input id="sf-d-license" v-model="model.design.license" placeholder="CC BY 4.0" />
          </div>
          <div class="space-y-1">
            <Label for="sf-d-lurl" class="text-sm">Линк към лиценза</Label>
            <Input id="sf-d-lurl" v-model="model.design.licenseUrl" type="url" placeholder="https://creativecommons.org/licenses/by/4.0/" />
          </div>
          <div class="space-y-1">
            <Label for="sf-d-date" class="text-sm">Проверен на</Label>
            <Input id="sf-d-date" v-model="model.design.checkedOn" type="date" />
          </div>
          <div class="space-y-1">
            <Label for="sf-d-note" class="text-sm">Бележка (по избор)</Label>
            <Input id="sf-d-note" v-model="model.design.note" />
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
