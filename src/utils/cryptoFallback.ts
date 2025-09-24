/**
 * Client-side E2E Encryption for Fallback File Transfer
 * Uses ephemeral ECDH key exchange and AES-GCM encryption
 * Compliant with BG/DE privacy regulations
 */

// Types
export interface EncryptedFile {
  cipher: Uint8Array
  iv: Uint8Array
  meta: {
    name: string
    mime: string
    size: number
  }
}

export interface KeyPair {
  publicKey: CryptoKey
  privateKey: CryptoKey
}

// Generate ECDH key pair for ephemeral encryption
export async function generateECDHKeyPair(): Promise<KeyPair> {
  try {
    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'ECDH',
        namedCurve: 'P-256'
      },
      false, // Not extractable for security
      ['deriveKey']
    )

    return {
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey
    }
  } catch (error) {
    console.error('Failed to generate ECDH key pair:', error)
    throw new Error('Key generation failed')
  }
}

// Export public key for sharing
export async function exportPublicKey(publicKey: CryptoKey): Promise<ArrayBuffer> {
  try {
    return await crypto.subtle.exportKey('raw', publicKey)
  } catch (error) {
    console.error('Failed to export public key:', error)
    throw new Error('Key export failed')
  }
}

// Import public key from peer
export async function importPublicKey(keyData: ArrayBuffer): Promise<CryptoKey> {
  try {
    return await crypto.subtle.importKey(
      'raw',
      keyData,
      {
        name: 'ECDH',
        namedCurve: 'P-256'
      },
      false,
      []
    )
  } catch (error) {
    console.error('Failed to import public key:', error)
    throw new Error('Key import failed')
  }
}

// Derive AES-GCM key from ECDH shared secret
export async function deriveAESKey(
  privateKey: CryptoKey,
  publicKey: CryptoKey
): Promise<CryptoKey> {
  try {
    // Derive shared secret
    const sharedSecret = await crypto.subtle.deriveKey(
      {
        name: 'ECDH',
        public: publicKey
      },
      privateKey,
      {
        name: 'AES-GCM',
        length: 256
      },
      false, // Not extractable
      ['encrypt', 'decrypt']
    )

    return sharedSecret
  } catch (error) {
    console.error('Failed to derive AES key:', error)
    throw new Error('Key derivation failed')
  }
}

// Generate random IV for AES-GCM
export function generateIV(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(12)) // 96-bit IV for GCM
}

// Encrypt file with AES-GCM
export async function encryptFile(file: File): Promise<EncryptedFile> {
  try {
    // Generate ephemeral AES key (for single-use encryption)
    const aesKey = await crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256
      },
      false,
      ['encrypt', 'decrypt']
    )

    // Generate random IV
    const iv = generateIV()

    // Read file data
    const fileData = await file.arrayBuffer()

    // Encrypt file
    const cipherBuffer = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: 128 // 128-bit authentication tag
      },
      aesKey,
      fileData
    )

    return {
      cipher: new Uint8Array(cipherBuffer),
      iv: iv,
      meta: {
        name: sanitizeFileName(file.name),
        mime: file.type || 'application/octet-stream',
        size: file.size
      }
    }
  } catch (error) {
    console.error('Failed to encrypt file:', error)
    throw new Error('File encryption failed')
  }
}

// Decrypt file with AES-GCM using derived key
export async function decryptFile(
  encryptedData: Uint8Array,
  iv: Uint8Array,
  aesKey: CryptoKey,
  originalMime: string
): Promise<Blob> {
  try {
    // Decrypt data
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: 128
      },
      aesKey,
      encryptedData
    )

    // Create blob with original MIME type
    return new Blob([decryptedBuffer], { type: originalMime })
  } catch (error) {
    console.error('Failed to decrypt file:', error)
    throw new Error('File decryption failed')
  }
}

// Sanitize filename to remove medical terms and sensitive info
export function sanitizeFileName(filename: string): string {
  // Get file extension
  const lastDotIndex = filename.lastIndexOf('.')
  const extension = lastDotIndex > 0 ? filename.substring(lastDotIndex) : ''
  
  // Generate generic filename with timestamp
  const timestamp = new Date().toISOString().slice(0, 16).replace(/[-:]/g, '')
  return `doc-${timestamp}${extension}`
}

// Convert ArrayBuffer to Base64 for transmission
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

// Convert Base64 to ArrayBuffer
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

// Generate secure random filename for server storage
export function generateSecureFilename(extension: string = ''): string {
  const timestamp = Date.now()
  const randomBytes = crypto.getRandomValues(new Uint8Array(16))
  const randomHex = Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  
  return `${timestamp}-${randomHex}${extension}`
}

// Validate file type for security (allow only specific types)
export function validateFileType(file: File): boolean {
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
  
  return allowedTypes.includes(file.type)
}

// Validate file size
export function validateFileSize(file: File, maxSizeBytes: number = 100 * 1024 * 1024): boolean {
  return file.size <= maxSizeBytes && file.size > 0
}
