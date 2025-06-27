import { useAuthStore } from "../stores/auth";
import { useRouter } from "vue-router";
import type { App } from 'vue';


interface FetchError extends Error {
  status?: number;
  statusCode?: number;
  statusText?: string;
  data?: unknown;
}

// Create a custom fetch function
export const createCustomFetch = () => {
  const authStore = useAuthStore();
  const router = useRouter();
  const baseUrl = import.meta.env.VITE_BASE_URL; // Use environment variable

  return async <T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> => {
    const url = endpoint.startsWith('http') 
      ? endpoint 
      : `${baseUrl}${endpoint}`;

    // Only set default headers if we're not sending FormData
    const headers: Record<string, string> = {};
    
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    // Add any custom headers from options
    if (options.headers) {
      Object.assign(headers, options.headers);
    }

    // Add auth token if available
    if (authStore.accessToken) {
      headers.Authorization = `Bearer ${authStore.accessToken}`;
    }

    const fetchOptions = {
      ...options,
      credentials: 'include' as const,
      headers,
    };

    try {
      let response = await fetch(url, fetchOptions);
      
      // If we get a 401, try to refresh the token
      if (response.status === 401 && endpoint !== '/auth/refresh') {
        try {
          await authStore.refreshAccessToken();
          
          // Update headers with new token
          headers.Authorization = `Bearer ${authStore.accessToken}`;

          // Retry the original request with new token
          response = await fetch(url, {
            ...fetchOptions,
            headers,
          });
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          authStore.isAuthenticated = false;
          router.push('/login');
          throw refreshError;
        }
      }

      if (!response.ok) {
        const errorData = await response.json();
        console.log('Server error response:', errorData);
        
        const error = new Error(errorData.message || 'API Error') as FetchError;
        error.status = response.status;
        error.data = errorData;
        error.statusText = response.statusText;
        
        if (response.status === 401) {
          authStore.isAuthenticated = false;
          router.push('/login');
        }
        throw error;
      }
      
      return response.json();
    } catch (error) {
      console.error('Fetch error details:', {
        error,
        status: (error as FetchError).status,
        data: (error as FetchError).data
      });
      throw error;
    }
  };
};

// Create plugin with provide/inject
export const apiPlugin = {
  install: (app: App) => {
    const customFetch = createCustomFetch();
    app.provide('api', customFetch);
    app.config.globalProperties.$api = customFetch;
  }
};
