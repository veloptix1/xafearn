'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Toast from '@/components/Toast'

export default function AdminTasksPage() {
  const supabase = createClient()
  const router = useRouter()
  
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null)
  
  // État pour le formulaire (Drawer)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<any>(null)
  
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [reward, setReward] = useState('50')
  const [actionUrl, setActionUrl] = useState('')
  const [type, setType] = useState('simple')
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isPremium, setIsPremium] = useState(false)
  
  // État pour voir les preuves
  const [viewingSubmissions, setViewingSubmissions] = useState<any>(null)
  const [submissions, setSubmissions] = useState<any[]>([])
  const [loadingSubmissions, setLoadingSubmissions] = useState(false)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => setToast({ message: msg, type })

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!prof || (prof.role !== 'admin' && !prof.is_admin)) return router.push('/dashboard')
      
      setIsAdmin(true)
      setProfile(prof)
      await fetchTasks()
      setLoading(false)
    }
    load()
  }, [router, supabase])

  async function fetchTasks() {
    const { data } = await supabase.from('tasks').select('*').order('created_at', { ascending: false })
    setTasks(data || [])
  }

  const openCreateForm = () => {
    setEditingTask(null)
    setTitle(''); setDescription(''); setReward('50'); setActionUrl(''); setType('simple'); setImage(null); setImagePreview(null); setIsPremium(false)
    setIsFormOpen(true)
  }

  const openEditForm = (task: any) => {
    setEditingTask(task)
    setTitle(task.title || ''); setDescription(task.description || ''); setReward(String(task.reward || 50)); setActionUrl(task.action_url || ''); setType(task.type || 'simple'); setIsPremium(task.is_premium || false)
    setImage(null); setImagePreview(task.image_url || null)
    setIsFormOpen(true)
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) { setImage(file); setImagePreview(URL.createObjectURL(file)) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !description.trim()) return showToast('Titre et description requis.', 'error')

    setLoading(true)
    try {
      let imageUrl = imagePreview
      // Upload de la nouvelle image si changée
      if (image) {
        const ext = image.name.split('.').pop()
        const fileName = `task-${Date.now()}.${ext}`
        const { error: uploadErr } = await supabase.storage.from('campaign-images').upload(fileName, image)
        if (uploadErr) throw uploadErr
        const { data } = supabase.storage.from('campaign-images').getPublicUrl(fileName)
        imageUrl = data.publicUrl
      }

      if (editingTask) {
        // Modification
        const { error } = await supabase.rpc('admin_update_task', {
          p_task_id: editingTask.id, p_admin_id: profile.id, p_title: title.trim(),
          p_description: description.trim(), p_reward: parseInt(reward) || 50,
          p_action_url: actionUrl || null, p_image_url: imageUrl, p_type: type, p_is_premium: isPremium
        })
        if (error) throw error
        showToast('Tâche modifiée !', 'success')
      } else {
        // Création
        const { data, error } = await supabase.rpc('admin_create_task', {
          p_admin_id: profile.id, p_title: title.trim(), p_description: description.trim(),
          p_reward: parseInt(reward) || 50, p_action_url: actionUrl || null, p_image_url: imageUrl, p_type: type
        })
        if (error) throw error
        if (!data.success) throw new Error(data.error)
        showToast('Tâche créée !', 'success')
      }

      setIsFormOpen(false)
      await fetchTasks()
    } catch (err: any) { showToast(err.message, 'error') }
    setLoading(false)
  }

  const handleDelete = async (task: any) => {
    if (!confirm(`Supprimer la tâche "${task.title}" ?`)) return
    try {
      const { error } = await supabase.rpc('admin_delete_task', { p_task_id: task.id, p_admin_id: profile.id })
      if (error) throw error
      setTasks(prev => prev.filter(t => t.id !== task.id))
      showToast('Tâche supprimée.', 'success')
    } catch (err: any) { showToast(err.message, 'error') }
  }

  const loadSubmissions = async (task: any) => {
    setViewingSubmissions(task)
    setLoadingSubmissions(true)
    const { data, error } = await supabase.rpc('get_task_submissions', { p_task_id: task.id })
    if (!error && data) setSubmissions(data)
    setLoadingSubmissions(false)
  }

  const validateSubmission = async (subId: string, status: 'approved' | 'rejected') => {
    if (!confirm(`Voulez-vous ${status === 'approved' ? 'approuver' : 'rejeter'} cette preuve ?`)) return
    try {
      const { error } = await supabase.rpc('admin_validate_submission', { p_submission_id: subId, p_admin_id: profile.id, p_status: status })
      if (error) throw error
      showToast(`Preuve ${status === 'approved' ? 'approuvée' : 'rejetée'} !`, 'success')
      // Recharger
      const { data } = await supabase.rpc('get_task_submissions', { p_task_id: viewingSubmissions.id })
      if (data) setSubmissions(data)
    } catch (err: any) { showToast(err.message, 'error') }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="w-10 h-10 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin"></div></div>
  if (!isAdmin) return null

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-40 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/admin" className="text-slate-500 bg-slate-100 p-2 rounded-full hover:bg-slate-200 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Gestion des Tâches</h1>
            <p className="text-xs text-slate-500">{tasks.length} tâches au total</p>
          </div>
        </div>
        <button onClick={openCreateForm} className="px-4 py-2 bg-sky-500 text-white text-xs font-bold rounded-xl shadow-md active:scale-95 transition">
          + Nouvelle tâche
        </button>
      </header>

      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        {tasks.length === 0 ? (
          <div className="bg-white border border-slate-200 p-10 rounded-2xl text-center text-slate-500">
            <p className="text-sm">Aucune tâche créée pour le moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tasks.map(t => (
              <div key={t.id} className={`bg-white border rounded-2xl shadow-sm overflow-hidden ${t.is_premium ? 'border-amber-300 ring-1 ring-amber-100' : 'border-slate-200'}`}>
                {t.image_url && (
                  <div className="h-32 w-full bg-slate-100 relative">
                    <img src={t.image_url} className="w-full h-full object-cover" alt={t.title} />
                    {t.is_premium && (
                      <div className="absolute top-2 right-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow">👑 Premium</div>
                    )}
                  </div>
                )}
                <div className="p-4">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-bold text-slate-900 text-sm leading-tight">{t.title}</h3>
                    <span className="bg-emerald-50 text-emerald-700 font-black text-xs px-2 py-1 rounded-lg border border-emerald-100 shrink-0 ml-2">{t.reward} F</span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2 mb-3">{t.description}</p>
                  <p className="text-[10px] text-slate-400 uppercase font-bold mb-4">{t.type || 'simple'}</p>
                  
                  <div className="flex gap-2">
                    <button onClick={() => loadSubmissions(t)} className="flex-1 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-lg hover:bg-slate-200 transition">Voir preuves</button>
                    <button onClick={() => openEditForm(t)} className="px-3 py-2 bg-sky-50 text-sky-600 font-bold text-xs rounded-lg hover:bg-sky-100 transition">Modifier</button>
                    <button onClick={() => handleDelete(t)} className="px-3 py-2 bg-red-50 text-red-600 font-bold text-xs rounded-lg hover:bg-red-100 transition">Suppr.</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 🚀 DRAWER : FORMULAIRE CRÉER / MODIFIER */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsFormOpen(false)}></div>
          <div className="relative bg-white w-full max-w-md h-full shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center z-10">
              <h2 className="font-bold text-slate-900">{editingTask ? 'Modifier la tâche' : 'Nouvelle tâche'}</h2>
              <button onClick={() => setIsFormOpen(false)} className="p-2 bg-slate-100 rounded-full text-slate-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Titre</label>
                <input type="text" required value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: S'abonner à une chaîne" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-sky-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Description</label>
                <textarea required rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Détails de la mission..." className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-sky-500 resize-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Type de tâche</label>
                <select value={type} onChange={e => setType(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-sky-500">
                  <option value="simple">Simple (abonnement, partage...)</option>
                  <option value="diffusion_duration">Diffusion (durée)</option>
                  <option value="app_install">Installation d'app</option>
                  <option value="survey">Sondage</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Récompense (FCFA)</label>
                <input type="number" required value={reward} onChange={e => setReward(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-sky-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">URL de l'action (optionnel)</label>
                <input type="url" value={actionUrl} onChange={e => setActionUrl(e.target.value)} placeholder="https://..." className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-sky-500" />
              </div>
              
              <div className="flex items-center justify-between bg-amber-50 border border-amber-200 p-3 rounded-xl">
                <div>
                  <p className="text-xs font-bold text-amber-800">Tâche Premium 👑</p>
                  <p className="text-[10px] text-amber-600">Réservé aux membres activés</p>
                </div>
                <input type="checkbox" checked={isPremium} onChange={e => setIsPremium(e.target.checked)} className="w-5 h-5 accent-amber-500 rounded" />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Image (optionnel)</label>
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center relative">
                  <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  {imagePreview ? <img src={imagePreview} className="w-full h-24 object-cover rounded-lg" /> : <p className="text-sm text-slate-500">Clique pour ajouter une image</p>}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsFormOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl">Annuler</button>
                <button type="submit" className="flex-1 py-3 bg-sky-500 text-white font-bold rounded-xl shadow-md active:scale-[0.98] transition">
                  {editingTask ? 'Enregistrer' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🚀 DRAWER : VOIR LES PREUVES */}
      {viewingSubmissions && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setViewingSubmissions(null)}></div>
          <div className="relative bg-white w-full max-w-md h-full shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center z-10">
              <div>
                <h2 className="font-bold text-slate-900">Preuves : {viewingSubmissions.title}</h2>
                <p className="text-xs text-slate-500">{submissions.length} soumissions</p>
              </div>
              <button onClick={() => setViewingSubmissions(null)} className="p-2 bg-slate-100 rounded-full text-slate-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-4 space-y-3">
              {loadingSubmissions ? (
                <p className="text-center text-slate-500 py-10">Chargement...</p>
              ) : submissions.length === 0 ? (
                <p className="text-center text-slate-500 py-10">Aucune soumission pour le moment.</p>
              ) : (
                submissions.map(s => (
                  <div key={s.id} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{s.user_name}</p>
                        <p className="text-[10px] text-slate-500">{new Date(s.created_at).toLocaleString('fr-FR')}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${s.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : s.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                        {s.status === 'approved' ? 'Approuvé' : s.status === 'rejected' ? 'Rejeté' : 'En attente'}
                      </span>
                    </div>
                    {s.proof_url && (
                      <img src={s.proof_url} alt="Preuve" className="w-full h-32 object-cover rounded-lg mb-3 border border-slate-100" />
                    )}
                    {s.status === 'pending' && (
                      <div className="flex gap-2">
                        <button onClick={() => validateSubmission(s.id, 'approved')} className="flex-1 py-2 bg-emerald-500 text-white font-bold text-xs rounded-lg">Approuver</button>
                        <button onClick={() => validateSubmission(s.id, 'rejected')} className="flex-1 py-2 bg-red-500 text-white font-bold text-xs rounded-lg">Rejeter</button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
