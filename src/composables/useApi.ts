import { ref } from 'vue'
import { useDoctorAuth } from '@/composables/useDoctorAuth'

interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
  errors?: any[]
  pagination?: {
    total: number
    page: number
    limit: number
    pages: number
  }
}

interface ApiError {
  message: string
  status?: number
  errors?: any[]
}

export const useApi = () => {
  const { makeAuthenticatedRequest } = useDoctorAuth()
  const loading = ref(false)
  const error = ref<ApiError | null>(null)

  const makeRequest = async <T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> => {
    loading.value = true
    error.value = null

    try {
      const response = await makeAuthenticatedRequest<ApiResponse<T>>(endpoint, options)
      return response.data || response
    } catch (err: any) {
      const apiError: ApiError = {
        message: err.message || 'Network error',
        status: err.status,
        errors: err.errors,
      }
      error.value = apiError
      throw apiError
    } finally {
      loading.value = false
    }
  }

  // --- Doctor API ---
  const doctors = {
    getAll: (params?: { active?: boolean }) => {
      const queryString = params ? `?${new URLSearchParams(params as any).toString()}` : ''
      return makeRequest<any[]>(`/api/doctors${queryString}`)
    },

    getById: (id: string) => makeRequest<any>(`/api/doctors/${id}`),

    create: (data: {
      name: string
      email: string
      specialties: string[]
      plansOffered: string[]
      bio?: string
      experience?: number
    }) => makeRequest<any>('/api/doctors', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

    update: (id: string, data: Partial<{
      name: string
      email: string
      specialties: string[]
      plansOffered: string[]
      bio: string
      experience: number
      isActive: boolean
    }>) => makeRequest<any>(`/api/doctors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

    delete: (id: string) => makeRequest<any>(`/api/doctors/${id}`, {
      method: 'DELETE',
    }),
  }

  // --- Availability API ---
  const availability = {
    getAll: (params?: {
      doctorId?: string
      date?: string
      startDate?: string
      endDate?: string
    }) => {
      const queryString = params ? `?${new URLSearchParams(params as any).toString()}` : ''
      return makeRequest<any[]>(`/api/availability${queryString}`)
    },

    getDoctorAvailability: (params?: {
      date?: string
      startDate?: string
      endDate?: string
    }) => {
      const queryString = params ? `?${new URLSearchParams(params as any).toString()}` : ''
      return makeRequest<any[]>(`/api/availability/doctor${queryString}`)
    },

    getById: (id: string) => makeRequest<any>(`/api/availability/${id}`),

    create: (data: {
      date: string
      slots: string[]
    }) => makeRequest<any>('/api/availability', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

    update: (id: string, data: {
      slots?: string[]
      isActive?: boolean
    }) => makeRequest<any>(`/api/availability/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

    delete: (id: string) => makeRequest<any>(`/api/availability/${id}`, {
      method: 'DELETE',
    }),

    addSlot: (id: string, slot: string) => makeRequest<any>(`/api/availability/${id}/add-slot`, {
      method: 'POST',
      body: JSON.stringify({ slot }),
    }),

    removeSlot: (id: string, slot: string) => makeRequest<any>(`/api/availability/${id}/remove-slot`, {
      method: 'DELETE',
      body: JSON.stringify({ slot }),
    }),
  }

  // --- Appointments API ---
  const appointments = {
    getAll: (params?: {
      status?: string
      doctorId?: string
      patientId?: string
      date?: string
      startDate?: string
      endDate?: string
      limit?: number
      page?: number
    }) => {
      const queryString = params ? `?${new URLSearchParams(params as any).toString()}` : ''
      return makeRequest<{
        data: any[]
        pagination: {
          total: number
          page: number
          limit: number
          pages: number
        }
      }>(`/api/appointments/doctor${queryString}`)
    },

    getById: (id: string) => makeRequest<any>(`/api/appointments/doctor/${id}`),

    create: (data: {
      patientId: string
      doctorId: string
      date: string
      slot: string
      plan: string
      reason?: string
      notes?: string
    }) => makeRequest<any>('/api/appointments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

    confirm: (id: string) => makeRequest<any>(`/api/appointments/${id}/confirm`, {
      method: 'PUT',
    }),

    cancel: (id: string, reason?: string) => makeRequest<any>(`/api/appointments/${id}/cancel`, {
      method: 'PUT',
      body: JSON.stringify({ reason }),
    }),

    complete: (id: string, notes?: string) => makeRequest<any>(`/api/appointments/${id}/complete`, {
      method: 'PUT',
      body: JSON.stringify({ notes }),
    }),

    updateStatus: (id: string, status: string) => makeRequest<any>(`/api/appointments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

    delete: (id: string) => makeRequest<any>(`/api/appointments/${id}`, {
      method: 'DELETE',
    }),
  }

  return {
    loading,
    error,
    makeRequest,
    doctors,
    availability,
    appointments,
  }
}

export type { ApiResponse, ApiError } 