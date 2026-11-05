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
  const [isEditSeriesOpen, setIsEditSeriesOpen] = useState(false)
  
  // Edit Series States
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  
  // Add Episode States
  const [epTitle, setEpTitle] = useState('')
  const [epText, setEpText] = useState('')
  const [epMedia, setEpMedia] = useState<File | null>(null)
  const [epPrice, setEpPrice] = useState(10)
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    load()
  }, [seriesId])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.push('/login')

    const { data: s } = await supabase.from('series').select('*').eq('id', seriesId).single()
    if (!s || s.creator_id !== user.id) return router.push('/dashboard/studio')
    
    setSeries(s)
    setEditTitle(s.title)
    setEditDescription(s.description || '')

    const { data: e } = await supabase.from('episodes').select('*').eq('series_id', seriesId).order('episode_number', { ascending: true })
    setEpisodes(e || [])
    setLoading(false)
  }

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ message: msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleSaveSeries = async () => {
    const { error } = await supabase.from('series').update({ title: editTitle, description: editDescription }).eq('id', seriesId)
    if (error) {
      showToast('Erreur : ' + error.message, 'error')
    } else {
      showToast('Série modifiée !', 'success')
      setIsEditSeriesOpen(false)
      load()
    }
  }

  const handleDeleteSeries = async () => {
    if (!confirm('Supprimer DÉFINITIVEMENT cette série et tous ses épisodes ?')) return
    const { error } = await supabase.from('series').delete().eq('id', seriesId)
    if (error) showToast('Erreur : ' + error.message, 'error')
    else router.push('/dashboard/studio')
  }

  const handleDeleteEpisode = async (ep: any) => {
    if (!confirm(`Supprimer l'épisode ${ep.episode_number} ?`)) return
    const { error } = await supabase.from('episodes').delete().eq('id', ep.id)
    if (error) {
      showToast('Erreur : ' + error.message, 'error')
    } else {
      showToast('Épisode supprimé.', 'success')
      load()
    }
  }

  // 🚀 FONCTION D'UPLOAD CLOUDINARY
  const uploadToCloudinary = async (file: File) => {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET

    if (!cloudName || !uploadPreset) {
      throw new Error('Configuration Cloudinary manquante. Vérifie .env.local et Vercel.')
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', uploadPreset)
    formData.append('folder', 'xafearn')

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/video/upload`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const errData = await response.json()
      throw new Error('Erreur Cloudinary : ' + (errData.error?.message || 'Inconnu'))
    }

    const data = await response.json()
    return data.secure_url
  }

  const handleAddEpisode = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsUploading(true)
    
    const nextNumber = episodes.length + 1
    const isFree = nextNumber <= 4

    if (!isFree && (epPrice < 3 || epPrice > 500)) {
      showToast('Le prix doit être entre 3 et 500 jetons.', 'error')
      setIsUploading(false)
      return
    }

    try {
      let mediaUrl = null

      if (series.content_type !== 'text' && epMedia) {
        // Vérification de la durée (2 min max)
        if (series.content_type === 'video') {
          await new Promise((resolve, reject) => {
            const video = document.createElement('video')
            video.preload = 'metadata'
            video.onloadedmetadata = () => {
              window.URL.revokeObjectURL(video.src)
              if (video.duration > 120) {
                reject(new Error('La vidéo ne doit pas dépasser 2 minutes.'))
              } else {
                resolve(true)
              }
            }
            video.onerror = () => reject(new Error('Fichier vidéo invalide ou corrompu.'))
            video.src = URL.createObjectURL(epMedia!)
          })
        }

        if (series.content_type === 'video') {
          // 🚀 UTILISATION DE CLOUDINARY
          showToast('Compression et envoi de la vidéo...', 'success')
          mediaUrl = await uploadToCloudinary(epMedia)
        } else {
          // Pour les images, on garde Supabase
          const ext = epMedia.name.split('.').pop() || 'jpg'
          const fileName = `ep-${seriesId}-${nextNumber}-${Date.now()}.${ext}`
          
          const { error: upErr } = await supabase.storage
            .from('campaign-images')
            .upload(fileName, epMedia, { contentType: epMedia.type })

          if (upErr) throw new Error('Upload image échoué : ' + upErr.message)

          const { data } = supabase.storage.from('campaign-images').getPublicUrl(fileName)
          mediaUrl = data.publicUrl
        }
      }

      if (series.content_type !== 'text' && !mediaUrl) {
        throw new Error('Le fichier n\'a pas été uploadé correctement.')
      }

      const { error } = await supabase.from('episodes').insert({
        series_id: seriesId,
        episode_number: nextNumber,
        title: epTitle || `Épisode ${nextNumber}`,
        content_text: series.content_type === 'text' ? epText : null,
        content_media_url: mediaUrl,
        is_free: isFree,
        price_in_coins: isFree ? null : epPrice
      })

      if (error) throw error

      showToast(`Épisode ${nextNumber} ajouté avec succès !`, 'success')
      setIsAddOpen(false)
      setEpTitle(''); setEpText(''); setEpMedia(null); setEpPrice(10)
      load()
    } catch (err: any) {
      showToast('Erreur : ' + err.message, 'error')
    } finally {
      setIsUploading(false)
    }
  }

  const handleTogglePublish = async () => {
    const { error } = await supabase.from('series').update({ is_published: !series.is_published }).eq('id', seriesId)
    if (!error) {
      showToast(series.is_published ? 'Série dépubliée.' : 'Série publiée !', 'success')
      load()
    }
  }

  if (loading) return <div className="text-center py-20 text-slate-500">Chargement...</div>
  if (!series) return null

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex justify-between items-center">
        <Link href="/dashboard/studio" className="text-slate-500 hover:text-slate-900 bg-slate-100 p-2 rounded-full">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-sm font-bold text-slate-900 truncate px-2">{series.title}</h1>
        <button onClick={() => setIsAddOpen(true)} className="px-3 py-2 bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold rounded-lg transition">
          + Épisode
        </button>
      </header>

      <div className="p-4 md:p-8 max-w-2xl mx-auto mt-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6 shadow-sm">
          <div className="flex gap-4 items-center mb-4">
            {series.cover_url ? (
              <img src={series.cover_url} className="w-20 h-20 rounded-xl object-cover bg-slate-100" alt={series.title} />
            ) : (
              <div className="w-20 h-20 bg-slate-100 rounded-xl flex items-center justify-center text-3xl">📖</div>
            )}
            <div className="flex-1">
              <h2 className="font-black text-slate-900">{series.title}</h2>
              <p className="text-xs text-slate-500 capitalize">{series.content_type} • {series.is_published ? 'Publiée' : 'Brouillon'}</p>
              <p className="text-xs text-amber-600 font-bold mt-1 bg-amber-50 inline-block px-2 py-0.5 rounded">🪙 {series.total_earnings || 0} gagnés</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Link href={`/series/${seriesId}`} target="_blank" className="px-3 py-2 bg-sky-50 text-sky-600 border border-sky-200 rounded-lg text-xs font-bold hover:bg-sky-100 transition">
              Voir la page
            </Link>
            <button onClick={() => setIsEditSeriesOpen(true)} className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition">
              Modifier
            </button>
            <button onClick={handleTogglePublish} className={`px-3 py-2 rounded-lg text-xs font-bold transition ${series.is_published ? 'bg-slate-100 hover:bg-slate-200 text-slate-600' : 'bg-emerald-500 hover:bg-emerald-600 text-white'}`}>
              {series.is_published ? 'Dépublier' : 'Publier'}
            </button>
            <button onClick={handleDeleteSeries} className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-xs font-bold ml-auto transition">
              Supprimer
            </button>
          </div>
        </div>

        <h3 className="font-bold text-slate-900 mb-3">Épisodes ({episodes.length})</h3>
        
        {episodes.length === 0 ? (
          <div className="bg-white border border-slate-200 p-8 rounded-2xl text-center">
            <p className="text-slate-500 text-sm mb-4">Aucun épisode pour le moment.</p>
            <button onClick={() => setIsAddOpen(true)} className="px-4 py-2 bg-sky-500 text-white text-xs font-bold rounded-lg">Ajouter le premier épisode</button>
          </div>
        ) : (
          <div className="space-y-2">
            {episodes.map((ep: any) => (
              <div key={ep.id} className="bg-white border border-slate-200 rounded-xl p-4 flex justify-between items-center shadow-sm">
                <div className="flex-1">
                  <p className="font-bold text-slate-900 text-sm">Ép. {ep.episode_number} : {ep.title}</p>
                  <p className="text-xs text-slate-500">
                    {ep.is_free ? '🎁 Gratuit' : `🪙 ${ep.price_in_coins} jetons`}
                  </p>
                </div>
                <div className="flex gap-2 items-center">
                  {ep.episode_number <= 4 && (
                    <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded">GRATUIT</span>
                  )}
                  <button onClick={() => handleDeleteEpisode(ep)} className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-lg transition">
                    Suppr.
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isEditSeriesOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md p-6">
            <h2 className="font-bold text-lg mb-4">Modifier la série</h2>
            <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-sky-500" />
            <textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} rows={4} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none mb-4 focus:outline-none focus:ring-2 focus:ring-sky-500" />
            <div className="flex gap-2">
              <button onClick={() => setIsEditSeriesOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl text-sm">Annuler</button>
              <button onClick={handleSaveSeries} className="flex-1 py-3 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl text-sm transition">Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {isAddOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="font-bold text-lg mb-4">Nouvel épisode {episodes.length + 1}</h2>
            
            {episodes.length < 4 && (
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl mb-4 text-xs text-emerald-800 font-medium">
                🎁 Cet épisode sera GRATUIT (les 4 premiers sont obligatoires).
              </div>
            )}

            <form onSubmit={handleAddEpisode} className="space-y-4">
              <input type="text" placeholder={`Titre (défaut: Épisode ${episodes.length + 1})`} value={epTitle} onChange={e => setEpTitle(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
              
              {series.content_type === 'text' ? (
                <textarea required placeholder="Écris ton épisode ici..." value={epText} onChange={e => setEpText(e.target.value)} rows={8} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sky-500" />
              ) : (
                <div>
                  <div className="border-2 border-dashed border-slate-200 hover:border-sky-400 rounded-xl p-4 text-center transition">
                    <input 
                      type="file" 
                      required
                      accept={series.content_type === 'video' ? 'video/*' : 'image/*'} 
                      onChange={e => setEpMedia(e.target.files?.[0] || null)} 
                      className="w-full text-xs text-slate-500" 
                    />
                  </div>
                  {series.content_type === 'video' && (
                    <p className="text-xs text-emerald-600 mt-2 font-medium">🚀 Compression automatique via Cloudinary (Max 2 min).</p>
                  )}
                </div>
              )}

              {episodes.length >= 4 && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Prix (3 à 500 jetons)</label>
                  <input type="number" min="3" max="500" required value={epPrice} onChange={e => setEpPrice(parseInt(e.target.value))} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsAddOpen(false)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition">
                  Annuler
                </button>
                <button type="submit" disabled={isUploading} className="flex-1 py-3 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl text-sm transition disabled:opacity-50">
                  {isUploading ? 'Traitement...' : 'Ajouter l\'épisode'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
