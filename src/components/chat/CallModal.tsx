import { useState, useRef, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'

interface CallModalProps {
  type: 'voice' | 'video' | 'screen'
  channelName: string
  onClose: () => void
}

export function CallModal({ type, channelName, onClose }: CallModalProps) {
  const [callState, setCallState] = useState<'connecting' | 'active' | 'ended'>('connecting')
  const [micEnabled, setMicEnabled] = useState(true)
  const [cameraEnabled, setCameraEnabled] = useState(type === 'video')
  const [screenSharing, setScreenSharing] = useState(type === 'screen')
  const [callDuration, setCallDuration] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const localAudioRef = useRef<HTMLAudioElement>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const typeLabel = type === 'voice' ? 'Voice Call' : type === 'video' ? 'Video Call' : 'Screen Share'

  const attachStreamToVideo = useCallback(() => {
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current
      localVideoRef.current.play().catch(() => {})
    }
  }, [])

  const stopStream = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop())
      localStreamRef.current = null
    }
  }, [])

  const toggleMic = () => {
    if (localStreamRef.current) {
      const track = localStreamRef.current.getAudioTracks()[0]
      if (track) {
        track.enabled = !track.enabled
        setMicEnabled(track.enabled)
      }
    }
  }

  const toggleCamera = async () => {
    if (cameraEnabled) {
      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach(t => {
          localStreamRef.current!.removeTrack(t)
          t.stop()
        })
      }
      if (localVideoRef.current) localVideoRef.current.srcObject = null
      setCameraEnabled(false)
    } else {
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: true })
        if (localStreamRef.current) {
          videoStream.getVideoTracks().forEach(t => localStreamRef.current!.addTrack(t))
        } else {
          localStreamRef.current = videoStream
        }
        setCameraEnabled(true)
        setTimeout(() => attachStreamToVideo(), 100)
      } catch {
        setError('Could not access camera')
      }
    }
  }

  const toggleScreenShare = async () => {
    if (screenSharing) {
      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach(t => {
          localStreamRef.current!.removeTrack(t)
          t.stop()
        })
      }
      setScreenSharing(false)
      if (localVideoRef.current) localVideoRef.current.srcObject = null
    } else {
      try {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true })
        if (localStreamRef.current) {
          const oldVideoTracks = localStreamRef.current.getVideoTracks()
          oldVideoTracks.forEach(t => { localStreamRef.current!.removeTrack(t); t.stop() })
          displayStream.getVideoTracks().forEach(t => localStreamRef.current!.addTrack(t))
        } else {
          localStreamRef.current = displayStream
        }
        setScreenSharing(true)
        setTimeout(() => attachStreamToVideo(), 100)
        displayStream.getVideoTracks()[0]?.addEventListener('ended', () => {
          setScreenSharing(false)
        })
      } catch {
        setError('Could not start screen sharing')
      }
    }
  }

  const endCall = () => {
    stopStream()
    setCallState('ended')
    if (timerRef.current) clearInterval(timerRef.current)
    setTimeout(() => onClose(), 500)
  }

  useEffect(() => {
    const initCall = async () => {
      try {
        const constraints: MediaStreamConstraints = {
          audio: true,
          video: type === 'video' || type === 'screen',
        }
        const stream = await navigator.mediaDevices.getUserMedia(constraints)
        localStreamRef.current = stream

        if (type === 'voice') {
          if (localAudioRef.current) {
            localAudioRef.current.srcObject = stream
            localAudioRef.current.play().catch(() => {})
          }
        } else {
          setTimeout(() => attachStreamToVideo(), 100)
        }

        if (type === 'screen') {
          try {
            const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true })
            const oldVideoTracks = stream.getVideoTracks()
            oldVideoTracks.forEach(t => { stream.removeTrack(t); t.stop() })
            displayStream.getVideoTracks().forEach(t => stream.addTrack(t))
            setTimeout(() => attachStreamToVideo(), 100)
            displayStream.getVideoTracks()[0]?.addEventListener('ended', () => {
              setScreenSharing(false)
            })
          } catch {
            // Screen share denied, continue with just audio
          }
        }

        setCallState('active')
        timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000)
      } catch (err) {
        setError('Could not access microphone or camera. Please check permissions.')
        setCallState('connecting')
      }
    }
    initCall()

    return () => {
      stopStream()
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  useEffect(() => {
    if (cameraEnabled && (type === 'video' || screenSharing)) {
      setTimeout(() => attachStreamToVideo(), 50)
    }
  }, [cameraEnabled, screenSharing, attachStreamToVideo, type])

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const showVideo = (type === 'video' || screenSharing) && cameraEnabled

  return (
    <div className="fixed inset-0 bg-black/90 z-[200] flex flex-col items-center justify-between p-6">
      {/* Top bar */}
      <div className="w-full flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-error animate-pulse" />
          <span className="text-white font-medium">{typeLabel}</span>
          <span className="text-white/50">with {channelName}</span>
        </div>
        <div className="text-white/70 text-sm font-mono">
          {callState === 'active' ? formatDuration(callDuration) : callState === 'connecting' ? 'Connecting...' : 'Ended'}
        </div>
      </div>

      {/* Main video / avatar area */}
      <div className="flex-1 flex items-center justify-center w-full">
        {error ? (
          <div className="text-center max-w-md">
            <div className="w-20 h-20 rounded-full bg-error/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <p className="text-white mb-2">{error}</p>
            <button onClick={onClose} className="btn-ghost text-white">Close</button>
          </div>
        ) : showVideo ? (
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="max-w-full max-h-full rounded-2xl"
            style={{ transform: type === 'video' && !screenSharing ? 'scaleX(-1)' : 'none' }}
          />
        ) : (
          <div className="text-center">
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="w-32 h-32 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4"
            >
              {type === 'voice' ? (
                <svg className="w-16 h-16 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
              ) : (
                <svg className="w-16 h-16 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              )}
            </motion.div>
            <p className="text-white/70 text-lg">{channelName}</p>
            {callState === 'active' && <p className="text-white/40 text-sm mt-1">{micEnabled ? 'Mic on' : 'Mic muted'}</p>}
          </div>
        )}
      </div>

      {/* Hidden audio element for voice-only calls */}
      <audio ref={localAudioRef} autoPlay className="hidden" />

      {/* Controls */}
      {!error && (
        <div className="flex items-center gap-3">
          <button
            onClick={toggleMic}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${micEnabled ? 'bg-white/10 hover:bg-white/20' : 'bg-error text-white'}`}
            title={micEnabled ? 'Mute microphone' : 'Unmute microphone'}
          >
            {micEnabled ? (
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.707 3.586 12 4.169 12 5.414v13.172c0 1.245-1.293 1.828-2.707.707L5.586 15zM17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
            )}
          </button>

          <button
            onClick={toggleCamera}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${cameraEnabled ? 'bg-white/10 hover:bg-white/20' : 'bg-white/10 hover:bg-white/20'}`}
            title={cameraEnabled ? 'Turn off camera' : 'Turn on camera'}
          >
            {cameraEnabled ? (
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            ) : (
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2zM9 9l6 6m0-6l-6 6" /></svg>
            )}
          </button>

          <button
            onClick={toggleScreenShare}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${screenSharing ? 'bg-primary text-white' : 'bg-white/10 hover:bg-white/20'}`}
            title={screenSharing ? 'Stop screen share' : 'Share screen'}
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" /></svg>
          </button>

          <div className="w-px h-10 bg-white/20 mx-1" />

          <button
            onClick={endCall}
            className="w-16 h-14 rounded-full bg-error hover:bg-red-600 flex items-center justify-center transition-colors"
            title="End call"
          >
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
          </button>
        </div>
      )}
    </div>
  )
}
