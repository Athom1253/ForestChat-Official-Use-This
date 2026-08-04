import { create } from 'zustand'
import { useAuthStore } from '@/stores/auth'

export type ToastCategory = 'message' | 'reaction' | 'mention' | 'friend_request' | 'call' | 'system' | 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
  category?: ToastCategory
  duration?: number
  timestamp: number
}

interface ToastState {
  toasts: Toast[]
  history: Toast[]
  addToast: (message: string, type?: Toast['type'], duration?: number, category?: ToastCategory) => void
  removeToast: (id: string) => void
  clearHistory: () => void
}

const MAX_HISTORY = 50

const shouldShowToast = (category?: ToastCategory): boolean => {
  if (!category || ['success', 'error', 'info', 'warning'].includes(category)) return true
  const settings = useAuthStore.getState().settings
  if (!settings) return true
  if (!settings.notifications_enabled) return false
  switch (category) {
    case 'message': return settings.notify_messages
    case 'reaction': return settings.notify_reactions
    case 'mention': return settings.notify_mentions
    case 'friend_request': return settings.notify_friend_requests
    case 'call': return settings.notify_call_invites
    case 'system': return settings.notify_system
    default: return true
  }
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  history: [],
  addToast: (message, type = 'info', duration = 5000, category?: ToastCategory) => {
    if (!shouldShowToast(category)) return
    const id = crypto.randomUUID()
    const timestamp = Date.now()
    const toast: Toast = { id, message, type, category, duration, timestamp }
    set((state) => ({
      toasts: [...state.toasts, toast],
      history: [toast, ...state.history].slice(0, MAX_HISTORY),
    }))
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
      }, duration)
    }
  },
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  clearHistory: () => set({ history: [] }),
}))

export const toast = {
  success: (msg: string) => useToastStore.getState().addToast(msg, 'success', 5000, 'success'),
  error: (msg: string) => useToastStore.getState().addToast(msg, 'error', 8000, 'error'),
  info: (msg: string) => useToastStore.getState().addToast(msg, 'info', 5000, 'info'),
  warning: (msg: string) => useToastStore.getState().addToast(msg, 'warning', 5000, 'warning'),
  message: (msg: string) => useToastStore.getState().addToast(msg, 'info', 5000, 'message'),
  reaction: (msg: string) => useToastStore.getState().addToast(msg, 'info', 3000, 'reaction'),
  mention: (msg: string) => useToastStore.getState().addToast(msg, 'info', 5000, 'mention'),
  friendRequest: (msg: string) => useToastStore.getState().addToast(msg, 'info', 5000, 'friend_request'),
  call: (msg: string) => useToastStore.getState().addToast(msg, 'info', 5000, 'call'),
  system: (msg: string) => useToastStore.getState().addToast(msg, 'info', 5000, 'system'),
}
