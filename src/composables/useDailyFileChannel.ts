import { ref, onBeforeUnmount, watch } from 'vue';

type IncomingFile = {
  fileId: string;
  name: string;
  type: string;
  size: number;
  totalChunks: number;
  received: number;
  chunks: string[];
  url?: string;
  sha256?: string;
  senderId?: string;
  timestamp: number;
};

type OutgoingFile = {
  fileId: string;
  name: string;
  size: number;
  progress: number;
  status: 'sending' | 'completed' | 'error';
  timestamp: number;
};

const DEFAULT_MAX_BYTES = Number(import.meta.env.VITE_FILE_TRANSFER_MAX_BYTES ?? 10 * 1024 * 1024);
const CHUNK_LEN = Number(import.meta.env.VITE_FILE_TRANSFER_CHUNK_LEN ?? 3000);
const ENABLED = import.meta.env.VITE_FILE_TRANSFER_ENABLED === 'true';

export function useDailyFileChannel(callFrame: any) {
  const incomingFiles = ref<Record<string, IncomingFile>>({});
  const completedFiles = ref<IncomingFile[]>([]);
  const outgoingFiles = ref<OutgoingFile[]>([]);
  const sending = ref(false);
  const progress = ref(0);
  const error = ref<string | null>(null);

  // Check if file transfer is enabled
  const isEnabled = () => {
    console.log('🔍 File transfer enabled check:', ENABLED, 'env var:', import.meta.env.VITE_FILE_TRANSFER_ENABLED);
    return ENABLED;
  };

  function resetAll() {
    // Revoke all blob URLs to free memory
    for (const f of completedFiles.value) {
      if (f.url) {
        URL.revokeObjectURL(f.url);
      }
    }
    
    // Clear all state
    completedFiles.value = [];
    incomingFiles.value = {};
    outgoingFiles.value = [];
    sending.value = false;
    progress.value = 0;
    error.value = null;
  }

  // Generate SHA-256 hash for integrity checking
  async function sha256(buf: ArrayBuffer): Promise<string> {
    try {
      const hash = await crypto.subtle.digest('SHA-256', buf);
      return [...new Uint8Array(hash)]
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    } catch (err) {
      console.error('Error generating SHA-256:', err);
      throw err;
    }
  }

  // Send file via Daily app messages
  async function sendFile(file: File, recipient: string | '*' = '*'): Promise<void> {
    if (!isEnabled()) {
      throw new Error('FILE_TRANSFER_DISABLED');
    }

    // Handle both direct objects and reactive refs
    const frame = typeof callFrame === 'function' ? callFrame() : (callFrame?.value || callFrame);
    if (!frame) {
      throw new Error('CALL_FRAME_NOT_AVAILABLE');
    }

    if (file.size > DEFAULT_MAX_BYTES) {
      throw new Error('FILE_TOO_LARGE');
    }

    try {
      error.value = null;
      sending.value = true;
      
      const fileId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      
      // Add to outgoing files list
      const outgoingFile: OutgoingFile = {
        fileId,
        name: file.name,
        size: file.size,
        progress: 0,
        status: 'sending',
        timestamp: Date.now()
      };
      outgoingFiles.value.push(outgoingFile);

      // Read file and generate hash
      const buf = await file.arrayBuffer();
      const hashHex = await sha256(buf);
      
      // Convert to base64
      const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
      const totalChunks = Math.ceil(b64.length / CHUNK_LEN);

      // Send file metadata
      frame.sendAppMessage({
        kind: 'file-meta',
        fileId,
        name: file.name,
        type: file.type,
        size: file.size,
        totalChunks,
        sha256: hashHex,
        timestamp: Date.now()
      }, recipient);

      progress.value = 0;

      // Send chunks with pacing to avoid overwhelming the connection
      for (let i = 0; i < totalChunks; i++) {
        const payload = b64.slice(i * CHUNK_LEN, (i + 1) * CHUNK_LEN);
        
        frame.sendAppMessage({
          kind: 'file-chunk',
          fileId,
          index: i,
          payload
        }, recipient);

        const currentProgress = Math.round(((i + 1) / totalChunks) * 100);
        progress.value = currentProgress;
        outgoingFile.progress = currentProgress;

        // Small delay to pace the sending and prevent overwhelming
        if (i < totalChunks - 1) {
          await new Promise(resolve => setTimeout(resolve, 8));
        }
      }

      // Send completion message
      frame.sendAppMessage({
        kind: 'file-end',
        fileId
      }, recipient);

      // Mark as completed
      outgoingFile.status = 'completed';
      outgoingFile.progress = 100;
      
      // Emit analytics event (dev only)
      if (import.meta.env.DEV) {
        console.log('file_transfer_complete', {
          size: file.size,
          chunks: totalChunks,
          recipient: recipient === '*' ? 'all' : 'specific'
        });
      }

    } catch (err) {
      console.error('Error sending file:', err);
      error.value = err instanceof Error ? err.message : 'Failed to send file';
      
      // Update outgoing file status
      const outgoingFile = outgoingFiles.value.find(f => f.name === file.name);
      if (outgoingFile) {
        outgoingFile.status = 'error';
      }
      
      throw err;
    } finally {
      sending.value = false;
      progress.value = 0;
    }
  }

  // Send current files to a specific participant (for late joiners)
  function sendFileListToParticipant(participantId: string) {
    const frame = typeof callFrame === 'function' ? callFrame() : (callFrame?.value || callFrame);
    console.log('📤 sendFileListToParticipant called - frame:', !!frame, 'enabled:', isEnabled());
    
    if (!frame || !isEnabled()) {
      console.log('❌ Cannot send file list - no frame or disabled');
      return;
    }

    console.log('📋 Sending files - completed:', completedFiles.value.length, 'outgoing:', outgoingFiles.value.length);

    // Send metadata for all completed files to the new participant
    completedFiles.value.forEach(file => {
      console.log('📤 Sending completed file sync:', file.name);
      try {
        const message = {
          kind: 'file-sync',
          fileId: file.fileId,
          name: file.name,
          type: file.type,
          size: file.size,
          timestamp: file.timestamp,
          senderId: frame.participants()?.local?.session_id || 'unknown'
        };
        
        // Try sending to specific participant first, then broadcast as fallback
        try {
          frame.sendAppMessage(message, participantId);
        } catch (specificErr) {
          console.warn('❌ Failed to send completed file to specific participant, broadcasting instead:', specificErr);
          frame.sendAppMessage(message, '*');
        }
      } catch (err) {
        console.error('❌ Failed to send completed file sync message:', err);
      }
    });

    // Send metadata for all outgoing files to the new participant
    outgoingFiles.value.forEach(file => {
      if (file.status === 'completed') {
        console.log('📤 Sending outgoing file sync:', file.name);
        try {
          const message = {
            kind: 'file-sync-outgoing',
            fileId: file.fileId,
            name: file.name,
            size: file.size,
            timestamp: file.timestamp,
            senderId: frame.participants()?.local?.session_id || 'unknown'
          };
          console.log('📤 Message payload:', message);
          console.log('📤 Sending to participant:', participantId);
          
          // Try sending to specific participant first, then broadcast as fallback
          try {
            frame.sendAppMessage(message, participantId);
          } catch (specificErr) {
            console.warn('❌ Failed to send to specific participant, broadcasting instead:', specificErr);
            frame.sendAppMessage(message, '*');
          }
          console.log('✅ Message sent successfully');
        } catch (err) {
          console.error('❌ Failed to send file sync message:', err);
        }
      }
    });

    console.log('✅ Finished sending file list to participant:', participantId);
  }

  // Request file list from existing participants (for when we join late)
  function requestFileList() {
    const frame = typeof callFrame === 'function' ? callFrame() : (callFrame?.value || callFrame);
    if (!frame || !isEnabled()) return;

    frame.sendAppMessage({
      kind: 'file-list-request',
      requesterId: frame.participants()?.local?.session_id || 'unknown',
      timestamp: Date.now()
    }, '*');

    console.log('📥 Requested file list from existing participants');
  }

  // Handle incoming app messages
  function onAppMessage(ev: any) {
    const msg = ev?.data;
    console.log('📨 Received app message:', msg?.kind, msg);
    
    if (!msg?.kind || !isEnabled()) {
      if (!isEnabled()) {
        console.log('❌ File transfer disabled, ignoring message');
      }
      return;
    }

    try {
      // Handle file list requests from new participants
      if (msg.kind === 'file-list-request') {
        console.log('📨 Received file list request:', msg);
        const requesterId = msg.requesterId;
        const mySessionId = (typeof callFrame === 'function' ? callFrame() : callFrame?.value)?.participants()?.local?.session_id;
        console.log('🆔 Requester ID:', requesterId, 'My ID:', mySessionId);
        
        if (requesterId && requesterId !== mySessionId) {
          console.log('✅ Sending file list to requester:', requesterId);
          sendFileListToParticipant(requesterId);
        } else {
          console.log('❌ Not sending file list - same participant or invalid requester');
        }
        return;
      }

      // Handle file sync messages (for late joiners)
      if (msg.kind === 'file-sync') {
        console.log('📥 Received file sync message:', msg);
        // Check if we already have this file
        const existingFile = completedFiles.value.find(f => f.fileId === msg.fileId);
        console.log('🔍 Existing file found:', !!existingFile);
        
        if (!existingFile) {
          // Add the file metadata to our list (without actual file data)
          const syncedFile: IncomingFile = {
            fileId: msg.fileId,
            name: msg.name,
            type: msg.type,
            size: msg.size,
            totalChunks: 0,
            received: 0,
            chunks: [],
            senderId: msg.senderId,
            timestamp: msg.timestamp,
            url: undefined // Will be populated when actual file is received
          };
          
          // Add a placeholder indicating this file was shared before we joined
          completedFiles.value.push({
            ...syncedFile,
            url: '#placeholder', // Special placeholder URL
          });
          
          console.log('✅ Added synced file to list:', msg.name);
          console.log('📋 Total completed files now:', completedFiles.value.length);
        } else {
          console.log('⚠️ File already exists, skipping sync');
        }
        return;
      }

      // Handle outgoing file sync messages (files sent by others appear as incoming to us)
      if (msg.kind === 'file-sync-outgoing') {
        console.log('📥 Received outgoing file sync message:', msg);
        // Check if we already have this file in completed files
        const existingFile = completedFiles.value.find(f => f.fileId === msg.fileId);
        console.log('🔍 Existing completed file found:', !!existingFile);
        
        if (!existingFile) {
          // Add this as a completed file for us (it's incoming from their perspective)
          const syncedFile: IncomingFile = {
            fileId: msg.fileId,
            name: msg.name,
            type: 'application/octet-stream', // Default type for outgoing sync
            size: msg.size,
            totalChunks: 0,
            received: 0,
            chunks: [],
            senderId: msg.senderId,
            timestamp: msg.timestamp,
            url: '#placeholder' // Placeholder for files shared before we joined
          };
          
          completedFiles.value.push(syncedFile);
          
          console.log('✅ Added outgoing file as incoming to our list:', msg.name);
          console.log('📋 Total completed files now:', completedFiles.value.length);
        } else {
          console.log('⚠️ File already exists in completed files, skipping');
        }
        return;
      }

      if (msg.kind === 'file-meta') {
        // Emit analytics event (dev only)
        if (import.meta.env.DEV) {
          console.log('file_meta_received', { size: msg.size, chunks: msg.totalChunks });
        }

        incomingFiles.value[msg.fileId] = {
          fileId: msg.fileId,
          name: msg.name,
          type: msg.type,
          size: msg.size,
          totalChunks: msg.totalChunks,
          received: 0,
          chunks: new Array(msg.totalChunks),
          sha256: msg.sha256,
          senderId: ev.fromId,
          timestamp: msg.timestamp || Date.now()
        };
      }

      if (msg.kind === 'file-chunk') {
        const f = incomingFiles.value[msg.fileId];
        if (!f) return;

        f.chunks[msg.index] = msg.payload;
        f.received++;
      }

      if (msg.kind === 'file-end') {
        const f = incomingFiles.value[msg.fileId];
        if (!f) return;

        // Reassemble file from chunks
        const b64 = f.chunks.join('');
        
        try {
          // Convert base64 back to binary
          const raw = atob(b64);
          const bytes = new Uint8Array(raw.length);
          for (let i = 0; i < raw.length; i++) {
            bytes[i] = raw.charCodeAt(i);
          }

          // Verify integrity if hash provided
          if (f.sha256) {
            crypto.subtle.digest('SHA-256', bytes).then(hash => {
              const hex = [...new Uint8Array(hash)]
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');
              
              if (hex !== f.sha256) {
                console.error('File integrity check failed for:', f.name);
                delete incomingFiles.value[msg.fileId];
                return;
              }

              // Create blob and URL
              const blob = new Blob([bytes], { type: f.type || 'application/octet-stream' });
              f.url = URL.createObjectURL(blob);
              
              // Move to completed files
              completedFiles.value.push(f);
              delete incomingFiles.value[msg.fileId];

              // Emit analytics event (dev only)
              if (import.meta.env.DEV) {
                console.log('file_transfer_complete_received', { size: f.size });
              }
            }).catch(err => {
              console.error('Error verifying file hash:', err);
              delete incomingFiles.value[msg.fileId];
            });
          } else {
            // No hash verification, create blob directly
            const blob = new Blob([bytes], { type: f.type || 'application/octet-stream' });
            f.url = URL.createObjectURL(blob);
            
            // Move to completed files
            completedFiles.value.push(f);
            delete incomingFiles.value[msg.fileId];

            // Emit analytics event (dev only)
            if (import.meta.env.DEV) {
              console.log('file_transfer_complete_received', { size: f.size });
            }
          }
        } catch (err) {
          console.error('Error reassembling file:', err);
          delete incomingFiles.value[msg.fileId];
        }
      }
    } catch (err) {
      console.error('Error handling app message:', err);
    }
  }

  // Handle participant joined event
  function onParticipantJoined(ev: any) {
    console.log('🔔 Participant joined event:', ev);
    const participantId = ev?.participant?.session_id;
    console.log('🆔 Participant ID:', participantId);
    console.log('📋 Current completed files:', completedFiles.value.length);
    console.log('📤 Current outgoing files:', outgoingFiles.value.length);
    
    if (participantId && isEnabled()) {
      console.log('✅ Sending file list to new participant:', participantId);
      // Send our current file list to the new participant
      setTimeout(() => {
        sendFileListToParticipant(participantId);
      }, 1000); // Small delay to ensure the participant is ready
    } else {
      console.log('❌ Not sending file list - participantId:', participantId, 'enabled:', isEnabled());
    }
  }

  // Handle when we join the meeting
  function onJoinedMeeting() {
    console.log('🎉 We joined the meeting!');
    if (isEnabled()) {
      console.log('📥 Requesting file list from existing participants...');
      // Request file list from existing participants multiple times to be sure
      setTimeout(() => {
        requestFileList();
      }, 1000);
      setTimeout(() => {
        requestFileList();
      }, 3000);
      setTimeout(() => {
        requestFileList();
      }, 5000);
    } else {
      console.log('❌ File transfer disabled, not requesting file list');
    }
  }

  // Set up event listeners
  function setupListeners() {
    const frame = typeof callFrame === 'function' ? callFrame() : (callFrame?.value || callFrame);
    if (!frame) return;

    try {
      frame.on('app-message', onAppMessage);
      frame.on('left-meeting', resetAll);
      frame.on('call-ended', resetAll);
      
      // Add participant synchronization events
      frame.on('participant-joined', onParticipantJoined);
      frame.on('joined-meeting', onJoinedMeeting);
      
      console.log('📡 File transfer listeners set up with participant sync');
    } catch (err) {
      console.error('Error setting up file transfer listeners:', err);
    }
  }

  // Clean up event listeners
  function cleanupListeners() {
    const frame = typeof callFrame === 'function' ? callFrame() : (callFrame?.value || callFrame);
    if (!frame) return;

    try {
      frame.off('app-message', onAppMessage);
      frame.off('left-meeting', resetAll);
      frame.off('call-ended', resetAll);
      frame.off('participant-joined', onParticipantJoined);
      frame.off('joined-meeting', onJoinedMeeting);
    } catch (err) {
      console.error('Error cleaning up file transfer listeners:', err);
    }
  }

  // Initialize listeners when callFrame is available
  const frame = typeof callFrame === 'function' ? callFrame() : (callFrame?.value || callFrame);
  if (frame) {
    setupListeners();
  }

  // Watch for callFrame changes and re-setup listeners
  if (callFrame && typeof callFrame === 'object' && 'value' in callFrame) {
    // This is a reactive ref, watch for changes
    watch(callFrame, (newFrame, oldFrame) => {
      if (oldFrame) {
        cleanupListeners();
      }
      if (newFrame) {
        setupListeners();
      }
    });
  }

  // Cleanup on component unmount
  onBeforeUnmount(() => {
    cleanupListeners();
    resetAll();
  });

  return {
    // State
    sending,
    progress,
    completedFiles,
    outgoingFiles,
    error,
    isEnabled,
    
    // Methods
    sendFile,
    resetAll,
    setupListeners,
    cleanupListeners,
    
    // Debug methods
    requestFileList,
    sendFileListToParticipant: (participantId: string) => sendFileListToParticipant(participantId)
  };
}