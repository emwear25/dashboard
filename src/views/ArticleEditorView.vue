<template>
  <div class="article-editor">
    <!-- Header -->
    <div class="article-editor__header">
      <div class="article-editor__title-section">
        <button class="btn btn--ghost" @click="$router.push('/articles')">← Назад</button>
        <h1>{{ isEdit ? "Редактиране на статия" : "Нова статия" }}</h1>
      </div>
      <div class="article-editor__actions">
        <button class="btn btn--secondary" @click="saveDraft" :disabled="saving">
          {{ saving ? "Запазване..." : "Запази като чернова" }}
        </button>
        <button class="btn btn--primary" @click="publish" :disabled="saving">
          {{ isEdit && article.status === "published" ? "Обнови" : "Публикувай" }}
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="article-editor__loading">
      <div class="spinner"></div>
      <p>Зареждане...</p>
    </div>

    <!-- Form -->
    <div v-else class="article-editor__content">
      <!-- Main Content -->
      <div class="article-editor__main">
        <!-- Title -->
        <div class="form-group form-group--large">
          <input
            v-model="article.title"
            type="text"
            placeholder="Заглавие на статията..."
            class="title-input"
            @input="generateSlug"
          />
          <small class="slug-preview" v-if="article.title">
            URL: /blog/<strong>{{ article.slug || "..." }}</strong>
          </small>
        </div>

        <!-- Excerpt -->
        <div class="form-group">
          <label>Кратко описание</label>
          <textarea
            v-model="article.excerpt"
            placeholder="Кратко описание за списъка и SEO (до 500 символа)..."
            rows="3"
            maxlength="500"
          ></textarea>
          <small>{{ article.excerpt?.length || 0 }}/500</small>
        </div>

        <!-- Content Editor -->
        <div class="form-group">
          <label>Съдържание</label>
          <div class="editor-toolbar">
            <button type="button" @click="formatText('bold')" title="Bold">
              <strong>B</strong>
            </button>
            <button type="button" @click="formatText('italic')" title="Italic">
              <em>I</em>
            </button>
            <button type="button" @click="formatText('underline')" title="Underline">
              <u>U</u>
            </button>
            <span class="toolbar-separator"></span>
            <button type="button" @click="formatText('insertUnorderedList')" title="Bullet List">
              • List
            </button>
            <button type="button" @click="formatText('insertOrderedList')" title="Numbered List">
              1. List
            </button>
            <span class="toolbar-separator"></span>
            <button type="button" @click="insertHeading('h2')" title="Heading 2">H2</button>
            <button type="button" @click="insertHeading('h3')" title="Heading 3">H3</button>
            <span class="toolbar-separator"></span>
            <button type="button" @click="insertLink" title="Insert Link">🔗</button>
            <button type="button" @click="insertInlineImage" title="Insert Image">🖼️</button>
          </div>
          <div
            ref="contentEditor"
            class="content-editor"
            contenteditable="true"
            @input="updateContent"
            @paste="handlePaste"
          ></div>
        </div>
      </div>

      <!-- Sidebar -->
      <div class="article-editor__sidebar">
        <!-- Featured Image -->
        <div class="sidebar-card">
          <h3>Основно изображение</h3>
          <div
            class="image-upload"
            :class="{ 'image-upload--has-image': article.featuredImage?.url }"
            @click="triggerImageUpload"
            @dragover.prevent
            @drop.prevent="handleImageDrop"
          >
            <img
              v-if="article.featuredImage?.url"
              :src="article.featuredImage.url"
              alt="Featured"
            />
            <div v-else class="image-upload__placeholder">
              <span>📷</span>
              <p>Кликни или пусни изображение</p>
            </div>
            <input
              ref="imageInput"
              type="file"
              accept="image/*"
              hidden
              @change="handleImageSelect"
            />
          </div>
          <button
            v-if="article.featuredImage?.url"
            class="btn btn--ghost btn--small"
            @click.stop="removeImage"
          >
            Премахни
          </button>
          <div class="form-group" v-if="article.featuredImage?.url">
            <label>Alt текст</label>
            <input v-model="article.featuredImage.alt" type="text" placeholder="Описание на изображението" />
          </div>
        </div>

        <!-- Tags -->
        <div class="sidebar-card">
          <h3>Тагове</h3>
          <div class="tags-input">
            <div class="tags-list">
              <span v-for="(tag, index) in article.tags" :key="index" class="tag">
                {{ tag }}
                <button @click="removeTag(index)">×</button>
              </span>
            </div>
            <input
              v-model="newTag"
              type="text"
              placeholder="Добави таг..."
              @keydown.enter.prevent="addTag"
              @keydown.comma.prevent="addTag"
            />
          </div>
        </div>

        <!-- SEO Settings -->
        <div class="sidebar-card">
          <h3>SEO настройки</h3>
          <div class="form-group">
            <label>
              Meta заглавие
              <small>({{ article.seo?.metaTitle?.length || 0 }}/70)</small>
            </label>
            <input
              v-model="article.seo.metaTitle"
              type="text"
              maxlength="70"
              placeholder="SEO заглавие..."
            />
          </div>
          <div class="form-group">
            <label>
              Meta описание
              <small>({{ article.seo?.metaDescription?.length || 0 }}/160)</small>
            </label>
            <textarea
              v-model="article.seo.metaDescription"
              rows="3"
              maxlength="160"
              placeholder="SEO описание..."
            ></textarea>
          </div>
          <div class="form-group">
            <label>Ключови думи</label>
            <input
              v-model="seoKeywords"
              type="text"
              placeholder="ключова дума 1, ключова дума 2..."
            />
          </div>
        </div>

        <!-- Author -->
        <div class="sidebar-card">
          <h3>Автор</h3>
          <div class="form-group">
            <input v-model="article.author.name" type="text" placeholder="Име на автора" />
          </div>
        </div>
      </div>
    </div>

    <!-- Upload Progress -->
    <div v-if="uploading" class="upload-overlay">
      <div class="upload-modal">
        <div class="spinner"></div>
        <p>Качване на изображение...</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { apiGet, apiPost, apiPut, apiUpload } from "@/utils/api";

const route = useRoute();
const router = useRouter();

interface FeaturedImage {
  url: string | null;
  publicId: string | null;
  alt: string;
}

interface SEO {
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  canonicalUrl: string | null;
  ogImage: string | null;
}

interface Article {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featuredImage: FeaturedImage;
  author: { name: string; avatar: string | null };
  tags: string[];
  seo: SEO;
  status: "draft" | "published" | "scheduled";
}

const isEdit = computed(() => !!route.params.id);
const loading = ref(false);
const saving = ref(false);
const uploading = ref(false);
const newTag = ref("");
const seoKeywords = ref("");
const contentEditor = ref<HTMLDivElement | null>(null);
const imageInput = ref<HTMLInputElement | null>(null);

const article = ref<Article>({
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  featuredImage: { url: null, publicId: null, alt: "" },
  author: { name: "emWear", avatar: null },
  tags: [],
  seo: {
    metaTitle: "",
    metaDescription: "",
    keywords: [],
    canonicalUrl: null,
    ogImage: null,
  },
  status: "draft",
});

// Generate slug from title (Bulgarian transliteration)
const generateSlug = () => {
  const cyrillicToLatin: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ж: "zh", з: "z",
    и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p",
    р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch",
    ш: "sh", щ: "sht", ъ: "a", ь: "", ю: "yu", я: "ya",
    А: "A", Б: "B", В: "V", Г: "G", Д: "D", Е: "E", Ж: "Zh", З: "Z",
    И: "I", Й: "Y", К: "K", Л: "L", М: "M", Н: "N", О: "O", П: "P",
    Р: "R", С: "S", Т: "T", У: "U", Ф: "F", Х: "H", Ц: "Ts", Ч: "Ch",
    Ш: "Sh", Щ: "Sht", Ъ: "A", Ь: "", Ю: "Yu", Я: "Ya",
  };

  let transliterated = "";
  for (const char of article.value.title) {
    transliterated += cyrillicToLatin[char] || char;
  }

  article.value.slug = transliterated
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 100);
};

// Content editor functions
const updateContent = () => {
  if (contentEditor.value) {
    article.value.content = contentEditor.value.innerHTML;
  }
};

const formatText = (command: string) => {
  document.execCommand(command, false);
  contentEditor.value?.focus();
};

const insertHeading = (tag: string) => {
  document.execCommand("formatBlock", false, tag);
  contentEditor.value?.focus();
};

const insertLink = () => {
  const url = prompt("URL:");
  if (url) {
    document.execCommand("createLink", false, url);
  }
};

const insertInlineImage = () => {
  const url = prompt("URL на изображението:");
  if (url) {
    document.execCommand("insertImage", false, url);
  }
};

const handlePaste = (e: ClipboardEvent) => {
  e.preventDefault();
  const text = e.clipboardData?.getData("text/plain");
  if (text) {
    document.execCommand("insertText", false, text);
  }
};

// Image upload
const triggerImageUpload = () => {
  imageInput.value?.click();
};

const handleImageSelect = async (e: Event) => {
  const input = e.target as HTMLInputElement;
  if (input.files?.[0]) {
    await uploadImage(input.files[0]);
  }
};

const handleImageDrop = async (e: DragEvent) => {
  const file = e.dataTransfer?.files[0];
  if (file && file.type.startsWith("image/")) {
    await uploadImage(file);
  }
};

const uploadImage = async (file: File) => {
  uploading.value = true;
  try {
    const formData = new FormData();
    formData.append("image", file);

    const response = await apiUpload("articles/admin/upload", formData);
    if (response.success) {
      article.value.featuredImage = {
        url: response.data.url,
        publicId: response.data.publicId,
        alt: "",
      };
    }
  } catch (error) {
    console.error("Upload error:", error);
    alert("Грешка при качване на изображението");
  } finally {
    uploading.value = false;
  }
};

const removeImage = () => {
  article.value.featuredImage = { url: null, publicId: null, alt: "" };
};

// Tags
const addTag = () => {
  const tag = newTag.value.trim().toLowerCase();
  if (tag && !article.value.tags.includes(tag)) {
    article.value.tags.push(tag);
  }
  newTag.value = "";
};

const removeTag = (index: number) => {
  article.value.tags.splice(index, 1);
};

// Save functions
const saveDraft = async () => {
  article.value.status = "draft";
  await saveArticle();
};

const publish = async () => {
  article.value.status = "published";
  await saveArticle();
};

const saveArticle = async () => {
  if (!article.value.title) {
    alert("Заглавието е задължително");
    return;
  }
  if (!article.value.excerpt) {
    alert("Краткото описание е задължително");
    return;
  }
  if (!article.value.content) {
    alert("Съдържанието е задължително");
    return;
  }

  saving.value = true;
  try {
    // Parse SEO keywords
    article.value.seo.keywords = seoKeywords.value
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k);

    const payload = { ...article.value };

    let response;
    if (isEdit.value) {
      response = await apiPut(`articles/admin/${route.params.id}`, payload);
    } else {
      response = await apiPost("articles/admin", payload);
    }

    if (response.success) {
      router.push("/articles");
    } else {
      alert(response.error || "Грешка при запазване");
    }
  } catch (error: any) {
    console.error("Save error:", error);
    alert(error.response?.data?.error || "Грешка при запазване");
  } finally {
    saving.value = false;
  }
};

// Load existing article
const loadArticle = async () => {
  if (!route.params.id) return;

  loading.value = true;
  try {
    const response = await apiGet(`articles/admin/${route.params.id}`);
    if (response.success) {
      article.value = response.data;
      seoKeywords.value = response.data.seo?.keywords?.join(", ") || "";

      // Set content in editor
      if (contentEditor.value && response.data.content) {
        contentEditor.value.innerHTML = response.data.content;
      }
    }
  } catch (error) {
    console.error("Load error:", error);
    alert("Грешка при зареждане на статията");
    router.push("/articles");
  } finally {
    loading.value = false;
  }
};

// Watch for content editor ready
watch(
  () => contentEditor.value,
  (editor) => {
    if (editor && article.value.content) {
      editor.innerHTML = article.value.content;
    }
  }
);

onMounted(() => {
  if (isEdit.value) {
    loadArticle();
  }
});
</script>

<style scoped lang="scss">
.article-editor {
  min-height: 100vh;
  background: #f8fafc;

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 2rem;
    background: white;
    border-bottom: 1px solid #e2e8f0;
    position: sticky;
    top: 0;
    z-index: 10;

    h1 {
      margin: 0;
      font-size: 1.25rem;
    }
  }

  &__title-section {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  &__actions {
    display: flex;
    gap: 0.75rem;
  }

  &__loading {
    text-align: center;
    padding: 4rem;
    color: #64748b;
  }

  &__content {
    display: grid;
    grid-template-columns: 1fr 350px;
    gap: 2rem;
    padding: 2rem;
    max-width: 1400px;
    margin: 0 auto;
  }

  &__main {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  &__sidebar {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  &--large input {
    font-size: 1.5rem;
    padding: 1rem;
  }

  label {
    font-weight: 500;
    font-size: 0.875rem;
    color: #374151;
    display: flex;
    justify-content: space-between;

    small {
      color: #9ca3af;
      font-weight: normal;
    }
  }

  input,
  textarea {
    padding: 0.75rem;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 0.875rem;
    font-family: inherit;

    &:focus {
      outline: none;
      border-color: #3b82f6;
    }
  }

  small {
    color: #9ca3af;
    font-size: 0.75rem;
  }
}

.title-input {
  width: 100%;
  border: none !important;
  background: white;
  border-radius: 12px !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

  &:focus {
    box-shadow: 0 0 0 2px #3b82f6;
  }
}

.slug-preview {
  padding: 0.5rem 1rem;
  background: #f1f5f9;
  border-radius: 4px;
  font-size: 0.75rem;
  color: #64748b;
}

.editor-toolbar {
  display: flex;
  gap: 0.25rem;
  padding: 0.5rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-bottom: none;
  border-radius: 8px 8px 0 0;

  button {
    padding: 0.5rem 0.75rem;
    border: none;
    background: transparent;
    cursor: pointer;
    border-radius: 4px;
    font-size: 0.875rem;

    &:hover {
      background: #e2e8f0;
    }
  }

  .toolbar-separator {
    width: 1px;
    background: #e2e8f0;
    margin: 0 0.25rem;
  }
}

.content-editor {
  min-height: 400px;
  padding: 1.5rem;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 0 0 8px 8px;
  font-size: 1rem;
  line-height: 1.75;

  &:focus {
    outline: none;
    border-color: #3b82f6;
  }

  :deep(h2) {
    font-size: 1.5rem;
    margin: 1.5rem 0 0.75rem;
  }

  :deep(h3) {
    font-size: 1.25rem;
    margin: 1.25rem 0 0.5rem;
  }

  :deep(p) {
    margin: 0.75rem 0;
  }

  :deep(ul),
  :deep(ol) {
    margin: 0.75rem 0;
    padding-left: 1.5rem;
  }

  :deep(a) {
    color: #3b82f6;
  }

  :deep(img) {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
    margin: 1rem 0;
  }
}

.sidebar-card {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

  h3 {
    margin: 0 0 1rem;
    font-size: 0.875rem;
    text-transform: uppercase;
    color: #64748b;
    letter-spacing: 0.05em;
  }
}

.image-upload {
  border: 2px dashed #e2e8f0;
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 0.75rem;

  &:hover {
    border-color: #3b82f6;
    background: #eff6ff;
  }

  &--has-image {
    padding: 0;
    border-style: solid;

    img {
      width: 100%;
      height: auto;
      border-radius: 6px;
    }
  }

  &__placeholder {
    span {
      font-size: 2rem;
      display: block;
      margin-bottom: 0.5rem;
    }

    p {
      margin: 0;
      color: #64748b;
      font-size: 0.875rem;
    }
  }
}

.tags-input {
  .tags-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .tag {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.5rem;
    background: #eff6ff;
    color: #3b82f6;
    border-radius: 4px;
    font-size: 0.75rem;

    button {
      border: none;
      background: none;
      cursor: pointer;
      padding: 0;
      color: inherit;
      font-size: 1rem;
      line-height: 1;

      &:hover {
        color: #dc2626;
      }
    }
  }

  input {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    font-size: 0.875rem;

    &:focus {
      outline: none;
      border-color: #3b82f6;
    }
  }
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &--primary {
    background: #3b82f6;
    color: white;

    &:hover:not(:disabled) {
      background: #2563eb;
    }
  }

  &--secondary {
    background: #f1f5f9;
    color: #475569;

    &:hover:not(:disabled) {
      background: #e2e8f0;
    }
  }

  &--ghost {
    background: transparent;
    color: #64748b;

    &:hover {
      background: #f1f5f9;
    }
  }

  &--small {
    padding: 0.375rem 0.75rem;
    font-size: 0.75rem;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.upload-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.upload-modal {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  text-align: center;

  p {
    margin: 1rem 0 0;
    color: #64748b;
  }
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e2e8f0;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
