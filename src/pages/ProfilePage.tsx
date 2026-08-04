import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { toast } from '@/stores/toast'
import { relativeTime } from '@/lib/utils'
import type { Profile } from '@/types'

export default function ProfilePage() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const { user, profile } = useAuthStore()
  const [targetProfile, setTargetProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProfile()
  }, [userId])

  async function loadProfile() {
    const targetId = userId || user?.id
    if (!targetId) return
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*').eq('id', targetId).maybeSingle()
    setTargetProfile(data)
    setLoading(false)
  }

  if (loading) {
    return <div className="flex-1 flex items-center justify-center"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
  }

  if (!targetProfile) {
    return <div className="flex-1 flex items-center justify-center text-text-muted">Profile not found</div>
  }

  const isOwn = targetProfile.id === user?.id

  return (
    <div className="flex-1 flex flex-col page-bg overflow-y-auto">
      <div className="h-14 flex items-center px-6 border-b border-border bg-surface">
        <button onClick={() => navigate(-1)} className="btn-ghost text-sm mr-3">Back</button>
        <h1 className="text-lg font-semibold text-text">{isOwn ? 'My Profile' : targetProfile.display_name || targetProfile.username}</h1>
      </div>

      <div className="max-w-2xl mx-auto w-full p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card overflow-hidden mb-4">
          <div className="h-32 bg-gradient-to-r from-primary/30 to-accent/30" />
          <div className="p-6 -mt-16">
            <div className="flex items-end gap-4 mb-4">
              {targetProfile.avatar_url ? (
                <img src={targetProfile.avatar_url} alt="" className="w-24 h-24 rounded-2xl object-cover border-4 border-surface" />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-primary/20 border-4 border-surface flex items-center justify-center text-4xl font-bold text-primary">
                  {targetProfile.username[0]?.toUpperCase()}
                </div>
              )}
            </div>
            <h2 className="text-xl font-bold text-text">{targetProfile.display_name || targetProfile.username}</h2>
            <p className="text-text-muted">@{targetProfile.username}</p>
            {targetProfile.bio && <p className="text-text mt-3">{targetProfile.bio}</p>}
            <div className="flex items-center gap-3 mt-4 text-sm text-text-muted">
              <span className={`px-2 py-1 rounded-full ${targetProfile.status === 'online' ? 'bg-success/20 text-success' : 'bg-surface-hover'}`}>{targetProfile.status}</span>
              <span>Joined {relativeTime(targetProfile.join_date)}</span>
            </div>
            {isOwn && (
              <button onClick={() => navigate('/settings')} className="btn-primary mt-4">Edit Profile</button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
