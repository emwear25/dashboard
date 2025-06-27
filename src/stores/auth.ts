import { defineStore } from 'pinia';

const BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:3030';



interface BackendError {
  status: number;
  data: Record<string, unknown>;
}

interface AuthUser {
  userId: string;
  isAdmin?: boolean;
  email: string;
  firstName?: string;
  lastName?: string;
  permission?: string;
  imageUrl?: string;
  phone?: string;
  position?: string;
  userType?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  accessToken: string | null;
  user: AuthUser | null;
  loginBackendError: BackendError;
  isAdmin: boolean;
  isInitialized: boolean;
  isRefreshing: boolean;
}

export const useAuthStore = defineStore('authStore', {
  state: (): AuthState => ({
    isAuthenticated: false,
    accessToken: null,
    user: null,
    loginBackendError: { status: 0, data: {} },
    isAdmin: false,
    isInitialized: false,
    isRefreshing: false,
  }),

  actions: {
    setAccessToken(token: string | null) {
      this.accessToken = token;
      if (token === null) {
        this.isAuthenticated = false;
      }
    },

    async refreshAccessToken() {
      if (this.isRefreshing) return;

      this.isRefreshing = true;

      try {
        // Use the status endpoint which handles token refresh automatically
        const response = await fetch(`${BASE_URL}/auth/status`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Origin': window.location.origin
          }
        });

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            this.setAccessToken(null);
            this.user = null;
          }
          throw new Error('Failed to refresh token');
        }

        const data = await response.json();

        if (!data.isAuthenticated) {
          this.setAccessToken(null);
          this.user = null;
          throw new Error('Not authenticated');
        }

        this.setAccessToken(data.accessToken);
        this.isAuthenticated = true;
        this.user = {
          userId: data.userId,
          isAdmin: data.isAdmin,
          email: data.email || '',
          firstName: data.firstName,
          lastName: data.lastName,
          permission: data.permission,
          imageUrl: data.imageUrl,
          phone: data.phone,
          position: data.position,
          userType: data.userType,
        };

        return data.accessToken;
      } catch (err) {
        console.error('Token refresh failed:', err);
        this.isAuthenticated = false;
        this.user = null;
        throw err;
      } finally {
        this.isRefreshing = false;
      }
    },

    async login(email: string, password: string) {
      this.loginBackendError = { status: 0, data: {} };
      
      try {
        const response = await fetch(`${BASE_URL}/auth/login`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Origin': window.location.origin
          },
          body: JSON.stringify({ email, password })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw { status: response.status, data: errorData };
        }

        const data = await response.json();
        
        this.setAccessToken(data.accessToken);
        this.isAuthenticated = true;
        this.isAdmin = data.isAdmin ?? false;
        this.user = {
          userId: data.userId,
          isAdmin: data.isAdmin,
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          permission: data.permission,
          imageUrl: data.imageUrl,
          phone: data.phone,
          position: data.position,
          userType: data.userType,
        };
   
        return true;
      } catch (err: unknown) {
        console.error(err);
        const error = err as { status?: number; data?: Record<string, unknown> };
        this.loginBackendError = {
          status: error.status || 0,
          data: error.data || {},
        };
        this.isAuthenticated = false;
        this.user = null;
        throw err;
      }
    },

    async checkAuth() {
      try {
        const response = await fetch(`${BASE_URL}/auth/status`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Origin': window.location.origin
          }
        });

        if (!response.ok) {
          console.warn('Auth check failed:', response.status);
          this.setAccessToken(null);
          this.user = null;
          return;
        }

        const data = await response.json();
        console.log('Auth status response:', data);

        if (!data.isAuthenticated) {
          console.log('User is not authenticated');
          this.setAccessToken(null);
          this.user = null;
          return;
        }

        // Ensure we have all required user data
        if (!data.userId || !data.email) {
          console.warn('Incomplete user data received:', data);
          this.setAccessToken(null);
          this.user = null;
          return;
        }

        // Update auth state with complete user data
        this.setAccessToken(data.accessToken);
        this.isAuthenticated = data.isAuthenticated;
        this.isAdmin = data.isAdmin ?? false;
        this.user = {
          userId: data.userId,
          isAdmin: data.isAdmin,
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          permission: data.permission,
          imageUrl: data.imageUrl,
          phone: data.phone,
          position: data.position,
          userType: data.userType,
        };

        console.log('Auth state updated:', {
          isAuthenticated: this.isAuthenticated,
          user: this.user
        });
      } catch (err) {
        console.error('Auth check error:', err);
        this.setAccessToken(null);
        this.user = null;
      } finally {
        this.isInitialized = true;
      }
    },

    async logout() {
      try {
        await fetch(`${BASE_URL}/auth/logout`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Origin': window.location.origin
          }
        });
      } catch (err) {
        console.error('Logout error:', err);
      } finally {
        this.setAccessToken(null);
        this.user = null;
        this.isAdmin = false;
        this.isAuthenticated = false;
      }
    },

    async initialize() {
      if (this.isInitialized) return;
      await this.checkAuth();
    },

    async refreshUserData() {
      try {
        const response = await fetch(`${BASE_URL}/auth/profile`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Origin': window.location.origin,
            'Authorization': `Bearer ${this.accessToken}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch user data');
        }

        const userData = await response.json();
        
        // Update user data in store
        if (this.user) {
          this.user = {
            ...this.user,
            firstName: userData.firstName,
            lastName: userData.lastName,
            imageUrl: userData.imageUrl,
            phone: userData.phone,
            position: userData.position
          };
        }
        
        return userData;
      } catch (err) {
        console.error('Error refreshing user data:', err);
        throw err;
      }
    },
  },
});
