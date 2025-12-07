<template>
  <div class="login-view">
    <div class="login-container">
      <div class="login-header">
        <h1 class="login-title">Emwear Dashboard</h1>
        <p class="login-subtitle">Влезте в административния панел</p>
      </div>

      <form @submit.prevent="handleLogin" class="login-form">
        <div v-if="error" class="error-message">{{ error }}</div>

        <div class="form-group">
          <label for="email" class="form-label">Имейл</label>
          <input
            id="email"
            v-model="email"
            type="email"
            class="form-input"
            placeholder="info@emwear.bg"
            required
            autocomplete="email"
            :disabled="isLoading"
          />
        </div>

        <div class="form-group">
          <label for="password" class="form-label">Парола</label>
          <input
            id="password"
            v-model="password"
            type="password"
            class="form-input"
            placeholder="Въведете парола"
            required
            autocomplete="current-password"
            :disabled="isLoading"
          />
        </div>

        <button type="submit" class="login-button" :disabled="isLoading || !email || !password">
          <span v-if="!isLoading">Влез</span>
          <span v-else>Влизане...</span>
        </button>
      </form>

      <div class="login-footer">
        <p class="security-note">🔒 Всички данни са защитени и криптирани</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/authStore";

const router = useRouter();
const authStore = useAuthStore();

const email = ref("");
const password = ref("");
const error = ref<string | null>(null);

const isLoading = computed(() => authStore.isLoading);

const handleLogin = async () => {
  error.value = null;

  if (!email.value || !password.value) {
    error.value = "Моля въведете имейл и парола";
    return;
  }

  const result = await authStore.login(email.value, password.value);

  if (result.success) {
    // Redirect to dashboard
    router.push("/dashboard");
  } else {
    error.value = result.error || "Грешка при влизане";
  }
};
</script>

<style scoped lang="scss">
.login-view {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
}

.login-container {
  width: 100%;
  max-width: 420px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  padding: 3rem 2.5rem;
}

.login-header {
  text-align: center;
  margin-bottom: 2.5rem;
}

.login-title {
  font-size: 2rem;
  font-weight: 700;
  color: #1a202c;
  margin: 0 0 0.5rem 0;
}

.login-subtitle {
  font-size: 1rem;
  color: #718096;
  margin: 0;
}

.login-form {
  .error-message {
    background: #fed7d7;
    color: #c53030;
    padding: 0.75rem 1rem;
    border-radius: 8px;
    margin-bottom: 1.5rem;
    font-size: 0.875rem;
    border: 1px solid #fc8181;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  .form-label {
    display: block;
    font-size: 0.875rem;
    font-weight: 600;
    color: #2d3748;
    margin-bottom: 0.5rem;
  }

  .form-input {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    font-size: 1rem;
    transition: all 0.2s;
    box-sizing: border-box;

    &:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    &:disabled {
      background: #f7fafc;
      cursor: not-allowed;
    }

    &::placeholder {
      color: #a0aec0;
    }
  }

  .login-button {
    width: 100%;
    padding: 0.875rem 1.5rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    margin-top: 0.5rem;

    &:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
    }

    &:active:not(:disabled) {
      transform: translateY(0);
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }
}

.login-footer {
  margin-top: 2rem;
  text-align: center;
}

.security-note {
  font-size: 0.875rem;
  color: #718096;
  margin: 0;
}
</style>

