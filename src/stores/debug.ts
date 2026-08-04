import { create } from 'zustand'

export interface DebugLog {
  id: string
  timestamp: number
  category: string
  message: string
  data?: unknown
}

interface DebugState {
  logs: DebugLog[]
  enabled: boolean
  log: (category: string, message: string, data?: unknown) => void
  toggle: () => void
  clear: () => void
}

const MAX_LOGS = 200

export const useDebugStore = create<DebugState>((set, get) => ({
  logs: [],
  enabled: false,
  log: (category, message, data) => {
    const entry: DebugLog = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      category,
      message,
      data,
    }
    set((state) => ({ logs: [entry, ...state.logs].slice(0, MAX_LOGS) }))
    console.debug(`[${category}] ${message}`, data || '')
  },
  toggle: () => set((state) => ({ enabled: !state.enabled })),
  clear: () => set({ logs: [] }),
}))

export const debug = {
  log: (category: string, message: string, data?: unknown) => useDebugStore.getState().log(category, message, data),
}
