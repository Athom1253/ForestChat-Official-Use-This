import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { toast } from '@/stores/toast'
import type { Channel } from '@/types'

interface ChatSettingsPanelProps {
  channel: Channel | null
  onClose: () => void
}

export function ChatSettingsPanel({ channel, onClose }: ChatSettingsPanelProps) {
  const { user } = useAuthStore()
  const [isOwner, setIsOwner] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (channel && user) {
      setEditName(channel.name || '')
      setEditDesc(channel.description || '')
      const ownerMatch = channel.owner_id === user.id || (channel as Channel & { member?: { role?: string } }).member?.role === 'owner'
      setIsOwner(ownerMatch)
    }
  }, [channel, user])

  const saveSettings = async () => {
    if (!channel || !user) return
    setSaving(true)
    const { error } = await supabase
      .from('chats')
      .update({ name: editName.trim(), description: editDesc.trim() })
      .eq('id', channel.id)
    if (error) {
      toast.error('Failed to save: ' + error.message)
    } else {
      toast.success('Settings saved')
    }
    setSaving(false)
  }

  const copyInviteCode = () => {
    if (channel?.invite_code) {
      navigator.clipboard.writeText(channel.invite_code)
      toast.success('Invite code copied')
    }
  }

  return (
    <motion.div
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      className="w-72 bg-surface border-l border-border flex flex-col flex-shrink-0"
    >
      <div className="h-14 flex items-center justify-between px-4 border-b border-border">
        <h3 className="font-semibold text-text">Chat Settings</h3>
        <button onClick={onClose} className="text-text-muted hover:text-text transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Channel info */}
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-text-muted uppercase tracking-wide">Channel Name</label>
            {isOwner && channel?.type !== 'dm' ? (
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="input mt-1.5"
                placeholder="Channel name"
              />
            ) : (
              <p className="text-text font-medium mt-1.5">{channel?.name || 'Direct Message'}</p>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-text-muted uppercase tracking-wide">Type</label>
            <p className="text-text font-medium mt-1.5 capitalize">{channel?.type}</p>
          </div>

          {channel?.type !== 'dm' && (
            <div>
              <label className="text-xs font-medium text-text-muted uppercase tracking-wide">Description</label>
              {isOwner ? (
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={3}
                  className="input mt-1.5 resize-none"
                  placeholder="Channel description"
                />
              ) : (
                <p className="text-text mt-1.5">{channel?.description || 'No description'}</p>
              )}
            </div>
          )}
        </div>

        {/* Invite code */}
        {channel?.invite_code && (
          <div className="pt-4 border-t border-border">
            <label className="text-xs font-medium text-text-muted uppercase tracking-wide">Invite Code</label>
            <div className="flex items-center gap-2 mt-2">
              <code className="px-3 py-2 bg-bg rounded-lg text-sm text-primary font-mono flex-1">{channel.invite_code}</code>
              <button
                onClick={copyInviteCode}
                className="p-2 text-text-muted hover:text-text hover:bg-surface-hover rounded-lg transition-colors"
                title="Copy invite code"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              </button>
            </div>
          </div>
        )}

        {/* Save button for owner */}
        {isOwner && channel?.type !== 'dm' && (
          <button
            onClick={saveSettings}
            disabled={saving}
            className="btn-primary w-full disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        )}

        {!isOwner && channel?.type !== 'dm' && (
          <div className="pt-4 border-t border-border">
            <p className="text-xs text-text-muted">Only the channel owner can edit settings.</p>
          </div>
        )}
      </div>
    </motion.div>
  )
}
