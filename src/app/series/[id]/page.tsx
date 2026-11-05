'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Toast from '@/components/Toast'

export default function SeriesReaderPage() {
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const seriesId = params.id as string
  const videoRef = useRef<HTMLVideoElement>(null)

  const [loading, setLoading] = useState(true)
  const [series, setSeries] = useState<any>(null)
  const [episodes, setEpisodes] = useState<any[]>([])
  const [unlockedIds, setUnlockedIds] = useState<string[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [activeEpisode, setActiveEpisode] = useState<any>(null)
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null)
  const [isUnlocking, setIsUnlocking] = useState(false)
  const [isVideoEnded, setIsVideoEnded] = useState(false)
  
  // 🚀 État pour les favoris
  const [isFavorite, setIsFavorite] = useState(false)
  const [isTogglingFav, setIsTogglingFav] = useState(false)

  useEffect(() => {
    load()
  }, [seriesId])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: s } = await supabase.from('series').select('*, profiles(full_name)').eq('id', seriesId).single()
    if (!s) return router.push('/dashboard')
    setSeries(s)

    if (!s.is_published && (!user || s.creator_id !== user.id)) {
      setSeries(s)
      setEpisodes([])
      setLoading(false)
      return
    }

    const { data: e } = await supabase.from('episodes').select('*').eq('series_id', seriesId).order('episode_number', { ascending: true })
    setEpisodes(e || [])

    if (user) {
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)
      const { data: unlocks } = await supabase.from('episode_unlocks').select('episode_id').eq('user_id', user.id)
      setUnlockedIds(unlocks?.map(u => u.episode_id) || [])

      // 🚀 On vérifie si la série est en favori
      const { data: fav } = await supabase.from('series_favorites').select('id').eq('user_id', user.id).eq('series_id', seriesId).maybeSingle()
      setIsFavorite(!!fav)
    }
    setLoading(false)
  }

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ message: msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  // 🚀 Fonction pour ajouter/retirer des favoris
  const toggleFavorite = async () => {
    if (!profile) return router.push('/login')
    setIsTogglingFav(true)
    
    try {
      if (isFavorite) {
        await supabase.from('series_favorites').delete().eq('user_id', profile.id).eq('series_id', seriesId)
        setIsFavorite(false)
        showToast('Retiré de tes favoris.', 'success')
      } else {
        await supabase.from('series_favorites').insert({ user_id: profile.id, series_id: seriesId })
        setIsFavorite(true)
        showToast('Ajouté à tes favoris !', 'success')
      }
    } catch (err) {
      showToast('Erreur lors de l\'opération.', 'error')
    } finally {
      setIsTogglingFav(false)
    }
  }

  const handleUnlock = async (ep: any) => {
    if (!profile) return router.push('/login')
    if ((profile.coins_balance || 0) < ep.price_in_coins) {
      return showToast('Solde de jetons insuffisant.', 'error')
    }

    setIsUnlocking(true)
    const { error } = await supabase.rpc('unlock_episode', { p_episode_id: ep.id, p_user_id: profile.id })

    if (error) {
      showToast('Erreur : ' + error.message, 'error')
    } else {
      showToast('Épisode débloqué !', 'success')
      setUnlockedIds(prev => [...prev, ep.id])
      setProfile({ ...profile, coins_balance: profile.coins_balance - ep.price_in_coins })
      playEpisode(ep)
      load()
    }
    setIsUnlocking(false)
  }

  const playEpisode = async (ep: any) => {
    setActiveEpisode(ep)
    setIsVideoEnded(false)
    try {
      await supabase.rpc('increment_episode_views', { p_episode_id: ep.id, p_series_id: seriesId })
    } catch (err) {}
  }

  const currentIndex = episodes.findIndex(e => e.id === activeEpisode?.id)
  const nextEpisode = episodes[currentIndex + 1]
  const prevEpisode = episodes[currentIndex - 1]
  const isNextUnlocked = nextEpisode ? (nextEpisode.is_free || unlockedIds.includes(nextEpisode.id)) : false

  if (loading) return <div className="text-center py-20 text-slate-500">Chargement...</div>

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {!activeEpisode && (
        <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex items-center gap-4 shadow-sm">
          <Link href="/dashboard" className="text-slate-500 hover:text-slate-900 bg-slate-100 p-2 rounded-full transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <h1 className="text-sm font-bold text-slate-900 truncate">{series.title}</h1>
        </header>
      )}

      <div className={`max-w-2xl mx-auto p-4 md:p-6 ${activeEpisode ? 'hidden' : ''}`}>
        
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm mb-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-sky-100 to-indigo-100 opacity-50"></div>
          <div className="flex gap-5 relative z-10">
            {series.cover_url ? (
              <img src={series.cover_url} className="w-28 h-40 rounded-xl object-cover shadow-md bg-white" alt={series.title} />
            ) : (
              <div className="w-28 h-40 bg-slate-100 rounded-xl flex items-center justify-center text-5xl shadow-md border border-slate-200">📖</div>
            )}
            <div className="flex-1 flex flex-col justify-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 bg-sky-50 px-2 py-1 rounded inline-block w-fit mb-2">{series.content_type}</span>
              <h1 className="font-black text-2xl text-slate-900 leading-tight mb-2">{series.title}</h1>
              <p className="text-xs text-slate-500 font-medium mb-3 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                Par {series.profiles?.full_name || 'Auteur'}
              </p>
            </div>
          </div>
          
          <div className="mt-5 pt-4 border-t border-slate-100 relative z-10 flex items-start gap-4">
            <p className="text-sm text-slate-600 leading-relaxed line-clamp-4 flex-1">{series.description}</p>
            
            {/* 🚀 BOUTON FAVORI */}
            {profile && (
              <button 
                onClick={toggleFavorite}
                disabled={isTogglingFav}
                className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                  isFavorite ? 'bg-rose-50 text-rose-500 shadow-inner' : 'bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-400'
                }`}
              >
                <svg className="w-6 h-6" fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="font-black text-lg text-slate-900">Épisodes</h2>
          <span className="bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1 rounded-full">{episodes.length}</span>
        </div>

        <div className="space-y-3">
          {episodes.map((ep: any) => {
            const isUnlocked = ep.is_free || unlockedIds.includes(ep.id)
            return (
              <button
                key={ep.id}
                onClick={() => {
                  if (isUnlocked) playEpisode(ep)
                  else handleUnlock(ep)
                }}
                disabled={isUnlocking}
                className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 group relative overflow-hidden ${
                  isUnlocked ? 'bg-white border-slate-200 hover:border-sky-400 hover:shadow-md cursor-pointer' : 'bg-slate-50 border-slate-200 opacity-90'
                }`}
              >
                <div className="flex justify-between items-center relative z-10">
                  <div className="flex-1 pr-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded">ÉP. {ep.episode_number}</span>
                      <p className={`font-bold text-sm ${isUnlocked ? 'text-slate-900' : 'text-slate-600'}`}>{ep.title}</p>
                    </div>
                    <div className="mt-2">
                      {ep.is_free ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-md">🎁 Gratuit</span>
                      ) : isUnlocked ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-700 bg-sky-100 px-2 py-1 rounded-md">✅ Débloqué</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded-md">🔒 {ep.price_in_coins} jetons</span>
                      )}
                    </div>
                  </div>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition ${isUnlocked ? 'bg-sky-50 text-sky-600 group-hover:bg-sky-500 group-hover:text-white' : 'bg-slate-200 text-slate-400'}`}>
                    {isUnlocked ? (
                      <svg className="w-5 h-5 ml-1" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4l12 6-12 6z" /></svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {activeEpisode && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col">
          <button 
            onClick={() => setActiveEpisode(null)} 
            className="absolute top-4 right-4 z-50 w-10 h-10 bg-black/50 backdrop-blur-md hover:bg-white/20 text-white rounded-full flex items-center justify-center transition border border-white/10"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>

          <div className="absolute top-4 left-4 z-50 bg-black/50 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10">
            <p className="text-[10px] text-sky-400 font-bold uppercase tracking-wider mb-0.5">Épisode {activeEpisode.episode_number}</p>
            <h2 className="font-bold text-sm text-white">{activeEpisode.title}</h2>
          </div>

          <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden">
            {series.content_type === 'video' && activeEpisode.content_media_url && (
              <video
                ref={videoRef}
                key={activeEpisode.content_media_url}
                src={activeEpisode.content_media_url}
                controls
                autoPlay
                playsInline
                onEnded={() => setIsVideoEnded(true)}
                className="w-full h-full object-contain"
              >
                Votre navigateur ne supporte pas la vidéo.
              </video>
            )}

            {series.content_type === 'image' && activeEpisode.content_media_url && (
              <img src={activeEpisode.content_media_url} className="w-full h-full object-contain" alt="Épisode" />
            )}

            {series.content_type === 'text' && (
              <div className="w-full h-full overflow-y-auto bg-slate-900 p-6 md:p-12">
                <div className="max-w-2xl mx-auto prose prose-invert text-slate-200 leading-relaxed whitespace-pre-wrap font-serif text-lg">
                  {activeEpisode.content_text}
                </div>
              </div>
            )}
          </div>

          <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black/90 to-transparent flex justify-between items-end gap-3 pointer-events-none">
            <button 
              onClick={() => playEpisode(prevEpisode)}
              disabled={!prevEpisode}
              className="pointer-events-auto px-5 py-3 bg-black/50 hover:bg-white/20 backdrop-blur-md text-white rounded-full font-bold text-sm transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 border border-white/10"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
              <span className="hidden sm:inline">Précédent</span>
            </button>

            {nextEpisode ? (
              isNextUnlocked ? (
                <button 
                  onClick={() => playEpisode(nextEpisode)}
                  className={`pointer-events-auto px-6 py-3 rounded-full font-bold text-sm transition flex items-center gap-2 shadow-lg ${
                    isVideoEnded || series.content_type !== 'video'
                      ? 'bg-sky-500 hover:bg-sky-400 text-white animate-bounce'
                      : 'bg-black/50 backdrop-blur-md hover:bg-white/20 text-white border border-white/10'
                  }`}
                >
                  <span>Épisode Suivant</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                </button>
              ) : (
                <button 
                  onClick={() => handleUnlock(nextEpisode)}
                  disabled={isUnlocking}
                  className="pointer-events-auto px-6 py-3 bg-amber-500 hover:bg-amber-400 text-white rounded-full font-bold text-sm transition flex items-center gap-2 shadow-lg disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  <span>Débloquer {nextEpisode.price_in_coins} 🪙</span>
                </button>
              )
            ) : (
              <div className="pointer-events-auto px-6 py-3 bg-black/50 backdrop-blur-md text-slate-400 rounded-full font-bold text-sm border border-white/10">
                🎉 Fin de la série
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  )
}
