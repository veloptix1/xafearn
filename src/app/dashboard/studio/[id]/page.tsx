'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Toast from '@/components/Toast'

export default function SeriesEditorPage() {
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const seriesId = params.id as string
  
  const [loading, setLoading] = useState(true)
  const [series, setSeries] = useState<any>(null)
  const [episodes, setEpisodes] = useState<any[]>([])
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null)
  const [isAddOpen, setIsAddOpen] = useState(false)

  // Formulaire d'épisode
  const [epTitle, setEpTitle] = useState('')
  const [epText, setEpText] = useState('')
  const [epMedia, setEpMedia] = useState<File | null>(null)
  const [epPrice, setEpPrice] = useState(10)
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => { load() }, [seriesId])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.push('/login')
    
    const { data: s } = await supabase.from('series').select('*').eq('id', seriesId).single()
    if (!s || s.creator_id !== user.id) return router.push('/dashboard/studio')
    setSeries(s)

    const { data: e } = await supabase.from('episodes').select('*').eq('series_id', seriesId).order('episode_number', { ascending: true })
    setEpisodes(e || [])
    setLoading(false)
  }

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ message: msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleAddEpisode = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsUploading(true)

    const nextNumber = episodes.length + 1
    const isFree = nextNumber <= 4 // 4 premiers gratuits obligatoires

    if (epPrice < 3 || epPrice > 500) {
      showToast('Le prix doit être entre 3 et 500 jetons.', 'error')
      setIsUploading(false)
      return
    }

    try {
      let mediaUrl = null
      
      if (series.content_type !== 'text' && epMedia) {
        // Vérifier la durée si c'est une vidéo
        if (series.content_type === 'video') {
          const video = document.createElement('video')
          video.preload = 'metadata'
          await new Promise((resolve, reject) => {
            video.onloadedmetadata = () => {
              if (video.duration > 120) reject(new Error('Vidéo > 2 minutes'))
              else resolve(null)
            }
            video.onerror = reject
            video.src = URL.createObjectURL(epMedia!)
          })
        }

        const fileName = `ep-${seriesId}-${nextNumber}-${Date.now()}.${series.content_type === 'video' ? 'mp4' : 'jpg'}`
        const { error: upErr } = await supabase.storage.from('campaign-images').upload(fileName, epMedia)
        if (upErr) throw upErr
        const { data } = supabase.storage.from('campaign-images').getPublicUrl(fileName)
        mediaUrl = data.publicUrl
      }

      const { error } = await supabase.from('episodes').insert({
        series_id: seriesId,
        episode_number: nextNumber,
        title: epTitle || `Épisode ${nextNumber}`,
        content_text: series.content_type === 'text' ? epText : null,
        content_media_url: mediaUrl,
        is_free: isFree,
        price_in_coins: isFree ? 0 : epPrice
      })

      if (error) throw error

      showToast(`Épisode ${nextNumber} ajouté ${isFree ? '(GRATUIT)' : `(payant - ${epPrice} jetons)`} !`, 'success')
      setIsAddOpen(false)
      setEpTitle(''); setEpText(''); setEpMedia(null); setEpPrice(10)
      load()
    } catch (err: any) {
      showToast('Erreur : ' + err.message, 'error')
    }
    setIsUploading(false)
  }

  const handleTogglePublish = async () => {
    const { error } = await supabase.from('series').update({ is_published: !series.is_published }).eq('id', seriesId)
    if (!error) {
      showToast(series.is_published ? 'Série dépubliée.' : 'Série publiée !', 'success')
      load()
    }
  }

  if (loading) return <div className="text-center py-20 text-slate-500">Chargement...</div>

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex justify-between items-center">
        <Link href="/dashboard/studio" className="text-slate-500 hover:text-slate-900 bg-slate-100 p-2 rounded-full">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-sm font-bold text-slate-900 truncate px-2">{series.title}</h1>
        <button onClick={() => setIsAddOpen(true)} className="px-3 py-2 bg-sky-500 text-white text-xs font-bold rounded-lg">+ Épisode</button>
      </header>

      <div className="p-4 md:p-8 max-w-2xl mx-auto mt-4">
        
        {/* Carte série */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6 flex gap-4 items-center shadow-sm">
          {series.cover_url ? (
            <img src={series.cover_url} className="w-20 h-20 rounded-xl object-cover" />
          ) : (
            <div className="w-20 h-20 bg-slate-100 rounded-xl flex items-center justify-center text-3xl">📖</div>
          )}
          <div className="flex-1">
            <h2 className="font-black text-slate-900">{series.title}</h2>
            <p className="text-xs text-slate-500">{series.content_type} • {series.is_published ? 'Publiée' : 'Brouillon'}</p>
            <p className="text-xs text-amber-600 font-bold mt-1">🪙 {series.total_earnings || 0} gagnés</p>
          </div>
          <div className="flex gap-2">
            <Link 
              href={`/series/${seriesId}`} 
              target="_blank" 
              className="px-3 py-2 bg-sky-50 text-sky-600 border border-sky-200 rounded-lg text-xs font-bold"
            >
              Voir
            </Link>
            <button onClick={handleTogglePublish} className={`px-3 py-2 rounded-lg text-xs font-bold ${series.is_published ? 'bg-slate-100 text-slate-600' : 'bg-emerald-500 text-white'}`}>
              {series.is_published ? 'Dépublier' : 'Publier'}
            </button>
          </div>
        </div>

        {/* Liste des épisodes */}
        <h3 className="font-bold text-slate-900 mb-3">Épisodes ({episodes.length})</h3>
        
        {episodes.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl text-center text-slate-500 text-sm">Aucun épisode. Clique sur "+ Épisode" pour commencer.</div>
        ) : (
          <div className="space-y-2">
            {episodes.map((ep: any) => (
              <div key={ep.id} className="bg-white border border-slate-200 rounded-xl p-4 flex justify-between items-center">
                <div>
                  <p className="font-bold text-slate-900 text-sm">
                    Ép. {ep.episode_number} : {ep.title}
                  </p>
                  <p className="text-xs text-slate-500">
                    {ep.is_free ? '🎁 Gratuit' : `🪙 ${ep.price_in_coins} jetons`}
                  </p>
                </div>
                {ep.episode_number <= 4 && (
                  <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded">OBLIGATOIRE GRATUIT</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal d'ajout d'épisode */}
      {isAddOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="font-bold text-lg mb-4">Nouvel épisode {episodes.length + 1}</h2>
            
            {episodes.length < 4 && (
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl mb-4 text-xs text-emerald-800 font-medium">
                🎁 Cet épisode sera GRATUIT (les 4 premiers sont obligatoirement gratuits).
              </div>
            )}

            <form onSubmit={handleAddEpisode} className="space-y-3">
              <input type="text" placeholder={`Titre (défaut: Épisode ${episodes.length + 1})`} value={epTitle} onChange={e => setEpTitle(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
              
              {series.content_type === 'text' ? (
                <textarea required placeholder="Écris ton épisode ici..." value={epText} onChange={e => setEpText(e.target.value)} rows={8} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none" />
              ) : (
                <div>
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-3 text-center">
                    <input type="file" accept={series.content_type === 'video' ? 'video/*' : 'image/*'} onChange={e => setEpMedia(e.target.files?.[0] || null)} className="w-full text-xs" />
                  </div>
                  {series.content_type === 'video' && (
                    <p className="text-xs text-amber-600 mt-2">⚠️ Vidéo max 2 minutes pour les comptes créateurs.</p>
                  )}
                </div>
              )}

              {episodes.length >= 4 && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Prix (3 à 500 jetons)</label>
                  <input type="number" min="3" max="500" required value={epPrice} onChange={e => setEpPrice(parseInt(e.target.value))} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsAddOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl text-sm">Annuler</button>
                <button type="submit" disabled={isUploading} className="flex-1 py-3 bg-sky-500 text-white font-bold rounded-xl text-sm disabled:opacity-50">
                  {isUploading ? 'Ajout...' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
