/**
 * Fallback API Service for Secure File Transfer
 * Handles encrypted file upload/download via presigned URLs
 * Compliant with BG/DE privacy regulations
 */
import { useDoctorAuth } from '@/composables/useDoctorAuth'

// Types
interface PresignedUploadResponse {
  uploadUrl: string
  objectKey: string
  expiresAt: string
}

interface PresignedDownloadResponse {
  downloadUrl: string
  expiresAt: string
}

interface ApiError {
  message: string
  code?: string
}

// Configuration
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3030'

// Get auth headers
function getAuthHeaders(): Record<string, string> {
  const { makeAuthenticatedRequest } = useDoctorAuth()
  
  // Get the token from the doctor auth system
  const token = localStorage.getItem('doctor_access_token')
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }
  
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  
  return headers
}

// Create presigned upload URL
export async function createPresignedUpload(meetingId: string): Promise<PresignedUploadResponse> {
  try {
    const { makeAuthenticatedRequest } = useDoctorAuth()
    
    const data = await makeAuthenticatedRequest('/api/fallback/presign-upload', {
      method: 'POST',
      body: JSON.stringify({
        meetingId,
        // Additional metadata for audit logging
        timestamp: Date.now(),
        userType: 'doctor'
      })
    }) as any
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to create presigned upload URL')
    }

    return {
      uploadUrl: data.data.uploadUrl,
      objectKey: data.data.objectKey,
      expiresAt: data.data.expiresAt
    }
  } catch (error) {
    console.error('Failed to create presigned upload URL:', error)
    throw error instanceof Error ? error : new Error('Unknown error occurred')
  }
}

// Create presigned download URL
export async function createPresignedDownload(objectKey: string): Promise<PresignedDownloadResponse> {
  try {
    const { makeAuthenticatedRequest } = useDoctorAuth()
    
    const data = await makeAuthenticatedRequest('/api/fallback/presign-download', {
      method: 'POST',
      body: JSON.stringify({
        objectKey
      })
    }) as any
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to create presigned download URL')
    }

    return {
      downloadUrl: data.data.downloadUrl,
      expiresAt: data.data.expiresAt
    }
  } catch (error) {
    console.error('Failed to create presigned download URL:', error)
    throw error instanceof Error ? error : new Error('Unknown error occurred')
  }
}

// Upload encrypted file to S3 via presigned URL
export async function uploadEncryptedFile(
  uploadUrl: string,
  encryptedData: Uint8Array,
  contentType: string = 'application/octet-stream'
): Promise<void> {
  try {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        'x-amz-server-side-encryption': 'AES256'
      },
      body: encryptedData
    })

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status} ${response.statusText}`)
    }
  } catch (error) {
    console.error('Failed to upload encrypted file:', error)
    throw error instanceof Error ? error : new Error('Upload failed')
  }
}

// Download encrypted file from S3 via presigned URL
export async function downloadEncryptedFile(downloadUrl: string): Promise<ArrayBuffer> {
  try {
    const response = await fetch(downloadUrl, {
      method: 'GET'
    })

    if (!response.ok) {
      throw new Error(`Download failed: ${response.status} ${response.statusText}`)
    }

    return await response.arrayBuffer()
  } catch (error) {
    console.error('Failed to download encrypted file:', error)
    throw error instanceof Error ? error : new Error('Download failed')
  }
}

// Log file transfer audit event
export async function logFileTransfer(
  meetingId: string,
  senderId: string,
  receiverId: string,
  fileName: string,
  fileSize: number,
  status: 'sent' | 'received' | 'failed'
): Promise<void> {
  try {
    const { makeAuthenticatedRequest } = useDoctorAuth()
    
    const response = await makeAuthenticatedRequest('/api/audit/file-transfer', {
      method: 'POST',
      body: JSON.stringify({
        meetingId,
        senderId,
        receiverId,
        fileName: sanitizeFileName(fileName), // Remove medical terms
        fileSize,
        status,
        timestamp: Date.now()
      })
    })

    console.log('Audit log response:', response)
  } catch (error) {
    console.warn('Failed to log file transfer audit:', error)
    // Don't throw error - audit logging is best-effort
  }
}

// Sanitize filename for audit logging (remove medical terms)
function sanitizeFileName(fileName: string): string {
  // Get file extension
  const lastDotIndex = fileName.lastIndexOf('.')
  const extension = lastDotIndex > 0 ? fileName.substring(lastDotIndex) : ''
  
  // Replace with generic name
  return `document${extension}`
}

// Check if fallback API is available
export async function checkFallbackAvailability(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/api/fallback/health`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      return false
    }

    const data = await response.json() as any
    return data.success && data.available
  } catch (error) {
    console.warn('Failed to check fallback availability:', error)
    return false
  }
}

// Validate meeting access before file operations
export async function validateMeetingAccess(meetingId: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/api/fallback/validate-meeting`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        meetingId
      })
    })

    if (!response.ok) {
      return false
    }

    const data = await response.json() as any
    return data.success && data.hasAccess
  } catch (error) {
    console.warn('Failed to validate meeting access:', error)
    return false
  }
}
