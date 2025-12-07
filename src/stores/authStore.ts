import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { apiPost, apiGet } from "@/utils/api";

interface AdminUser {
  email: string;
  role: string;
}

export const useAuthStore = defineStore("auth", () => {
  const token = ref<string | null>(localStorage.getItem("admin_token") || null);
  const user = ref<AdminUser | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const isAuthenticated = computed(() => {
    return !!token.value && !!user.value;
  });

  // Login
  const login = async (email: string, password: string) => {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await apiPost<{
        success: boolean;
        message: string;
        data: {
          token: string;
          user: AdminUser;
        };
      }>("/admin/auth/login", {
        email,
        password,
      });

      if (response && response.success && response.data) {
        token.value = response.data.token;
        user.value = response.data.user;
        localStorage.setItem("admin_token", response.data.token);
        return { success: true };
      } else {
        error.value = response?.message || "Login failed";
        return { success: false, error: error.value };
      }
    } catch (err: any) {
      error.value =
        err?.response?.message || err?.message || "Failed to login. Please try again.";
      return { success: false, error: error.value };
    } finally {
      isLoading.value = false;
    }
  };

  // Verify token
  const verifyToken = async () => {
    if (!token.value) {
      return false;
    }

    try {
      const response = await apiGet<{
        success: boolean;
        data: {
          user: AdminUser;
        };
      }>("/admin/auth/verify");

      if (response && response.success && response.data) {
        user.value = response.data.user;
        return true;
      } else {
        // Token invalid, clear it
        logout();
        return false;
      }
    } catch (err) {
      // Token invalid or expired
      logout();
      return false;
    }
  };

  // Logout
  const logout = () => {
    token.value = null;
    user.value = null;
    localStorage.removeItem("admin_token");
  };

  // Initialize - check if token exists and verify it
  const init = async () => {
    if (token.value) {
      await verifyToken();
    }
  };

  return {
    token,
    user,
    isLoading,
    error,
    isAuthenticated,
    login,
    logout,
    verifyToken,
    init,
  };
});


