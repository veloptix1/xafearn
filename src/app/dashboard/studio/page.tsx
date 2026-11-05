'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Toast from '@/components/Toast'

export default function StudioPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [series, setSeries] = useState<any[]>([])
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newType, setNewType] = useState<'text' | 'image' | 'video'>('text')
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

    const { data } = await supabase.from('series').select('*').eq('creator_id', user.id).order('created_at', { ascending: false })
    setSeries(data || [])
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
        cover_url: coverUrl,
        is_published: false
      })

      if (error) throw error

      showToast('Série créée ! Ajoute ton premier épisode.', 'success')
      setIsCreateOpen(false)
      setNewTitle(''); setNewDescription(''); setNewCover(null); setNewType('text')
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
        <button onClick={() => setIsCreateOpen(true)} className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold rounded-xl transition">
          + Nouvelle série
        </button>
      </header>

      <div className="p-4 md:p-8 max-w-2xl mx-auto mt-4">
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
          <div className="space-y-3">
            {series.map((s: any) => (
              <Link key={s.id} href={`/dashboard/studio/${s.id}`} className="block bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-sky-300 transition">
                <div className="flex gap-4 items-center">
                  {s.cover_url ? (
                    <img src={s.cover_url} className="w-16 h-16 rounded-lg object-cover bg-slate-100" alt={s.title} />
                  ) : (
                    <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center text-2xl">📖</div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-900">{s.title}</h3>
                    <p className="text-xs text-slate-500 capitalize">{s.content_type} • {s.is_published ? 'Publiée' : 'Brouillon'}</p>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    <p className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded">🪙 {s.total_earnings || 0}</p>
                    <span className="text-[10px] font-bold text-sky-600">Gérer →</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

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
