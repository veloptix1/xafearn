'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function FollowButton({ currentUserId, profileId, initialIsFollowing }: { currentUserId: string, profileId: string, initialIsFollowing: boolean }) {
  const supabase = createClient()
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
  const [loading, setLoading] = useState(false)

  const toggleFollow = async () => {
    setLoading(true)
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', currentUserId).eq('following_id', profileId)
      setIsFollowing(false)
    } else {
      await supabase.from('follows').insert({ follower_id: currentUserId, following_id: profileId })
      setIsFollowing(true)
    }
    setLoading(false)
  }

  return (
    <button 
      onClick={toggleFollow} 
      disabled={loading}
      className={`px-8 py-2.5 rounded-full font-bold transition shadow-sm ${
        isFollowing 
          ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' 
          : 'bg-sky-500 text-white hover:bg-sky-400'
      } disabled:opacity-50`}
    >
      {loading ? '...' : isFollowing ? 'Abonné' : "S'abonner"}
    </button>
  )
}
