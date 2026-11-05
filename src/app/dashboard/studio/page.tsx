'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Toast from '@/components/Toast'

// Liste des catégories disponibles
const CATEGORIES = ['Romance', 'Action', 'Thriller', 'Fantastique', 'Science-Fiction', 'Drame', 'Comédie', 'Horreur', 'Aventure', 'Général']

export default function StudioPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [series, setSeries] = useState<any[]>([])
  const [stats, setStats] = useState({ totalViews: 0, totalEarnings: 0, totalEpisodes: 0 })
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  // Formulaire de création
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newType, setNewType] = useState<'text' | 'image' | 'video'>('text')
  const [newCategory, setNewCategory] = useState('Général')
  const [newCover, setNewCover] = useState<File | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.push('/login')

    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (!prof) return router.push('/login')
    setProfile(prof)

    const { data: seriesData } = await supabase.from('series').select('*').eq('creator_id', user.id).order('created_at', { ascending: false })
    setSeries(seriesData || [])

    if (seriesData && seriesData.length > 0) {
      const totalEarnings = seriesData.reduce((acc, s) => acc + (s.total_earnings || 0), 0)
      const seriesIds = seriesData.map(s => s.id)
      const { data: episodesData } = await supabase.from('episodes').select('id, views_count').in('series_id', seriesIds)
      
      const totalEpisodes = episodesData?.length || 0
      const totalViews = episodesData?.reduce((acc, e) => acc + (e.views_count || 0), 0) || 0

      setStats({ totalEarnings, totalEpisodes, totalViews })
    }

    setLoading(false)
  }

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ message: msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleCreateSeries = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return showToast('Le titre est requis.', 'error')
    if (!profile) return

    setIsCreating(true)
    let coverUrl = null

    try {
      if (newCover) {
        const fileExt = newCover.name.split('.').pop()
        const fileName = `cover-${profile.id}-${Date.now()}.${fileExt}`
        const { error: upErr } = await supabase.storage.from('campaign-images').upload(fileName, newCover)
        if (upErr) throw new Error('Erreur upload couverture : ' + upErr.message)
        const { data } = supabase.storage.from('campaign-images').getPublicUrl(fileName)
        coverUrl = data.publicUrl
      }

      const { error } = await supabase.from('series').insert({
        creator_id: profile.id,
        title: newTitle,
        description: newDescription,
        content_type: newType,
        category: newCategory,
        cover_url: coverUrl,
        is_published: false
      })

      if (error) throw error

      showToast('Série créée ! Ajoute ton premier épisode.', 'success')
      setIsCreateOpen(false)
      setNewTitle(''); setNewDescription(''); setNewCover(null); setNewType('text'); setNewCategory('Général')
      load()
    } catch (err: any) {
      showToast(err.message, 'error')
    } finally {
      setIsCreating(false)
    }
  }

  if (loading) return <div className="text-center py-20 text-slate-500">Chargement...</div>

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-slate-500 hover:text-slate-900 bg-slate-100 p-2 rounded-full">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <h1 className="text-lg font-black text-slate-900">Mon Studio</h1>
        </div>
        <button onClick={() => setIsCreateOpen(true)} className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold rounded-xl transition shadow-sm">
          + Nouvelle série
        </button>
      </header>

      <div className="p-4 md:p-8 max-w-4xl mx-auto mt-4">
        
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 bg-sky-50 text-sky-500 rounded-full flex items-center justify-center mb-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            </div>
            <p className="text-2xl font-black text-slate-900">{stats.totalViews}</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">Vues totales</p>
          </div>
          
          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 bg-purple-50 text-purple-500 rounded-full flex items-center justify-center mb-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </div>
            <p className="text-2xl font-black text-slate-900">{stats.totalEpisodes}</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">Épisodes</p>
          </div>

          <div className="bg-gradient-to-br from-amber-400 to-orange-500 p-4 rounded-2xl shadow-md flex flex-col items-center justify-center text-center text-white">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mb-2">
              <span className="text-lg">🪙</span>
            </div>
            <p className="text-2xl font-black">{stats.totalEarnings.toLocaleString('fr-FR')}</p>
            <p className="text-[10px] font-bold text-amber-100 uppercase tracking-wider mt-1">Gains totaux</p>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-slate-900">Mes Séries</h2>
          <span className="text-xs font-bold text-slate-400">{series.length} série(s)</span>
        </div>

        {series.length === 0 ? (
          <div className="bg-white border border-slate-200 p-8 rounded-3xl text-center shadow-sm">
            <div className="text-5xl mb-4">🎬</div>
            <h3 className="font-bold text-lg text-slate-900 mb-2">Tu n'as pas encore de série</h3>
            <p className="text-sm text-slate-500 mb-6">Crée ta première histoire et commence à gagner de l'argent.</p>
            <button onClick={() => setIsCreateOpen(true)} className="px-6 py-3 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl transition">
              Créer ma série
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {series.map((s: any) => (
              <Link key={s.id} href={`/dashboard/studio/${s.id}`} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-lg hover:border-sky-300 transition group flex gap-4 items-center">
                {s.cover_url ? (
                  <img src={s.cover_url} className="w-16 h-20 rounded-xl object-cover shadow-sm bg-slate-100" alt={s.title} />
                ) : (
                  <div className="w-16 h-20 bg-slate-100 rounded-xl flex items-center justify-center text-2xl">📖</div>
                )}
                <div className="flex-1">
                  <h3 className="font-bold text-slate-900 group-hover:text-sky-600 transition">{s.title}</h3>
                  <p className="text-xs text-slate-500 capitalize mb-2">{s.content_type} • {s.is_published ? '🟢 Publiée' : '🟡 Brouillon'}</p>
                  <div className="flex items-center gap-3">
                    <p className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">🪙 {s.total_earnings || 0}</p>
                    <p className="text-[10px] font-bold text-sky-600 uppercase">Gérer →</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Modal de création */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="font-bold text-lg mb-4">Créer une nouvelle série</h2>
            <form onSubmit={handleCreateSeries} className="space-y-4">
              <input type="text" required placeholder="Titre de la série" value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
              <textarea placeholder="Résumé de l'histoire..." value={newDescription} onChange={e => setNewDescription(e.target.value)} rows={3} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sky-500" />
              
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase mb-2">Type de contenu</p>
                <div className="flex gap-2">
                  {['text', 'image', 'video'].map((type) => (
                    <button key={type} type="button" onClick={() => setNewType(type as any)} className={`flex-1 py-2 rounded-lg text-xs font-bold capitalize transition ${newType === type ? 'bg-sky-500 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                      {type === 'text' ? '📝 Texte' : type === 'image' ? '🖼️ Image' : '🎥 Vidéo'}
                    </button>
                  ))}
                </div>
              </div>

              {/* 🚀 NOUVEAU : Choix de la catégorie */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase mb-2">Catégorie</p>
                <select 
                  value={newCategory} 
                  onChange={e => setNewCategory(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-500 uppercase mb-2">Couverture (Optionnel)</p>
                <div className="border-2 border-dashed border-slate-200 hover:border-sky-400 rounded-xl p-3 text-center transition">
                  <input type="file" accept="image/*" onChange={e => setNewCover(e.target.files?.[0] || null)} className="w-full text-xs text-slate-500" />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsCreateOpen(false)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition">Annuler</button>
                <button type="submit" disabled={isCreating} className="flex-1 py-3 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl text-sm transition disabled:opacity-50">
                  {isCreating ? 'Création...' : 'Créer la série'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
