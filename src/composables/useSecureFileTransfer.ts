import { ref } from 'vue'

interface SecureFileTransferOptions {
  apiBase: string
  appointmentId: string
  callFrame: any
}

interface SecureFile {
  key: string
  displayName: string
  size: number
  url: string
  expiresAt: string
  sha256: string
}

export function useSecureFileTransfer(opts: SecureFileTransferOptions) {
  const uploading = ref(false)
  const uploadProgress = ref(0)
  const error = ref<string | null>(null)

  // Generate SHA-256 and MD5 hashes
  async function hashAndMd5(file: File) {
    const buf = await file.arrayBuffer()
    
    // SHA-256 for integrity verification
    const sha256Buf = await crypto.subtle.digest("SHA-256", buf)
    const sha256 = [...new Uint8Array(sha256Buf)]
      .map(b => b.toString(16).padStart(2, "0"))
      .join("")
    
    // MD5 for S3 Content-MD5 header
    const md5Buf = await crypto.subtle.digest("MD5", buf)  
    const b64md5 = btoa(String.fromCharCode(...new Uint8Array(md5Buf)))
    
    return { sha256, b64md5 }
  }

  // Get auth token from storage
  function getAuthToken(): string {
    return localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken") || ""
  }

  // Send large file via S3 presigned URLs
  async function sendLargeFile(file: File, recipient: string = "*"): Promise<SecureFile> {
    if (!opts.appointmentId) {
      throw new Error("No appointment ID provided")
    }

    if (!opts.callFrame) {
      throw new Error("No call frame available")
    }

    error.value = null
    uploading.value = true
    uploadProgress.value = 0

    try {
      // Generate file hashes
      uploadProgress.value = 10
      const { sha256, b64md5 } = await hashAndMd5(file)

      // Request presigned upload URL
      uploadProgress.value = 20
      const presignRes = await fetch(`${opts.apiBase}/api/files/presign/upload`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-file-content-md5": b64md5,
          "Authorization": `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          appointmentId: opts.appointmentId,
          originalFileName: file.name,
          size: file.size,
          contentType: file.type || "application/octet-stream",
          sha256
        })
      })

      if (!presignRes.ok) {
        const errorData = await presignRes.json().catch(() => ({}))
        throw new Error(errorData.message || `Presign failed: ${presignRes.status}`)
      }

      const presignData = await presignRes.json()
      if (!presignData?.success) {
        throw new Error(presignData?.message || "Presign request failed")
      }

      const { putUrl, displayName, key, expiresAt } = presignData.data

      // Upload to S3
      uploadProgress.value = 40
      const putResp = await fetch(putUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
          "Content-MD5": b64md5,
          "x-amz-server-side-encryption": "aws:kms"
        },
        body: file
      })

      if (!putResp.ok) {
        throw new Error(`S3 upload failed: ${putResp.status} ${putResp.statusText}`)
      }

      uploadProgress.value = 70

      // Get presigned download URL
      const dlRes = await fetch(
        `${opts.apiBase}/api/files/presign/download?` + 
        new URLSearchParams({
          appointmentId: opts.appointmentId,
          key: key,
          name: displayName
        }), 
        {
          headers: { 
            "Authorization": `Bearer ${getAuthToken()}` 
          }
        }
      )

      if (!dlRes.ok) {
        const errorData = await dlRes.json().catch(() => ({}))
        throw new Error(errorData.message || `Download presign failed: ${dlRes.status}`)
      }

      const dlData = await dlRes.json()
      if (!dlData?.success) {
        throw new Error(dlData?.message || "Download presign failed")
      }

      const { getUrl } = dlData.data

      uploadProgress.value = 90

      // Share metadata over Daily app message
      const fileMetadata = {
        t: "secure-file-meta",
        key,
        displayName,
        size: file.size,
        sha256,
        url: getUrl,
        expiresAt,
        senderId: "doctor", // Will be enhanced with actual user ID
        timestamp: Date.now()
      }

      opts.callFrame.sendAppMessage(fileMetadata, recipient)

      uploadProgress.value = 100

      console.log('✅ Secure file uploaded and shared:', displayName)

      return {
        key,
        displayName,
        size: file.size,
        url: getUrl,
        expiresAt,
        sha256
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      console.error('❌ Secure file upload failed:', errorMessage)
      error.value = errorMessage
      throw err
    } finally {
      uploading.value = false
      uploadProgress.value = 0
    }
  }

  // Delete file early (before 24h lifecycle)
  async function deleteSecureFile(key: string): Promise<void> {
    try {
      const deleteRes = await fetch(`${opts.apiBase}/api/files`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          appointmentId: opts.appointmentId,
          key
        })
      })

      if (!deleteRes.ok) {
        const errorData = await deleteRes.json().catch(() => ({}))
        throw new Error(errorData.message || `Delete failed: ${deleteRes.status}`)
      }

      console.log('🗑️ Secure file deleted:', key.split('/').pop())
    } catch (err) {
      console.error('❌ Secure file delete failed:', err)
      throw err
    }
  }

  // Check if secure file transfer is available
  async function checkAvailability(): Promise<boolean> {
    try {
      const healthRes = await fetch(`${opts.apiBase}/api/files/health`)
      if (!healthRes.ok) return false
      
      const healthData = await healthRes.json()
      return healthData.success && healthData.bigFilesEnabled
    } catch {
      return false
    }
  }

  return {
    // State
    uploading,
    uploadProgress,
    error,

    // Methods
    sendLargeFile,
    deleteSecureFile,
    checkAvailability
  }
}





