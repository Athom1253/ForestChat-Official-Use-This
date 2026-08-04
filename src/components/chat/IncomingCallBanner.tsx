import { motion, AnimatePresence } from 'framer-motion'
import { useCallStore } from '@/stores/call'

export function IncomingCallBanner() {
  const { incomingCall, acceptCall, declineCall } = useCallStore()

  return (
    <AnimatePresence>
      {incomingCall && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[300] w-[min(440px,calc(100vw-2rem))]"
        >
          <div className="bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center gap-3 p-4">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                {incomingCall.callerAvatar ? (
                  <img src={incomingCall.callerAvatar} alt="" className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg">
                    {incomingCall.callerName[0]?.toUpperCase()}
                  </div>
                )}
                <motion.div
                  animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="absolute inset-0 rounded-full border-2 border-primary"
                />
              </div>

              {/* Caller info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text truncate">{incomingCall.callerName}</p>
                <p className="text-xs text-text-muted flex items-center gap-1.5">
                  {incomingCall.callType === 'video' ? (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                  )}
                  Incoming {incomingCall.callType === 'video' ? 'video' : 'voice'} call...
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={declineCall}
                  className="w-11 h-11 rounded-full bg-error hover:bg-red-600 flex items-center justify-center transition-colors"
                  title="Decline"
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                </button>
                <button
                  onClick={acceptCall}
                  className="w-11 h-11 rounded-full bg-success hover:bg-green-600 flex items-center justify-center transition-colors"
                  title="Accept"
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                </button>
              </div>
            </div>

            {/* Progress bar showing ring time */}
            <motion.div
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: 30, ease: 'linear' }}
              className="h-0.5 bg-primary"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
