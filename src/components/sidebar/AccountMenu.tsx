import { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabase'
import { toast } from '@/stores/toast'

interface AccountMenuProps {
  onClose: () => void
}

interface SavedAccount {
  email: string
  label: string
}

export function AccountMenu({ onClose }: AccountMenuProps) {
  const { profile, signOut } = useAuthStore()
  const navigate = useNavigate()
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([])
  const [showSwitcher, setShowSwitcher] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    toast.info('Signed out')
    navigate('/auth')
    onClose()
  }

  const saveCurrentAccount = () => {
    if (!profile) return
    const email = useAuthStore.getState().user?.email
    if (!email) return
    const stored = localStorage.getItem('forestchat_saved_accounts')
    let accounts: SavedAccount[] = []
    try { accounts = stored ? JSON.parse(stored) : [] } catch {}
    const updated = [...accounts.filter(a => a.email !== email), { email, label: profile.username }]
    localStorage.setItem('forestchat_saved_accounts', JSON.stringify(updated))
    setSavedAccounts(updated)
    toast.success('Account saved for quick switching')
  }

  const switchAccount = async (email: string) => {
    const password = prompt(`Enter password for ${email} to switch accounts:`)
    if (!password) return
    await signOut()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      toast.error('Failed to switch: ' + error.message)
      navigate('/auth')
    } else {
      toast.success(`Switched to ${email}`)
      onClose()
    }
  }

  const removeAccount = (email: string) => {
    const stored = localStorage.getItem('forestchat_saved_accounts')
    if (!stored) return
    try {
      const accounts: SavedAccount[] = JSON.parse(stored)
      const updated = accounts.filter(a => a.email !== email)
      localStorage.setItem('forestchat_saved_accounts', JSON.stringify(updated))
      setSavedAccounts(updated)
    } catch {}
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.15 }}
      className="absolute bottom-0 left-16 w-72 bg-surface border border-border rounded-xl shadow-2xl overflow-hidden z-50"
    >
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-primary/20 flex items-center justify-center">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-primary font-bold text-lg">
                {profile?.username?.[0]?.toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-text truncate">{profile?.display_name || profile?.username}</p>
            <p className="text-xs text-text-muted truncate">@{profile?.username}</p>
          </div>
        </div>
      </div>

      <div className="p-2">
        <MenuItem icon={ProfileIcon} label="My Profile" onClick={() => { navigate('/profile'); onClose() }} />
        <MenuItem icon={SettingsIcon} label="Settings" onClick={() => { navigate('/settings'); onClose() }} />
        <MenuItem icon={PetIcon} label="My Pets" onClick={() => { navigate('/pets'); onClose() }} />

        <div className="my-1 h-px bg-border" />

        <MenuItem icon={SwitchIcon} label="Switch Account" onClick={() => {
          const stored = localStorage.getItem('forestchat_saved_accounts')
          if (stored) { try { setSavedAccounts(JSON.parse(stored)) } catch {} }
          setShowSwitcher(!showSwitcher)
        }} />
        {showSwitcher && (
          <div className="ml-2 mt-1 space-y-1">
            {savedAccounts.map((acc) => (
              <div key={acc.email} className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-surface-hover group">
                <button onClick={() => switchAccount(acc.email)} className="flex-1 text-left text-sm text-text-muted hover:text-text">
                  {acc.label} ({acc.email})
                </button>
                <button onClick={() => removeAccount(acc.email)} className="text-error opacity-0 group-hover:opacity-100">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
            <button onClick={saveCurrentAccount} className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-primary hover:bg-surface-hover">
              + Save current account
            </button>
          </div>
        )}

        <div className="my-1 h-px bg-border" />

        <MenuItem icon={LogoutIcon} label="Logout" onClick={handleSignOut} danger />
      </div>
    </motion.div>
  )
}

function MenuItem({ icon: Icon, label, onClick, danger }: { icon: React.FC<{className?: string}>; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-surface-hover ${danger ? 'text-error' : 'text-text'}`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  )
}

function ProfileIcon({className}: {className?: string}) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
}
function SettingsIcon({className}: {className?: string}) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
}
function PetIcon({className}: {className?: string}) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
}
function SwitchIcon({className}: {className?: string}) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
}
function LogoutIcon({className}: {className?: string}) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
}
