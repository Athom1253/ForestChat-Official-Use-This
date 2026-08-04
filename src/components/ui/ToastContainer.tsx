import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useToastStore } from '@/stores/toast'
import { cn } from '@/lib/utils'

function formatToastTime(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  return (
    <div className="fixed top-4 right-4 z-[300] flex flex-col gap-2 max-w-sm pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'px-4 py-3 rounded-lg shadow-lg border flex items-start gap-3 cursor-pointer pointer-events-auto backdrop-blur-md',
              t.type === 'success' && 'bg-success/20 border-success/50 text-success',
              t.type === 'error' && 'bg-error/20 border-error/50 text-error',
              t.type === 'info' && 'bg-primary/20 border-primary/50 text-primary',
              t.type === 'warning' && 'bg-warning/20 border-warning/50 text-warning',
            )}
            onClick={() => removeToast(t.id)}
          >
            <div className="flex-1">
              <span className="text-sm text-text block">{t.message}</span>
              <span className="text-xs text-text-muted mt-0.5 block">{formatToastTime(t.timestamp)}</span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

export function AlertHistoryPanel() {
  const { history, clearHistory } = useToastStore()
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="border-t border-border">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-surface-hover transition-colors"
      >
        <span className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Alert History
          {history.length > 0 && <span className="bg-primary/20 text-primary px-1.5 rounded-full text-xs">{history.length}</span>}
        </span>
        <svg className={cn('w-4 h-4 text-text-muted transition-transform', expanded && 'rotate-180')} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="max-h-48 overflow-y-auto px-2 pb-2 space-y-1">
              {history.length === 0 ? (
                <p className="text-xs text-text-muted text-center py-3">No alerts yet</p>
              ) : (
                history.map((t) => (
                  <div key={t.id} className={cn(
                    'p-2 rounded-lg text-xs flex items-start gap-2',
                    t.type === 'success' && 'bg-success/10',
                    t.type === 'error' && 'bg-error/10',
                    t.type === 'info' && 'bg-primary/10',
                    t.type === 'warning' && 'bg-warning/10',
                  )}>
                    <span className={cn(
                      'flex-shrink-0 mt-0.5',
                      t.type === 'success' && 'text-success',
                      t.type === 'error' && 'text-error',
                      t.type === 'info' && 'text-primary',
                      t.type === 'warning' && 'text-warning',
                    )}>
                      {t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : t.type === 'warning' ? '⚠' : 'ℹ'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-text break-words">{t.message}</p>
                      <p className="text-text-muted mt-0.5">{formatToastTime(t.timestamp)}</p>
                    </div>
                  </div>
                ))
              )}
              {history.length > 0 && (
                <button onClick={clearHistory} className="w-full text-xs text-text-muted hover:text-error py-1 text-center">
                  Clear history
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
