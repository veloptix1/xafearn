'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AdminTasksPage() {
  const supabase = createClient()
  const router = useRouter()
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null)
  
  // État du formulaire
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newReward, setNewReward] = useState('50')
  const [newUrl, setNewUrl] = useState('')
  const [newType, setNewType] = useState('simple')
  const [newImage, setNewImage] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [creating, setCreating] = useState(false)

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.push('/login')
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (!prof || (prof.role !== 'admin' && !prof.is_admin)) return router.push('/dashboard')
    setProfile(prof)

    const { data } = await supabase.from('tasks').select('*').order('created_at', { ascending: false })
    setTasks(data || [])
    setLoading(false)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim() || !newDesc.trim()) return showToast('Titre et description requis.', 'error')
    
    setCreating(true)
    let imageUrl = null

    try {
      // 1. Upload de l'image si présente
      if (newImage) {
        setUploading(true)
        const fileExt = newImage.name.split('.').pop()
        const fileName = `task-${Date.now()}.${fileExt}`
        const { error: uploadError } = await supabase.storage.from('campaign-images').upload(fileName, newImage)
        if (uploadError) throw uploadError

        const { data } = supabase.storage.from('campaign-images').getPublicUrl(fileName)
        imageUrl = data.publicUrl
        setUploading(false)
      }

      // 2. Créer la tâche
      const { data, error } = await supabase.rpc('admin_create_task', {
        p_admin_id: profile.id,
        p_title: newTitle,
        p_description: newDesc,
        p_reward: parseInt(newReward) || 50,
        p_action_url: newUrl || null,
        p_image_url: imageUrl,
        p_type: newType
      })
      if (error) throw error
      if (!data.success) throw new Error(data.error)

      showToast('Tâche créée !', 'success')
      setIsCreateOpen(false)
      setNewTitle(''); setNewDesc(''); setNewReward('50'); setNewUrl(''); setNewType('simple'); setNewImage(null)
      load()
    } catch (err: any) {
      showToast(err.message, 'error')
      setUploading(false)
    }
    setCreating(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette tâche ?')) return
    setActionLoading(id)
    try {
      const { data, error } = await supabase.rpc('admin_delete_task', { p_task_id: id, p_admin_id: profile.id })
      if (error) throw error
      if (!data.success) throw new Error(data.error)
      showToast('Tâche supprimée.', 'success')
      setTasks(prev => prev.filter(t => t.id !== id))
    } catch (err: any) { showToast(err.message, 'error') }
    setActionLoading(null)
  }

  if (loading) return <div className="p-20 text-center text-slate-500">Chargement...</div>

  return (
    <main className="p-4 md:p-6 max-w-4xl mx-auto">
      {toast && <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-bold ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}>{toast.message}</div>}

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Tâches</h1>
          <p className="text-sm text-slate-500">{tasks.length} au total</p>
        </div>
        <button onClick={() => setIsCreateOpen(true)} className="px-4 py-2 bg-sky-500 text-white text-xs font-bold rounded-xl shadow-md">+ Nouvelle tâche</button>
      </div>

      <div className="space-y-3">
        {tasks.length === 0 ? (
          <div className="bg-white border border-slate-200 p-8 rounded-2xl text-center text-slate-500">Aucune tâche.</div>
        ) : (
          tasks.map(t => (
            <div key={t.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex gap-3">
              {t.image_url && (
                <img src={t.image_url} className="w-16 h-16 rounded-lg object-cover shrink-0" alt={t.title} />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-slate-900 text-sm truncate">{t.title}</h3>
                  <span className="bg-amber-50 text-amber-600 text-xs font-bold px-2 py-1 rounded shrink-0 ml-2">{t.reward} F</span>
                </div>
                <p className="text-xs text-slate-500 line-clamp-2 mb-1">{t.description}</p>
                <p className="text-[10px] text-slate-400 uppercase font-bold">{t.type || 'simple'}</p>
              </div>
              <button onClick={() => handleDelete(t.id)} disabled={actionLoading === t.id} className="px-3 py-2 bg-red-50 text-red-600 border border-red-200 font-bold text-xs rounded-lg disabled:opacity-50 self-center">
                Suppr.
              </button>
            </div>
          ))
        )}
      </div>

      {isCreateOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="font-bold text-lg mb-4">Nouvelle tâche</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <input type="text" required value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Titre" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
              <textarea required value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={3} placeholder="Description" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none" />

              {/* 🚀 TYPE DE TÂCHE */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Type de tâche</label>
                <select value={newType} onChange={e => setNewType(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm">
                  <option value="simple">Simple (abonnement, partage...)</option>
                  <option value="diffusion_duration">Diffusion (durée)</option>
                  <option value="app_install">Installation d'app</option>
                  <option value="survey">Sondage</option>
                </select>
              </div>

              <input type="number" value={newReward} onChange={e => setNewReward(e.target.value)} placeholder="Récompense (FCFA)" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
              <input type="url" value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="URL de l'action (optionnel)" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" />

              {/* 🚀 UPLOAD IMAGE */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Image (optionnel)</label>
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center relative">
                  <input type="file" accept="image/*" onChange={e => setNewImage(e.target.files?.[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  {newImage ? (
                    <p className="text-sm text-emerald-600 font-bold">Image prête</p>
                  ) : (
                    <p className="text-sm text-slate-500">Ajouter une image</p>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsCreateOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl">Annuler</button>
                <button type="submit" disabled={creating || uploading} className="flex-1 py-3 bg-sky-500 text-white font-bold rounded-xl disabled:opacity-50">
                  {creating || uploading ? '...' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
