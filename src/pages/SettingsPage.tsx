import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { toast } from '@/stores/toast'
import { cn } from '@/lib/utils'

const THEMES = [
  { id: 'forest', name: 'Forest', preview: ['#0f1a14', '#4ade80'] },
  { id: 'dark', name: 'Dark', preview: ['#0a0a0a', '#6366f1'] },
  { id: 'light', name: 'Light', preview: ['#f5f5f5', '#059669'] },
  { id: 'ocean', name: 'Ocean', preview: ['#0c1929', '#0ea5e9'] },
  { id: 'sunset', name: 'Sunset', preview: ['#1a0f0a', '#f97316'] },
  { id: 'aurora', name: 'Aurora', preview: ['#0a0e1a', '#10b981'] },
  { id: 'space', name: 'Space', preview: ['#050510', '#6366f1'] },
  { id: 'minimal', name: 'Minimal', preview: ['#fafafa', '#171717'] },
]

const BACKGROUNDS = [
  { id: 'none', name: 'None', icon: '∅' },
  { id: 'fireflies', name: 'Fireflies', icon: '✦' },
  { id: 'leaves', name: 'Leaves', icon: '🍂' },
  { id: 'snow', name: 'Snow', icon: '❄️' },
  { id: 'rain', name: 'Rain', icon: '🌧️' },
  { id: 'stars', name: 'Stars', icon: '⭐' },
  { id: 'particles', name: 'Particles', icon: '●' },
  { id: 'waves', name: 'Waves', icon: '🌊' },
  { id: 'gradients', name: 'Gradients', icon: '◐' },
]

const COLOR_PRESETS = ['#4ade80', '#6366f1', '#0ea5e9', '#f97316', '#10b981', '#a78bfa', '#ef4444', '#ec4899', '#eab308', '#06b6d4', '#f59e0b', '#8b5cf6']

export default function SettingsPage() {
  const { settings, updateSettings, profile, user, updateProfile } = useAuthStore()
  const [showEmailChange, setShowEmailChange] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [emailPassword, setEmailPassword] = useState('')
  const [emailSaving, setEmailSaving] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingBg, setUploadingBg] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const bgInputRef = useRef<HTMLInputElement>(null)

  const handleUpdate = async (updates: Record<string, unknown>) => {
    const { error } = await updateSettings(updates as any)
    if (error) toast.error('Failed to update settings')
    else toast.success('Settings updated')
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploadingAvatar(true)
    try {
      const ext = file.name.split('.').pop() || 'png'
      const fileName = `${user.id}/avatar-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: true })
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName)
      const { error: profErr } = await updateProfile({ avatar_url: publicUrl })
      if (profErr) throw profErr
      toast.success('Profile picture updated!')
    } catch {
      toast.error('Failed to upload profile picture')
    } finally {
      setUploadingAvatar(false)
      if (avatarInputRef.current) avatarInputRef.current.value = ''
    }
  }

  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploadingBg(true)
    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const fileName = `${user.id}/bg-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('backgrounds').upload(fileName, file)
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('backgrounds').getPublicUrl(fileName)
      await handleUpdate({ custom_background_url: publicUrl, background_type: 'custom' })
      toast.success('Background image applied!')
    } catch {
      toast.error('Failed to upload background')
    } finally {
      setUploadingBg(false)
      if (bgInputRef.current) bgInputRef.current.value = ''
    }
  }

  const handleChangeEmail = async () => {
    if (!newEmail.trim() || !emailPassword) return
    setEmailSaving(true)
    try {
      const { error: pwError } = await supabase.auth.signInWithPassword({ email: user?.email || '', password: emailPassword })
      if (pwError) { toast.error('Wrong password'); setEmailSaving(false); return }
      const { error } = await supabase.auth.updateUser({ email: newEmail.trim() })
      if (error) {
        toast.error(error.message)
      } else {
        toast.success('Email updated! You may need to verify the new email.')
        setShowEmailChange(false)
        setNewEmail('')
        setEmailPassword('')
      }
    } catch {
      toast.error('Failed to update email')
    } finally {
      setEmailSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (!newPassword || newPassword !== confirmPassword || !currentPassword) return
    setPwSaving(true)
    try {
      const { error: pwError } = await supabase.auth.signInWithPassword({ email: user?.email || '', password: currentPassword })
      if (pwError) { toast.error('Current password is incorrect'); setPwSaving(false); return }
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) {
        toast.error(error.message)
      } else {
        toast.success('Password updated successfully!')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      }
    } catch {
      toast.error('Failed to update password')
    } finally {
      setPwSaving(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col page-bg overflow-hidden">
      <div className="h-14 flex items-center px-6 border-b border-border bg-surface">
        <h1 className="text-lg font-semibold text-text">Settings</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Profile Picture */}
          <Section title="Profile Picture" description="Upload or change your avatar">
            <div className="card p-4 flex items-center gap-4">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="avatar" className="w-20 h-20 rounded-full object-cover border-2 border-border" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-2xl font-bold text-primary">
                  {profile?.username?.[0]?.toUpperCase() || '?'}
                </div>
              )}
              <div className="flex-1">
                <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                <button onClick={() => avatarInputRef.current?.click()} disabled={uploadingAvatar} className="btn-primary text-sm disabled:opacity-50">
                  {uploadingAvatar ? 'Uploading...' : 'Upload New Picture'}
                </button>
                {profile?.avatar_url && (
                  <button onClick={async () => { await updateProfile({ avatar_url: null }); toast.success('Avatar removed') }} className="btn-ghost text-sm ml-2">
                    Remove
                  </button>
                )}
                <p className="text-xs text-text-muted mt-2">JPG, PNG, or GIF. Max 5MB.</p>
              </div>
            </div>
          </Section>

          {/* Themes */}
          <Section title="Themes" description="Choose your preferred color scheme">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {THEMES.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => handleUpdate({ theme: theme.id })}
                  className={cn(
                    'relative p-3 rounded-xl border-2 transition-all hover:scale-105',
                    settings?.theme === theme.id ? 'border-primary' : 'border-border',
                  )}
                >
                  <div className="w-full h-16 rounded-lg mb-2" style={{ background: `linear-gradient(135deg, ${theme.preview[0]}, ${theme.preview[1]})` }} />
                  <p className="text-sm text-text text-center">{theme.name}</p>
                  {settings?.theme === theme.id && (
                    <div className="absolute top-1 right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-bg" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </Section>

          {/* Theme Color Picker */}
          <Section title="Accent Color" description="Customize the accent color for backgrounds and highlights">
            <div className="card p-4">
              <div className="flex flex-wrap gap-2 mb-3">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    onClick={() => handleUpdate({ custom_theme_color: c })}
                    className={cn(
                      'w-10 h-10 rounded-full border-2 transition-transform hover:scale-110',
                      settings?.custom_theme_color === c ? 'border-text scale-110' : 'border-border',
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={settings?.custom_theme_color || '#4ade80'}
                  onChange={(e) => handleUpdate({ custom_theme_color: e.target.value })}
                  className="w-12 h-10 rounded cursor-pointer bg-transparent border border-border"
                />
                <span className="text-sm text-text-muted">Or pick a custom color</span>
                {settings?.custom_theme_color && (
                  <button onClick={() => handleUpdate({ custom_theme_color: null })} className="btn-ghost text-xs ml-auto">
                    Reset
                  </button>
                )}
              </div>
            </div>
          </Section>

          {/* Animated backgrounds */}
          <Section title="Animated Background" description="Add ambient effects to your chat">
            <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
              {BACKGROUNDS.map((bg) => (
                <button
                  key={bg.id}
                  onClick={() => handleUpdate({ animated_background: bg.id, background_type: 'animated' })}
                  className={cn(
                    'p-3 rounded-xl border-2 transition-all hover:scale-105 flex flex-col items-center gap-1',
                    settings?.animated_background === bg.id && settings?.background_type !== 'custom' ? 'border-primary bg-primary/10' : 'border-border bg-surface',
                  )}
                >
                  <span className="text-2xl">{bg.icon}</span>
                  <span className="text-xs text-text">{bg.name}</span>
                </button>
              ))}
            </div>
          </Section>

          {/* Custom Background Image */}
          <Section title="Custom Background Image" description="Upload your own image as a background">
            <div className="card p-4">
              <input ref={bgInputRef} type="file" accept="image/*" onChange={handleBgUpload} className="hidden" />
              <div className="flex items-center gap-4">
                <button onClick={() => bgInputRef.current?.click()} disabled={uploadingBg} className="btn-primary text-sm disabled:opacity-50">
                  {uploadingBg ? 'Uploading...' : 'Upload Background Image'}
                </button>
                {settings?.custom_background_url && settings?.background_type === 'custom' && (
                  <>
                    <button onClick={() => handleUpdate({ background_type: 'animated' })} className="btn-ghost text-sm">
                      Use Animated Instead
                    </button>
                    <button onClick={async () => { await handleUpdate({ custom_background_url: null, background_type: 'animated' }); toast.success('Custom background removed') }} className="btn-ghost text-sm text-error">
                      Remove
                    </button>
                  </>
                )}
              </div>
              {settings?.custom_background_url && settings?.background_type === 'custom' && (
                <div className="mt-3 rounded-lg overflow-hidden border border-border">
                  <img src={settings.custom_background_url} alt="background preview" className="w-full h-32 object-cover" />
                </div>
              )}
              <p className="text-xs text-text-muted mt-2">JPG or PNG. The image will cover your entire screen behind the app.</p>
            </div>
          </Section>

          {/* Notifications */}
          <Section title="Notifications" description="Manage how you receive alerts">
            <div className="space-y-3">
              <Toggle label="Enable notifications" description="Show toast notifications for new messages" value={settings?.notifications_enabled ?? true} onChange={(v) => handleUpdate({ notifications_enabled: v })} />
              <Toggle label="Notification sound" description="Play a sound when you receive a message" value={settings?.notification_sound ?? true} onChange={(v) => handleUpdate({ notification_sound: v })} />
              <Toggle label="Email notifications" description="Receive email updates about missed messages" value={settings?.email_notifications ?? false} onChange={(v) => handleUpdate({ email_notifications: v })} />
            </div>
          </Section>

          {/* Notification Types */}
          <Section title="Notification Types" description="Choose which events trigger alerts">
            <div className="space-y-3">
              <Toggle label="New messages" description="Alert when a new message arrives" value={settings?.notify_messages ?? true} onChange={(v) => handleUpdate({ notify_messages: v })} />
              <Toggle label="Reactions" description="Alert when someone reacts to your message" value={settings?.notify_reactions ?? true} onChange={(v) => handleUpdate({ notify_reactions: v })} />
              <Toggle label="Mentions" description="Alert when someone mentions you" value={settings?.notify_mentions ?? true} onChange={(v) => handleUpdate({ notify_mentions: v })} />
              <Toggle label="Friend requests" description="Alert when you receive a friend request" value={settings?.notify_friend_requests ?? true} onChange={(v) => handleUpdate({ notify_friend_requests: v })} />
              <Toggle label="Call invitations" description="Alert when you're invited to a call" value={settings?.notify_call_invites ?? true} onChange={(v) => handleUpdate({ notify_call_invites: v })} />
              <Toggle label="System alerts" description="Alert for admin announcements and system messages" value={settings?.notify_system ?? false} onChange={(v) => handleUpdate({ notify_system: v })} />
            </div>
          </Section>

          {/* Privacy */}
          <Section title="Privacy" description="Control your visibility and data">
            <div className="space-y-3">
              <Toggle label="Show online status" description="Let others see when you're online" value={settings?.show_online_status ?? true} onChange={(v) => handleUpdate({ show_online_status: v })} />
              <Toggle label="DM from friends only" description="Only allow friends to send you direct messages" value={settings?.allow_dm_from_friends_only ?? false} onChange={(v) => handleUpdate({ allow_dm_from_friends_only: v })} />
              <Toggle label="Read receipts" description="Send read receipts when you read messages" value={settings?.read_receipts_enabled ?? true} onChange={(v) => handleUpdate({ read_receipts_enabled: v })} />
              <Toggle label="Typing indicators" description="Show others when you're typing" value={settings?.typing_indicators_enabled ?? true} onChange={(v) => handleUpdate({ typing_indicators_enabled: v })} />
            </div>
          </Section>

          {/* Appearance */}
          <Section title="Appearance" description="Customize your chat experience">
            <div className="space-y-3">
              <Toggle label="Compact mode" description="Reduce spacing between messages" value={settings?.compact_mode ?? false} onChange={(v) => handleUpdate({ compact_mode: v })} />
              <Toggle label="Reduced motion" description="Minimize animations and transitions" value={settings?.reduced_motion ?? false} onChange={(v) => handleUpdate({ reduced_motion: v })} />
            </div>
          </Section>

          {/* Account / Email change */}
          <Section title="Account" description="Manage your account email and password">
            <div className="card p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Current email</span>
                <span className="text-text">{user?.email}</span>
              </div>
              {showEmailChange ? (
                <div className="space-y-3 pt-2">
                  <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="input" placeholder="new-email@example.com" />
                  <input type="password" value={emailPassword} onChange={(e) => setEmailPassword(e.target.value)} className="input" placeholder="Enter your password to confirm" />
                  <div className="flex gap-2">
                    <button onClick={handleChangeEmail} disabled={emailSaving || !newEmail.trim() || !emailPassword} className="btn-primary disabled:opacity-40">
                      {emailSaving ? 'Saving...' : 'Save new email'}
                    </button>
                    <button onClick={() => { setShowEmailChange(false); setNewEmail(''); setEmailPassword('') }} className="btn-ghost">Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowEmailChange(true)} className="btn-ghost text-sm">Change email</button>
              )}
            </div>
          </Section>

          {/* Change Password */}
          <Section title="Change Password" description="Update your account password">
            <div className="card p-4 space-y-3">
              <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="input" placeholder="Current password" />
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input" placeholder="New password" />
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="input" placeholder="Confirm new password" />
              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-error">Passwords do not match</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleChangePassword}
                  disabled={pwSaving || !currentPassword || !newPassword || newPassword !== confirmPassword}
                  className="btn-primary disabled:opacity-40"
                >
                  {pwSaving ? 'Saving...' : 'Update password'}
                </button>
                <button onClick={() => { setCurrentPassword(''); setNewPassword(''); setConfirmPassword('') }} className="btn-ghost">Cancel</button>
              </div>
            </div>
          </Section>

          {/* Debug panel */}
          <Section title="Debug" description="Technical information for troubleshooting">
            <div className="card p-4 space-y-2 font-mono text-xs">
              <div className="flex justify-between"><span className="text-text-muted">User ID:</span><span className="text-text">{profile?.id?.slice(0, 8) || 'N/A'}...</span></div>
              <div className="flex justify-between"><span className="text-text-muted">Admin:</span><span className="text-text">{profile?.is_admin ? 'Yes' : 'No'}</span></div>
              <div className="flex justify-between"><span className="text-text-muted">Supabase URL:</span><span className="text-text truncate ml-2">{import.meta.env.VITE_SUPABASE_URL?.slice(0, 30) || 'N/A'}</span></div>
              <div className="flex justify-between"><span className="text-text-muted">Settings ID:</span><span className="text-text">{settings?.id?.slice(0, 8) || 'N/A'}...</span></div>
              <div className="flex justify-between"><span className="text-text-muted">Background Type:</span><span className="text-text">{settings?.background_type || 'animated'}</span></div>
              <div className="flex justify-between"><span className="text-text-muted">Theme Color:</span><span className="text-text">{settings?.custom_theme_color || 'default'}</span></div>
              <div className="flex justify-between"><span className="text-text-muted">Custom BG:</span><span className="text-text truncate ml-2 max-w-[200px]">{settings?.custom_background_url ? 'Set' : 'None'}</span></div>
            </div>
          </Section>
        </div>
      </div>
    </div>
  )
}

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <h2 className="text-lg font-semibold text-text mb-1">{title}</h2>
      <p className="text-sm text-text-muted mb-4">{description}</p>
      {children}
    </motion.div>
  )
}

function Toggle({ label, description, value, onChange }: { label: string; description: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between p-3 bg-surface rounded-lg">
      <div>
        <p className="text-sm font-medium text-text">{label}</p>
        <p className="text-xs text-text-muted">{description}</p>
      </div>
      <button onClick={() => onChange(!value)} className={cn('relative w-12 h-6 rounded-full transition-colors flex-shrink-0', value ? 'bg-primary' : 'bg-border')}>
        <motion.div layout transition={{ type: 'spring', stiffness: 500, damping: 30 }} className={cn('absolute top-0.5 w-5 h-5 rounded-full bg-white', value ? 'left-6' : 'left-0.5')} />
      </button>
    </div>
  )
}
