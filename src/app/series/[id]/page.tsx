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

  useEffect(() => { load() }, [seriesId])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    
    const { data: s } = await supabase.from('series').select('*, profiles(full_name)').eq('id', seriesId).single()
    if (!s) return router.push('/dashboard')
    setSeries(s)

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
      showToast('Épisode débloqué ! Bonne lecture.', 'success')
      setUnlockedIds(prev => [...prev, ep.id])
      setProfile({ ...profile, coins_balance: profile.coins_balance - ep.price_in_coins })
      setActiveEpisode(ep)
      load()
    }
    setIsUnlocking(false)
  }

  if (loading) return <div className="text-center py-20 text-slate-500">Chargement...</div>

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex items-center gap-4">
        <Link href="/dashboard" className="text-slate-500 hover:text-slate-900 bg-slate-100 p-2 rounded-full">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-sm font-bold text-slate-900 truncate">{series.title}</h1>
      </header>

      <div className="max-w-2xl mx-auto p-4">
        {/* Bannière de la série */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm mb-6">
          <div className="flex gap-4">
            {series.cover_url ? (
              <img src={series.cover_url} className="w-24 h-32 rounded-xl object-cover" />
            ) : (
              <div className="w-24 h-32 bg-slate-100 rounded-xl flex items-center justify-center text-4xl">📖</div>
            )}
            <div className="flex-1">
              <h1 className="font-black text-xl text-slate-900 mb-2">{series.title}</h1>
              <p className="text-xs text-slate-500 mb-2">Par {series.profiles?.full_name}</p>
              <p className="text-sm text-slate-600 line-clamp-3">{series.description}</p>
            </div>
          </div>
        </div>

        {/* Liste des épisodes */}
        <h2 className="font-bold text-slate-900 mb-3">Épisodes</h2>
        <div className="space-y-2">
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
                className={`w-full text-left p-4 rounded-xl border transition ${isUnlocked ? 'bg-white border-slate-200 hover:border-sky-300' : 'bg-slate-100 border-slate-200'}`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold text-sm text-slate-900">Ép. {ep.episode_number} : {ep.title}</p>
                    <p className="text-xs text-slate-500">
                      {ep.is_free ? '🎁 Gratuit' : isUnlocked ? '✅ Débloqué' : `🔒 ${ep.price_in_coins} jetons`}
                    </p>
                  </div>
                  {!isUnlocked && <span className="text-amber-500 text-lg">🔒</span>}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Lecteur d'épisode */}
      {activeEpisode && (
        <div className="fixed inset-0 z-[100] bg-white overflow-y-auto">
          <div className="max-w-2xl mx-auto p-4">
            <div className="flex justify-between items-center mb-6 sticky top-0 bg-white py-2">
              <div>
                <p className="text-xs text-slate-500">Épisode {activeEpisode.episode_number}</p>
                <h2 className="font-bold text-slate-900">{activeEpisode.title}</h2>
              </div>
              <button onClick={() => setActiveEpisode(null)} className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg text-sm">Fermer</button>
            </div>

            {/* Contenu */}
            {series.content_type === 'text' && (
              <div className="prose prose-slate max-w-none text-slate-800 leading-relaxed whitespace-pre-wrap">
                {activeEpisode.content_text}
              </div>
            )}
            {series.content_type === 'image' && activeEpisode.content_media_url && (
              <img src={activeEpisode.content_media_url} className="w-full rounded-xl" />
            )}
            {series.content_type === 'video' && activeEpisode.content_media_url && (
              <video src={activeEpisode.content_media_url} controls className="w-full rounded-xl bg-black" />
            )}
          </div>
        </div>
      )}
    </main>
  )
}
