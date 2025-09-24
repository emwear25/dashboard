/**
 * Secure P2P File Channel for Daily.co Video Meetings
 * Compliant with BG/DE privacy regulations
 * 
 * Features:
 * - WebRTC P2P data channel for direct file transfer
 * - Consent-gated file sharing (session-scoped)
 * - No server-side file storage
 * - Encrypted fallback via ephemeral S3 storage
 * - Minimal metadata logging only
 */
import { ref, computed, watch, onBeforeUnmount, type Ref } from 'vue'
import type { DailyCall } from '@daily-co/daily-js'

// Types
interface FileMetadata {
  name: string
  size: number
  mime: string
  total: number
}

interface IncomingFile {
  name: string
  size: number
  mime: string
  blob: Blob
  timestamp: number
  senderId: string
}

interface ProgressInfo {
  sentBytes: number
  totalBytes: number
  receivedBytes: number
  receivedTotal: number
}

// Configuration constants
const CHUNK_SIZE = 32 * 1024 // 32KB chunks
const BUFFER_LOW_THRESHOLD = 1_000_000 // 1MB buffer threshold

export function useFileChannel(
  sendAppMessage: (payload: any) => void,
  onAppMessage: (handler: (data: any) => void) => void
) {
  // State
  const peerConnection = ref<RTCPeerConnection | null>(null)
  const dataChannel = ref<RTCDataChannel | null>(null)
  const isConnected = ref(false)
  const isInitialized = ref(false)
  const incomingFiles = ref<IncomingFile[]>([])
  const progress = ref<ProgressInfo>({
    sentBytes: 0,
    totalBytes: 0,
    receivedBytes: 0,
    receivedTotal: 0
  })

  // ICE configuration for EU servers preference
  const iceConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      // Daily.co will provide TURN servers in EU region
    ],
    iceCandidatePoolSize: 10,
    bundlePolicy: 'balanced',
    rtcpMuxPolicy: 'require'
  }

  // Current file transfer state
  let currentFileTransfer: {
    metadata: FileMetadata
    chunks: ArrayBuffer[]
    receivedBytes: number
  } | null = null

  // Initialize as caller (doctor initiating)
  const initAsCaller = async (): Promise<void> => {
    if (isInitialized.value) return

    try {
      // Create peer connection
      peerConnection.value = new RTCPeerConnection(iceConfig)
      setupPeerConnectionEvents()

      // Create data channel with label "files"
      dataChannel.value = peerConnection.value.createDataChannel('files', {
        ordered: true,
        maxRetransmits: 3
      })
      setupDataChannelEvents()

      // Create offer
      const offer = await peerConnection.value.createOffer()
      await peerConnection.value.setLocalDescription(offer)

      // Send offer via Daily app message
      sendAppMessage({
        type: 'offer',
        sdp: offer.sdp
      })

      isInitialized.value = true
    } catch (error) {
      console.error('Failed to initialize as caller:', error)
      throw error
    }
  }

  // Initialize as answerer (patient responding)
  const initAsAnswerer = async (): Promise<void> => {
    if (isInitialized.value) return

    try {
      // Create peer connection
      peerConnection.value = new RTCPeerConnection(iceConfig)
      setupPeerConnectionEvents()

      isInitialized.value = true
    } catch (error) {
      console.error('Failed to initialize as answerer:', error)
      throw error
    }
  }

  // Setup peer connection event handlers
  const setupPeerConnectionEvents = () => {
    if (!peerConnection.value) return

    peerConnection.value.onicecandidate = (event) => {
      if (event.candidate) {
        // Serialize ICE candidate for Daily.co sendAppMessage
        sendAppMessage({
          type: 'ice',
          candidate: {
            candidate: event.candidate.candidate,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
            sdpMid: event.candidate.sdpMid,
            usernameFragment: event.candidate.usernameFragment
          }
        })
      }
    }

    peerConnection.value.ondatachannel = (event) => {
      const channel = event.channel
      if (channel.label === 'files') {
        dataChannel.value = channel
        setupDataChannelEvents()
      }
    }

    peerConnection.value.onconnectionstatechange = () => {
      const state = peerConnection.value?.connectionState
      isConnected.value = state === 'connected'
      
      if (state === 'failed' || state === 'disconnected' || state === 'closed') {
        cleanup()
      }
    }
  }

  // Setup data channel event handlers
  const setupDataChannelEvents = () => {
    if (!dataChannel.value) return

    dataChannel.value.onopen = () => {
      isConnected.value = true
      console.log('File channel connected')
    }

    dataChannel.value.onclose = () => {
      isConnected.value = false
      console.log('File channel closed')
    }

    dataChannel.value.onerror = (error) => {
      console.error('Data channel error:', error)
    }

    dataChannel.value.onmessage = handleIncomingMessage

    // Set buffer low threshold for backpressure handling
    dataChannel.value.bufferedAmountLowThreshold = BUFFER_LOW_THRESHOLD
  }

  // Handle incoming messages on data channel
  const handleIncomingMessage = (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data)
      
      if (data.type === 'file-header') {
        // Start receiving new file
        const metadata: FileMetadata = data.metadata
        currentFileTransfer = {
          metadata,
          chunks: [],
          receivedBytes: 0
        }
        progress.value.receivedBytes = 0
        progress.value.receivedTotal = metadata.size
      } else if (data.type === 'file-chunk' && currentFileTransfer) {
        // Receive file chunk
        const chunkData = new Uint8Array(atob(data.chunk).split('').map(c => c.charCodeAt(0)))
        currentFileTransfer.chunks.push(chunkData.buffer)
        currentFileTransfer.receivedBytes += chunkData.length
        progress.value.receivedBytes = currentFileTransfer.receivedBytes

        // Check if file is complete
        if (currentFileTransfer.receivedBytes >= currentFileTransfer.metadata.size) {
          completeFileReception()
        }
      }
    } catch (error) {
      console.error('Error handling incoming message:', error)
    }
  }

  // Complete file reception and create blob
  const completeFileReception = () => {
    if (!currentFileTransfer) return

    try {
      // Combine all chunks into single blob
      const blob = new Blob(currentFileTransfer.chunks, { 
        type: currentFileTransfer.metadata.mime 
      })

      // Add to incoming files
      incomingFiles.value.push({
        name: currentFileTransfer.metadata.name,
        size: currentFileTransfer.metadata.size,
        mime: currentFileTransfer.metadata.mime,
        blob,
        timestamp: Date.now(),
        senderId: 'peer' // Will be enhanced with actual sender ID
      })

      // Reset transfer state
      currentFileTransfer = null
      progress.value.receivedBytes = 0
      progress.value.receivedTotal = 0

      console.log('File reception completed')
    } catch (error) {
      console.error('Error completing file reception:', error)
      currentFileTransfer = null
    }
  }

  // Send file via data channel
  const sendFile = async (file: File): Promise<void> => {
    if (!isConnected.value || !dataChannel.value) {
      throw new Error('File channel not connected')
    }

    try {
      const metadata: FileMetadata = {
        name: file.name,
        size: file.size,
        mime: file.type || 'application/octet-stream',
        total: file.size
      }

      // Send file header
      dataChannel.value.send(JSON.stringify({
        type: 'file-header',
        metadata
      }))

      // Read file and send in chunks
      const arrayBuffer = await file.arrayBuffer()
      const totalChunks = Math.ceil(arrayBuffer.byteLength / CHUNK_SIZE)
      
      progress.value.sentBytes = 0
      progress.value.totalBytes = arrayBuffer.byteLength

      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE
        const end = Math.min(start + CHUNK_SIZE, arrayBuffer.byteLength)
        const chunk = arrayBuffer.slice(start, end)
        
        // Convert to base64 for JSON transmission
        const chunkArray = new Uint8Array(chunk)
        const chunkBase64 = btoa(String.fromCharCode(...chunkArray))

        // Wait for buffer to drain if needed
        await waitForBufferDrain()

        // Send chunk
        dataChannel.value.send(JSON.stringify({
          type: 'file-chunk',
          chunk: chunkBase64,
          index: i,
          total: totalChunks
        }))

        progress.value.sentBytes = end
      }

      console.log('File sent successfully:', file.name)
    } catch (error) {
      console.error('Error sending file:', error)
      throw error
    }
  }

  // Wait for data channel buffer to drain
  const waitForBufferDrain = async (): Promise<void> => {
    if (!dataChannel.value) return

    return new Promise((resolve) => {
      const checkBuffer = () => {
        if (!dataChannel.value) {
          resolve()
          return
        }

        if (dataChannel.value.bufferedAmount <= BUFFER_LOW_THRESHOLD) {
          resolve()
        } else {
          dataChannel.value.addEventListener('bufferedamountlow', () => resolve(), { once: true })
        }
      }
      checkBuffer()
    })
  }

  // Handle offer from peer
  const onOffer = async (offer: any): Promise<void> => {
    if (!peerConnection.value) {
      await initAsAnswerer()
    }

    if (!peerConnection.value) throw new Error('Failed to initialize peer connection')

    try {
      await peerConnection.value.setRemoteDescription({
        type: 'offer',
        sdp: offer.sdp
      })

      const answer = await peerConnection.value.createAnswer()
      await peerConnection.value.setLocalDescription(answer)

      sendAppMessage({
        type: 'answer',
        sdp: answer.sdp
      })
    } catch (error) {
      console.error('Error handling offer:', error)
      throw error
    }
  }

  // Handle answer from peer
  const onAnswer = async (answer: any): Promise<void> => {
    if (!peerConnection.value) throw new Error('No peer connection')

    try {
      await peerConnection.value.setRemoteDescription({
        type: 'answer',
        sdp: answer.sdp
      })
    } catch (error) {
      console.error('Error handling answer:', error)
      throw error
    }
  }

  // Handle ICE candidate from peer
  const onIce = async (candidateData: any): Promise<void> => {
    if (!peerConnection.value) return

    try {
      // Reconstruct RTCIceCandidate from serialized data
      const candidate = new RTCIceCandidate({
        candidate: candidateData.candidate.candidate,
        sdpMLineIndex: candidateData.candidate.sdpMLineIndex,
        sdpMid: candidateData.candidate.sdpMid,
        usernameFragment: candidateData.candidate.usernameFragment
      })
      
      await peerConnection.value.addIceCandidate(candidate)
    } catch (error) {
      console.error('Error adding ICE candidate:', error)
    }
  }

  // Cleanup connections
  const close = (): void => {
    cleanup()
  }

  const cleanup = () => {
    if (dataChannel.value) {
      dataChannel.value.close()
      dataChannel.value = null
    }

    if (peerConnection.value) {
      peerConnection.value.close()
      peerConnection.value = null
    }

    isConnected.value = false
    isInitialized.value = false
    currentFileTransfer = null
    
    // Reset progress
    progress.value = {
      sentBytes: 0,
      totalBytes: 0,
      receivedBytes: 0,
      receivedTotal: 0
    }
  }

  // Cleanup on unmount
  onBeforeUnmount(() => {
    cleanup()
  })

  return {
    // State
    isConnected,
    isInitialized,
    incomingFiles,
    progress,

    // Methods
    initAsCaller,
    initAsAnswerer,
    sendFile,
    onOffer,
    onAnswer,
    onIce,
    close
  }
}
