import { ref } from 'vue'
import { useDoctorAuth } from '@/composables/useDoctorAuth'

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

interface CreateDoctorData {
  name: string
  email: string
  password?: string
  specialties: string[]
  bio?: string
  photoUrl?: string
  experience?: number
  isAdmin?: boolean
  isDoctor?: boolean
  countriesOfOperation?: string[]
  languages?: string[]
}

interface UpdateDoctorData {
  name?: string
  email?: string
  password?: string
  specialties?: string[]
  bio?: string
  photoUrl?: string
  experience?: number
  isActive?: boolean
  isAdmin?: boolean
  isDoctor?: boolean
  countriesOfOperation?: string[]
  languages?: string[]
}

export const useDoctorApi = () => {
  const { makeAuthenticatedRequest, requireAdmin } = useDoctorAuth()
  const loading = ref(false)
  const error = ref<string | null>(null)

  const handleRequest = async <T>(requestFn: () => Promise<T>): Promise<T> => {
    loading.value = true
    error.value = null

    try {
      return await requestFn()
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      error.value = errorMessage
      throw err
    } finally {
      loading.value = false
    }
  }

  // Get all doctors
  const getAllDoctors = async (params?: { active?: boolean }): Promise<Doctor[]> => {
    return handleRequest(async () => {
      const queryString = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : ''
      const response = await makeAuthenticatedRequest(`/api/doctors${queryString}`)
      return response.data || response
    })
  }

  // Get doctor by ID
  const getDoctorById = async (id: string): Promise<Doctor> => {
    return handleRequest(async () => {
      const response = await makeAuthenticatedRequest(`/api/doctors/${id}`)
      return response.data || response
    })
  }

  // Create new doctor (admin only)
  const createDoctor = async (data: CreateDoctorData): Promise<Doctor> => {
    requireAdmin()
    return handleRequest(async () => {
      const response = await makeAuthenticatedRequest('/api/doctors', {
        method: 'POST',
        body: JSON.stringify(data),
      })
      return response.data || response
    })
  }

  // Update doctor (admin only)
  const updateDoctor = async (id: string, data: UpdateDoctorData): Promise<Doctor> => {
    requireAdmin()
    return handleRequest(async () => {
      const response = await makeAuthenticatedRequest(`/api/doctors/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      })
      return response.data || response
    })
  }

  // Update own profile (any doctor)
  const updateProfile = async (data: UpdateDoctorData): Promise<Doctor> => {
    return handleRequest(async () => {
      const response = await makeAuthenticatedRequest(`/api/doctors/profile`, {
        method: 'PUT',
        body: JSON.stringify(data),
      })
      return response.data || response
    })
  }

  // Delete doctor (admin only)
  const deleteDoctor = async (id: string): Promise<void> => {
    requireAdmin()
    return handleRequest(async () => {
      await makeAuthenticatedRequest(`/api/doctors/${id}`, {
        method: 'DELETE',
      })
    })
  }

  return {
    // State
    loading,
    error,

    // Actions
    getAllDoctors,
    getDoctorById,
    createDoctor,
    updateDoctor,
    updateProfile,
    deleteDoctor,
  }
} 