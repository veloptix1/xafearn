'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Toast from '@/components/Toast'

export default function SeriesReaderPage() {
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const seriesId = params.id as string

  const [loading, setLoading] = useState(true)
  const [series, setSeries] = useState<any>(null)
  const [episodes, setEpisodes] = useState<any[]>([])
  const [unlockedIds, setUnlockedIds] = useState<string[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [activeEpisode, setActiveEpisode] = useState<any>(null)
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null)
  const [isUnlocking, setIsUnlocking] = useState(false)

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
    }
    setLoading(false)
  }

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ message: msg, type })
    setTimeout(() => setToast(null), 3000)
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
      setActiveEpisode(ep)
      load()
    }
    setIsUnlocking(false)
  }

  // Trouver l'index de l'épisode actuel et le suivant
  const currentIndex = episodes.findIndex(e => e.id === activeEpisode?.id)
  const nextEpisode = episodes[currentIndex + 1]
  const prevEpisode = episodes[currentIndex - 1]
  
  // Vérifier si le prochain épisode est accessible
  const isNextUnlocked = nextEpisode ? (nextEpisode.is_free || unlockedIds.includes(nextEpisode.id)) : false

  if (loading) return <div className="text-center py-20 text-slate-500">Chargement...</div>

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex items-center gap-4 shadow-sm">
        <Link href="/dashboard" className="text-slate-500 hover:text-slate-900 bg-slate-100 p-2 rounded-full transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-sm font-bold text-slate-900 truncate">{series.title}</h1>
      </header>

      <div className="max-w-2xl mx-auto p-4 md:p-6">
        
        {/* Carte de présentation de la série */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm mb-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-sky-100 to-indigo-100 opacity-50"></div>
          
          <div className="flex gap-5 relative z-10">
            {series.cover_url ? (
              <img src={series.cover_url} className="w-28 h-40 rounded-xl object-cover shadow-md bg-white" alt={series.title} />
            ) : (
              <div className="w-28 h-40 bg-slate-100 rounded-xl flex items-center justify-center text-5xl shadow-md border border-slate-200">📖</div>
            )}
            
            <div className="flex-1 flex flex-col justify-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 bg-sky-50 px-2 py-1 rounded inline-block w-fit mb-2">
                {series.content_type}
              </span>
              <h1 className="font-black text-2xl text-slate-900 leading-tight mb-2">{series.title}</h1>
              <p className="text-xs text-slate-500 font-medium mb-3 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                Par {series.profiles?.full_name || 'Auteur inconnu'}
              </p>
            </div>
          </div>
          
          <div className="mt-5 pt-4 border-t border-slate-100 relative z-10">
            <p className="text-sm text-slate-600 leading-relaxed line-clamp-4">{series.description}</p>
          </div>
        </div>

        {/* Liste des épisodes */}
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
                  if (isUnlocked) setActiveEpisode(ep)
                  else handleUnlock(ep)
                }}
                disabled={isUnlocking}
                className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 group relative overflow-hidden ${
                  isUnlocked 
                    ? 'bg-white border-slate-200 hover:border-sky-400 hover:shadow-md cursor-pointer' 
                    : 'bg-slate-50 border-slate-200 opacity-90'
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
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-md">
                          🎁 Gratuit
                        </span>
                      ) : isUnlocked ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-700 bg-sky-100 px-2 py-1 rounded-md">
                          ✅ Débloqué
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded-md">
                          🔒 {ep.price_in_coins} jetons
                        </span>
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

      {/* Lecteur d'épisode (Plein écran) */}
      {activeEpisode && (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col">
          
          {/* Barre supérieure du lecteur */}
          <div className="bg-slate-900 text-white px-4 py-3 flex justify-between items-center shadow-lg border-b border-slate-800">
            <div className="flex-1 pr-4">
              <p className="text-[10px] text-sky-400 font-bold uppercase tracking-wider mb-0.5">Épisode {activeEpisode.episode_number}</p>
              <h2 className="font-bold text-sm truncate">{activeEpisode.title}</h2>
            </div>
            <button 
              onClick={() => setActiveEpisode(null)} 
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg text-xs transition flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              Fermer
            </button>
          </div>

          {/* Contenu de l'épisode */}
          <div className="flex-1 overflow-y-auto flex flex-col items-center p-4">
            <div className="w-full max-w-3xl flex-1 flex items-center justify-center">
              {series.content_type === 'text' && (
                <div className="w-full bg-white rounded-2xl p-8 md:p-12 shadow-2xl my-4">
                  <div className="prose prose-slate max-w-none text-slate-800 leading-relaxed whitespace-pre-wrap font-serif text-lg">
                    {activeEpisode.content_text}
                  </div>
                </div>
              )}

              {series.content_type === 'image' && activeEpisode.content_media_url && (
                <img src={activeEpisode.content_media_url} className="w-full h-auto max-h-[70vh] rounded-xl shadow-2xl object-contain" alt="Épisode" />
              )}

              {series.content_type === 'video' && activeEpisode.content_media_url && (
                <div className="w-full bg-black rounded-xl overflow-hidden shadow-2xl">
                  <video
                    key={activeEpisode.content_media_url}
                    src={activeEpisode.content_media_url}
                    controls
                    autoPlay
                    playsInline
                    preload="metadata"
                    className="w-full h-auto max-h-[70vh]"
                  >
                    Votre navigateur ne supporte pas la vidéo.
                  </video>
                </div>
              )}
            </div>

            {/* 🚀 BARRE DE NAVIGATION EN BAS (Précédent / Suivant) */}
            <div className="w-full max-w-3xl mt-6 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex gap-3 sticky bottom-4 shadow-xl">
              
              {/* Bouton Précédent */}
              <button 
                onClick={() => setActiveEpisode(prevEpisode)}
                disabled={!prevEpisode}
                className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-sm transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                Précédent
              </button>

              {/* Bouton Suivant (Intelligent) */}
              {nextEpisode ? (
                isNextUnlocked ? (
                  // Épisode suivant accessible
                  <button 
                    onClick={() => setActiveEpisode(nextEpisode)}
                    className="flex-[2] py-3 px-4 bg-sky-500 hover:bg-sky-400 text-white rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(14,165,233,0.3)]"
                  >
                    Épisode suivant
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                  </button>
                ) : (
                  // Épisode suivant bloqué
                  <button 
                    onClick={() => handleUnlock(nextEpisode)}
                    disabled={isUnlocking}
                    className="flex-[2] py-3 px-4 bg-amber-500 hover:bg-amber-400 text-white rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.3)] disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    Débloquer pour {nextEpisode.price_in_coins} 🪙
                  </button>
                )
              ) : (
                // Fin de la série
                <button 
                  disabled
                  className="flex-[2] py-3 px-4 bg-slate-800 text-slate-500 rounded-xl font-bold text-sm cursor-not-allowed flex items-center justify-center gap-2"
                >
                  🎉 Fin de la série
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
