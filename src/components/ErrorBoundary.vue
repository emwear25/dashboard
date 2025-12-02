<template>
  <div v-if="error" class="error-boundary">
    <div class="error-boundary__container">
      <div class="error-boundary__icon">⚠️</div>
      <h2 class="error-boundary__title">Възникна грешка</h2>
      <p class="error-boundary__message">
        Извиняваме се за неудобството. Възникна неочаквана грешка в приложението.
      </p>
      <div v-if="errorInfo" class="error-boundary__details">
        <details>
          <summary>Детайли за грешката</summary>
          <pre class="error-boundary__error">{{ error }}</pre>
          <pre v-if="errorInfo.componentStack" class="error-boundary__stack">
{{ errorInfo.componentStack }}
          </pre>
        </details>
      </div>
      <div class="error-boundary__actions">
        <button @click="handleReset" class="error-boundary__button">
          Опитай отново
        </button>
        <button @click="goHome" class="error-boundary__button error-boundary__button--secondary">
          Начало
        </button>
      </div>
    </div>
  </div>
  <slot v-else />
</template>

<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue'
import { useRouter } from 'vue-router'

interface ErrorInfo {
  componentStack?: string
  errorBoundary?: boolean
}

const error = ref<Error | null>(null)
const errorInfo = ref<ErrorInfo | null>(null)
const router = useRouter()

// Capture errors from child components
onErrorCaptured((err: Error, instance, info) => {
  error.value = err
  errorInfo.value = {
    componentStack: info,
    errorBoundary: true,
  }

  // Log error for debugging
  console.error('ErrorBoundary caught an error:', err, info)

  // Return false to prevent error from propagating
  return false
})

const handleReset = () => {
  error.value = null
  errorInfo.value = null
  // Force component to re-render
  window.location.reload()
}

const goHome = () => {
  router.push('/dashboard')
}
</script>

<style scoped lang="scss">
.error-boundary {
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: hsl(var(--background));

  &__container {
    max-width: 600px;
    text-align: center;
    padding: 2rem;
    border: 2px solid hsl(var(--destructive));
    border-radius: 8px;
    background: hsl(var(--card));
  }

  &__icon {
    font-size: 4rem;
    margin-bottom: 1rem;
  }

  &__title {
    font-size: 1.5rem;
    font-weight: 700;
    color: hsl(var(--foreground));
    margin-bottom: 1rem;
  }

  &__message {
    font-size: 1rem;
    color: hsl(var(--muted-foreground));
    margin-bottom: 1.5rem;
    line-height: 1.6;
  }

  &__details {
    margin: 1.5rem 0;
    text-align: left;

    details {
      cursor: pointer;
      padding: 1rem;
      background: hsl(var(--muted));
      border-radius: 4px;

      summary {
        font-weight: 600;
        color: hsl(var(--foreground));
        margin-bottom: 0.5rem;

        &:hover {
          color: hsl(var(--destructive));
        }
      }
    }
  }

  &__error,
  &__stack {
    font-size: 0.875rem;
    color: hsl(var(--destructive));
    background: hsl(var(--background));
    padding: 1rem;
    border-radius: 4px;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-word;
    max-height: 300px;
    overflow-y: auto;
  }

  &__actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
    margin-top: 2rem;
  }

  &__button {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    background: hsl(var(--primary));
    color: hsl(var(--primary-foreground));

    &:hover {
      opacity: 0.9;
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    }

    &:active {
      transform: translateY(0);
    }

    &--secondary {
      background: hsl(var(--secondary));
      color: hsl(var(--secondary-foreground));

      &:hover {
        opacity: 0.9;
      }
    }
  }
}
</style>

