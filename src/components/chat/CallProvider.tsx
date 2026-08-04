import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { useCallStore, fetchCallerProfile } from '@/stores/call'
import { toast } from '@/stores/toast'
import { IncomingCallBanner } from '@/components/chat/IncomingCallBanner'
import { OutgoingCallOverlay } from '@/components/chat/OutgoingCallOverlay'
import { ActiveCallModal } from '@/components/chat/ActiveCallModal'

export function CallProvider() {
  const { user } = useAuthStore()
  const { incomingCall, activeCall, outgoingCall, setIncomingCall, setActiveCall, setOutgoingCall } = useCallStore()
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Listen for incoming call signals
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel('call-signals-incoming')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'call_signals',
        filter: `callee_id=eq.${user.id}`,
      },
        async (payload) => {
          const signal = payload.new as {
            id: string
            caller_id: string
            channel_id: string | null
            call_type: 'voice' | 'video' | 'screen'
            status: string
            created_at: string
          }
          if (signal.status !== 'ringing') return

          // Fetch caller profile
          const { name, avatar } = await fetchCallerProfile(signal.caller_id)

          // Fetch channel name
          let channelName = 'Direct Message'
          if (signal.channel_id) {
            const { data: chat } = await supabase
              .from('chats')
              .select('name, type')
              .eq('id', signal.channel_id)
              .maybeSingle()
            if (chat?.name) channelName = chat.name
          }

          setIncomingCall({
            signalId: signal.id,
            callerId: signal.caller_id,
            callerName: name,
            callerAvatar: avatar,
            channelId: signal.channel_id,
            channelName,
            callType: signal.call_type,
            createdAt: signal.created_at,
          })

          // Play ring sound
          playRingSound()
        }
      )
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'call_signals',
        filter: `caller_id=eq.${user.id}`,
      },
        (payload) => {
          const signal = payload.new as { id: string; status: string }
          const outgoing = useCallStore.getState().outgoingCall
          if (!outgoing || outgoing.signalId !== signal.id) return

          if (signal.status === 'accepted') {
            // Callee accepted — transition to active call
            setActiveCall({
              signalId: outgoing.signalId,
              channelId: outgoing.channelId,
              channelName: outgoing.channelName,
              callType: outgoing.callType,
              isIncoming: false,
              callerId: user.id,
            })
            setOutgoingCall(null)
            stopRingSound()
          } else if (signal.status === 'declined') {
            setOutgoingCall(null)
            stopRingSound()
            toast.info('Call declined')
          } else if (signal.status === 'cancelled') {
            setOutgoingCall(null)
            stopRingSound()
          }
        }
      )
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'call_signals',
        filter: `callee_id=eq.${user.id}`,
      },
        (payload) => {
          const signal = payload.new as { id: string; status: string }
          const incoming = useCallStore.getState().incomingCall
          if (!incoming || incoming.signalId !== signal.id) return

          if (signal.status === 'cancelled' || signal.status === 'ended') {
            setIncomingCall(null)
            stopRingSound()
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      stopRingSound()
    }
  }, [user?.id])

  // Auto-timeout incoming call after 30s
  useEffect(() => {
    if (!incomingCall) return
    const timeout = setTimeout(() => {
      useCallStore.getState().declineCall()
      toast.info('Missed call')
    }, 30000)
    return () => clearTimeout(timeout)
  }, [incomingCall])

  function playRingSound() {
    try {
      // Use a simple oscillator-based ring tone
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 800
      gain.gain.value = 0.1
      osc.start()
      audioRef.current = ctx.destination as unknown as HTMLAudioElement
      // Ring pattern: 2s on, 1s off, repeat
      const interval = setInterval(() => {
        if (!useCallStore.getState().incomingCall) {
          clearInterval(interval)
          ctx.close()
          return
        }
      }, 1000)
    } catch {
      // Audio not available
    }
  }

  function stopRingSound() {
    audioRef.current = null
  }

  return (
    <>
      <IncomingCallBanner />
      <OutgoingCallOverlay />
      {activeCall && (
        <ActiveCallModal
          callType={activeCall.callType}
          channelName={activeCall.channelName}
          isIncoming={activeCall.isIncoming}
          onEnd={() => useCallStore.getState().endCall()}
        />
      )}
    </>
  )
}
