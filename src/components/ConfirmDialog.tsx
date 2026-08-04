import { useEffect, useState, type ReactNode } from 'react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false, onConfirm, onCancel,
}: ConfirmDialogProps) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (open) requestAnimationFrame(() => setVisible(true))
    else setVisible(false)
  }, [open])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className={`absolute inset-0 bg-black/60 transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`} onClick={onCancel} />
      <div className={`relative bg-surface border border-border rounded-2xl shadow-2xl max-w-md w-full p-6 transition-all duration-200 ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
        <h3 className="text-lg font-semibold text-text mb-2">{title}</h3>
        <p className="text-sm text-text-muted mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-text-muted hover:text-text bg-surface-hover hover:bg-border rounded-lg transition-colors">{cancelLabel}</button>
          <button onClick={onConfirm} className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${danger ? 'bg-error hover:bg-red-600' : 'bg-primary hover:bg-primary-hover'}`}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}

export function useConfirmDialog() {
  const [state, setState] = useState<{ open: boolean; title: string; message: string; confirmLabel?: string; danger?: boolean; onConfirm: () => void } | null>(null)
  const confirm = (opts: { title: string; message: string; confirmLabel?: string; danger?: boolean; onConfirm: () => void }) => setState({ open: true, ...opts })
  const close = () => setState(null)
  const dialog: ReactNode = state ? (
    <ConfirmDialog open={state.open} title={state.title} message={state.message} confirmLabel={state.confirmLabel} danger={state.danger}
      onConfirm={() => { state.onConfirm(); close() }} onCancel={close} />
  ) : null
  return { confirm, dialog }
}
