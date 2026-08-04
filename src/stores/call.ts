import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { toast } from '@/stores/toast'
import type { Profile } from '@/types'

export interface IncomingCall {
  signalId: string
  callerId: string
  callerName: string
  callerAvatar: string | null
  channelId: string | null
  channelName: string
  callType: 'voice' | 'video' | 'screen'
  createdAt: string
}

export interface ActiveCall {
  signalId: string
  channelId: string | null
  channelName: string
  callType: 'voice' | 'video' | 'screen'
  isIncoming: boolean
  callerId: string
}

interface CallState {
  incomingCall: IncomingCall | null
  activeCall: ActiveCall | null
  outgoingCall: ActiveCall | null
  callStartTime: number | null
  setIncomingCall: (call: IncomingCall | null) => void
  setActiveCall: (call: ActiveCall | null) => void
  setOutgoingCall: (call: ActiveCall | null) => void
  acceptCall: () => Promise<void>
  declineCall: () => Promise<void>
  endCall: () => Promise<void>
  cancelOutgoingCall: () => Promise<void>
  startCall: (calleeId: string, channelId: string | null, channelName: string, callType: 'voice' | 'video' | 'screen') => Promise<void>
}

export const useCallStore = create<CallState>((set, get) => ({
  incomingCall: null,
  activeCall: null,
  outgoingCall: null,
  callStartTime: null,

  setIncomingCall: (call) => set({ incomingCall: call }),
  setActiveCall: (call) => {
    set({ activeCall: call, callStartTime: call ? Date.now() : null })
    if (!call) set({ outgoingCall: null })
  },
  setOutgoingCall: (call) => set({ outgoingCall: call }),

  acceptCall: async () => {
    const call = get().incomingCall
    if (!call) return
    await supabase
      .from('call_signals')
      .update({ status: 'accepted', responded_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', call.signalId)

    set({
      incomingCall: null,
      activeCall: {
        signalId: call.signalId,
        channelId: call.channelId,
        channelName: call.channelName,
        callType: call.callType,
        isIncoming: true,
        callerId: call.callerId,
      },
      callStartTime: Date.now(),
    })
  },

  declineCall: async () => {
    const call = get().incomingCall
    if (!call) return
    await supabase
      .from('call_signals')
      .update({ status: 'declined', responded_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', call.signalId)
    set({ incomingCall: null })
    toast.info('Call declined')
  },

  endCall: async () => {
    const call = get().activeCall
    if (call) {
      await supabase
        .from('call_signals')
        .update({ status: 'ended', responded_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', call.signalId)
    }
    set({ activeCall: null, outgoingCall: null, callStartTime: null })
  },

  cancelOutgoingCall: async () => {
    const call = get().outgoingCall
    if (call) {
      await supabase
        .from('call_signals')
        .update({ status: 'cancelled', responded_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', call.signalId)
    }
    set({ outgoingCall: null })
  },

  startCall: async (calleeId, channelId, channelName, callType) => {
    const user = useAuthStore.getState().user
    if (!user) return

    const { data, error } = await supabase
      .from('call_signals')
      .insert({
        caller_id: user.id,
        callee_id: calleeId,
        channel_id: channelId,
        call_type: callType,
        status: 'ringing',
      })
      .select('id')
      .single()

    if (error) {
      toast.error('Failed to start call')
      return
    }

    set({
      outgoingCall: {
        signalId: data.id,
        channelId,
        channelName,
        callType,
        isIncoming: false,
        callerId: user.id,
      },
    })
  },
}))

export async function fetchCallerProfile(callerId: string): Promise<{ name: string; avatar: string | null }> {
  const { data } = await supabase
    .from('app_users')
    .select('username, display_name, avatar_url')
    .eq('id', callerId)
    .maybeSingle()

  if (data) {
    return { name: data.display_name || data.username, avatar: data.avatar_url }
  }
  return { name: 'Unknown', avatar: null }
}

export type { Profile }
