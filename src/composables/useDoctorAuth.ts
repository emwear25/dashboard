import { ref, computed } from 'vue'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3030'

interface Doctor {
  _id: string
  name: string
  email: string
  specialties: string[]
  bio: string
  photoUrl: string
  experience?: number
  isActive: boolean
  isDoctor: boolean
  isAdmin: boolean
  countriesOfOperation?: string[]
  languages?: string[]
  createdAt: string
  updatedAt: string
}

interface AuthState {
  doctor: Doctor | null
  accessToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

// Global state
const state = ref<AuthState>({
  doctor: null,
  accessToken: localStorage.getItem('doctor_access_token'),
  isAuthenticated: false,
  isLoading: false,
  error: null,
})

export const useDoctorAuth = () => {
  // Computed properties
  const isAuthenticated = computed(() => state.value.isAuthenticated)
  const doctor = computed(() => state.value.doctor)
  const isDoctor = computed(() => state.value.doctor?.isDoctor || false)
  const isAdmin = computed(() => state.value.doctor?.isAdmin || false)
  const isLoading = computed(() => state.value.isLoading)
  const error = computed(() => state.value.error)

  // Refresh access token
  const refreshAccessToken = async (): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/doctor-auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      })

      if (!response.ok) {
        return false
      }

      const data = await response.json()
      if (data.accessToken) {
        state.value.accessToken = data.accessToken
        state.value.doctor = data.doctor
        state.value.isAuthenticated = true
        localStorage.setItem('doctor_access_token', data.accessToken)
        return true
      }

      return false
    } catch (err) {
      console.error('Token refresh failed:', err)
      return false
    }
  }

  // Helper function to make authenticated requests
  const makeAuthenticatedRequest = async (endpoint: string, options: RequestInit = {}) => {
    const makeRequest = async (token: string) => {
      const headers: Record<string, string> = {
        ...(options.headers as Record<string, string>),
      }

      // Only set Content-Type if not uploading FormData
      if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json'
      }

      if (token) {
        headers.Authorization = `Bearer ${token}`
      }

      return fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        credentials: 'include',
        headers,
      })
    }

    if (!state.value.accessToken) {
      // Try to refresh token first
      const refreshed = await refreshAccessToken()
      if (!refreshed || !state.value.accessToken) {
        throw new Error('No access token')
      }
    }

    let response = await makeRequest(state.value.accessToken)

    // If 401, try to refresh token and retry once
    if (response.status === 401) {
      console.log('🔄 Token expired, refreshing...')
      const refreshed = await refreshAccessToken()
      if (refreshed && state.value.accessToken) {
        console.log('✅ Token refreshed, retrying request...')
        response = await makeRequest(state.value.accessToken)
      } else {
        console.error('❌ Token refresh failed, redirecting to login...')
        clearAuth()
        window.location.href = '/login'
        throw new Error('Session expired')
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
      throw new Error(errorData.message || `HTTP ${response.status}`)
    }

    return response.json()
  }

  // Clear all auth state
  const clearAuth = () => {
    state.value.doctor = null
    state.value.accessToken = null
    state.value.isAuthenticated = false
    state.value.error = null
    localStorage.removeItem('doctor_access_token')
  }

  // Set authentication state
  const setAuth = (doctor: Doctor, accessToken: string) => {
    state.value.doctor = doctor
    state.value.accessToken = accessToken
    state.value.isAuthenticated = true
    localStorage.setItem('doctor_access_token', accessToken)
  }

  // Login function
  const login = async (email: string, password: string) => {
    state.value.isLoading = true
    state.value.error = null

    try {
      const response = await fetch(`${API_BASE_URL}/api/doctor-auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Login failed')
      }

      const data = await response.json()
      setAuth(data.doctor, data.accessToken)
      
      return true
    } catch (err: unknown) {
      const error = err as Error
      state.value.error = error.message
      clearAuth()
      throw error
    } finally {
      state.value.isLoading = false
    }
  }

  // Logout function
  const logout = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/doctor-auth/logout`, {
        method: 'POST',
        credentials: 'include',
      })
    } catch (err) {
      console.warn('Logout request failed:', err)
    } finally {
      clearAuth()
      // Navigate to login page
      window.location.href = '/login'
    }
  }

  // Get current doctor info
  const getCurrentDoctor = async () => {
    if (!state.value.accessToken) {
      return null
    }

    try {
      const data = await makeAuthenticatedRequest('/api/doctor-auth/me')
      state.value.doctor = data.doctor
      state.value.isAuthenticated = true
      return data.doctor
    } catch (err: unknown) {
      console.error('Failed to get current doctor:', err)
      clearAuth()
      return null
    }
  }

  // Initialize authentication state
  const initialize = async () => {
    state.value.isLoading = true
    try {
      // Try to get current doctor with existing token
      if (state.value.accessToken) {
        try {
          const doctor = await getCurrentDoctor()
          if (doctor) {
            return true
          }
        } catch (err) {
          console.log('Existing token invalid, trying to refresh...', err)
        }
      }

      // Try to refresh token
      const refreshed = await refreshAccessToken()
      if (refreshed) {
        const doctor = await getCurrentDoctor()
        return !!doctor
      }

      clearAuth()
      return false
    } catch (err) {
      console.error('Auth initialization failed:', err)
      clearAuth()
      return false
    } finally {
      state.value.isLoading = false
    }
  }

  // Check if current user has admin privileges
  const requireAdmin = () => {
    if (!isAuthenticated.value) {
      window.location.href = '/login'
      return false
    }

    if (!isAdmin.value) {
      throw new Error('Admin access required')
    }

    return true
  }

  return {
    // State
    doctor,
    isAuthenticated,
    isDoctor,
    isAdmin,
    isLoading,
    error,

    // Actions
    login,
    logout,
    getCurrentDoctor,
    initialize,
    requireAdmin,
    makeAuthenticatedRequest,
    clearAuth,
  }
} 