'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function PublicProfilePage() {
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const userId = params.username as string

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [posts, setPosts] = useState<any[]>([])
  const [isFollowing, setIsFollowing] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: me } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        setCurrentUser(me)
      }

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', userId).single()
      if (!prof) {
        setLoading(false)
        return
      }
      setProfile(prof)

      const { data: p } = await supabase.from('posts').select('*').eq('user_id', userId).order('created_at', { ascending: false })
      setPosts(p || [])

      if (user && user.id !== userId) {
        const { data: f } = await supabase.from('follows').select('*').eq('follower_id', user.id).eq('following_id', userId).maybeSingle()
        setIsFollowing(!!f)
      }

      setLoading(false)
    }
    load()
  }, [userId])

  const handleFollow = async () => {
    if (!currentUser) { window.location.href = '/login'; return }
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', currentUser.id).eq('following_id', userId)
      setIsFollowing(false)
      showToast('Désabonné', 'success')
    } else {
      await supabase.from('follows').insert({ follower_id: currentUser.id, following_id: userId })
      setIsFollowing(true)
      showToast('Abonné !', 'success')
    }
  }

  // 🚀 Démarrer une conversation
  const startConversation = async () => {
    if (!currentUser) { window.location.href = '/login'; return }

    // Vérifier si une conversation existe déjà
    const { data: existing } = await supabase
      .from('conversations')
      .select('*')
      .or(`and(user1_id.eq.${currentUser.id},user2_id.eq.${userId}),and(user1_id.eq.${userId},user2_id.eq.${currentUser.id})`)
      .maybeSingle()

    if (existing) {
      window.location.href = `/dashboard/messages/${existing.id}`
      return
    }

    // Créer une nouvelle conversation
    const { data: newConv, error } = await supabase
      .from('conversations')
      .insert({ user1_id: currentUser.id, user2_id: userId })
      .select()
      .single()

    if (error) {
      showToast('Erreur: ' + error.message, 'error')
      return
    }

    window.location.href = `/dashboard/messages/${newConv.id}`
  }

  const handleShare = async () => {
    const shareUrl = `https://getagriculture.store/u/${userId}`
    const shareText = `Découvre le profil de ${profile?.full_name} sur XAFEARN`

    try {
      const { Share } = await import('@capacitor/share')
      await Share.share({
        title: 'XAFEARN',
        text: shareText,
        url: shareUrl,
        dialogTitle: 'Partager le profil'
      })
    } catch (err) {
      if (navigator.share) {
        try {
          await navigator.share({ title: 'XAFEARN', text: shareText, url: shareUrl })
          return
        } catch (e) {}
      }
      await navigator.clipboard.writeText(shareUrl)
      showToast('Lien copié !', 'success')
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin"></div>
    </div>
  )

  if (!profile) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
      </div>
      <h2 className="text-lg font-bold text-slate-900 mb-2">Profil introuvable</h2>
      <p className="text-slate-500 text-sm mb-4">Cet utilisateur n'existe pas.</p>
      <button onClick={() => { window.location.href = '/dashboard/reseau'; }} className="px-6 py-3 bg-sky-500 text-white font-bold rounded-xl">
        Retour au réseau
      </button>
    </div>
  )

  const levelColor = profile?.level === 3 ? 'from-amber-400 to-amber-600' : profile?.level === 2 ? 'from-slate-400 to-slate-600' : 'from-orange-400 to-orange-600'

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-2xl shadow-2xl font-bold text-sm text-white flex items-center gap-2 w-[90%] max-w-sm ${
          toast.type === 'success' ? 'bg-gradient-to-r from-emerald-500 to-green-500' : 
          toast.type === 'error' ? 'bg-gradient-to-r from-red-500 to-rose-500' : 
          'bg-gradient-to-r from-slate-800 to-slate-900'
        }`}>
          {toast.message}
        </div>
      )}

      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 px-5 py-4 sticky top-0 z-50 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-slate-500 bg-slate-100 p-2 rounded-full active:bg-slate-200 transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="text-lg font-black text-slate-900 flex-1">Profil</h1>
        <button onClick={handleShare} className="text-slate-500 bg-slate-100 p-2 rounded-full active:bg-slate-200 transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
        </button>
      </header>

      <div className="max-w-lg mx-auto">
        
        {/* Carte profil */}
        <div className="bg-white border-b border-slate-200 p-6 text-center relative overflow-hidden">
          <div className={`absolute top-0 left-0 w-full h-20 bg-gradient-to-r ${levelColor}`}></div>
          
          <div className="relative z-10 mt-6">
            <div className="w-24 h-24 bg-white p-1 rounded-full shadow-lg mx-auto">
              <div className="w-full h-full bg-gradient-to-br from-sky-100 to-blue-100 rounded-full flex items-center justify-center text-4xl font-black text-sky-600">
                {profile?.full_name?.charAt(0) || '?'}
              </div>
            </div>
          </div>

          <h2 className="text-xl font-black text-slate-900 mt-3">{profile?.full_name}</h2>
          <p className="text-sm text-slate-500">{profile?.city || 'Ville non définie'}</p>
          
          <div className="mt-3 inline-flex items-center gap-1.5 bg-amber-50 text-amber-600 px-3 py-1 rounded-full border border-amber-100 text-xs font-bold">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
            Niveau {profile?.level || 1}
          </div>

          <div className="flex justify-center gap-8 mt-5 pt-4 border-t border-slate-100">
            <div className="text-center">
              <p className="text-lg font-black text-slate-900">{posts.length}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Publications</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-black text-amber-500">{profile?.coins_balance || 0}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Jetons</p>
            </div>
          </div>

          {currentUser && currentUser.id !== userId && (
            <div className="mt-4 flex gap-2">
              <button 
                onClick={handleFollow} 
                className={`flex-1 py-3 rounded-xl font-bold transition active:scale-95 ${
                  isFollowing 
                    ? 'bg-slate-100 text-slate-700' 
                    : 'bg-sky-500 text-white shadow-md shadow-sky-500/30'
                }`}
              >
                {isFollowing ? 'Se désabonner' : 'Suivre'}
              </button>
              <button 
                onClick={startConversation}
                className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold active:scale-95 transition flex items-center justify-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                Message
              </button>
            </div>
          )}
        </div>

        <div className="p-4 space-y-3">
          <h3 className="font-bold text-slate-900 text-sm">Publications</h3>
          {posts.length === 0 ? (
            <div className="bg-white border border-slate-200 p-8 rounded-2xl text-center text-slate-500 text-sm">
              Aucune publication pour le moment.
            </div>
          ) : (
            posts.map(post => (
              <div key={post.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                {post.content_type === 'image' && post.image_url && (
                  <img src={post.image_url} className="w-full h-auto max-h-80 object-cover" alt="Post" />
                )}
                {post.content_type === 'video' && post.image_url && (
                  <div className="relative w-full bg-black" style={{ aspectRatio: '9/16', maxHeight: '60vh' }}>
                    <video src={post.image_url} controls playsInline className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="p-4">
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{post.text_content}</p>
                  <p className="text-[10px] text-slate-400 mt-2">{new Date(post.created_at).toLocaleDateString('fr-FR')}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  )
}
