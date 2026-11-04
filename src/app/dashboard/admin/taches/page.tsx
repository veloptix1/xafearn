'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function AdminTasksPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState<any[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<any>(null)
  const [toast, setToast] = useState<string | null>(null)

  // Formulaire
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [actionUrl, setActionUrl] = useState('')
  const [reward, setReward] = useState('')
  const [type, setType] = useState('subscribe')

  useEffect(() => {
    loadTasks()
  }, [])

  async function loadTasks() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.push('/login')

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (!profile || (profile.role !== 'admin' && !profile.is_admin)) return router.push('/dashboard')

    const { data } = await supabase.from('tasks').select('*').order('created_at', { ascending: false })
    setTasks(data || [])
    setLoading(false)
  }

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const taskData = { title, description, action_url: actionUrl, reward: parseFloat(reward), type, status: 'active' }

    if (editingTask) {
      await supabase.from('tasks').update(taskData).eq('id', editingTask.id)
      showToast('Tâche modifiée !')
    } else {
      await supabase.from('tasks').insert(taskData)
      showToast('Tâche créée !')
    }
    setIsModalOpen(false)
    loadTasks()
  }

  const toggleStatus = async (task: any) => {
    const newStatus = task.status === 'active' ? 'paused' : 'active'
    await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id)
    loadTasks()
  }

  const deleteTask = async (id: string) => {
    if (!confirm('Supprimer cette tâche ?')) return
    await supabase.from('tasks').delete().eq('id', id)
    loadTasks()
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/admin" className="text-slate-500 hover:text-slate-900 bg-slate-100 p-2 rounded-full">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <h1 className="text-lg font-bold text-slate-900">Gestion des Tâches</h1>
        </div>
        <button onClick={() => { setEditingTask(null); setTitle(''); setDescription(''); setActionUrl(''); setReward(''); setIsModalOpen(true) }} className="px-4 py-2 bg-sky-500 text-white text-sm font-bold rounded-xl hover:bg-sky-400">+ Nouvelle tâche</button>
      </header>

      <div className="p-4 md:p-8 max-w-4xl mx-auto mt-2 space-y-3">
        {toast && <div className="bg-slate-900 text-white p-3 rounded-xl text-center text-sm font-bold">{toast}</div>}
        
        {tasks.map(task => (
          <div key={task.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900">{task.title}</h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${task.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{task.status}</span>
              </div>
              <p className="text-sm text-slate-500 mt-1">{task.description}</p>
              <p className="text-xs text-emerald-600 font-bold mt-2">Gain : {task.reward} FCFA • {task.type}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => toggleStatus(task)} className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg">{task.status === 'active' ? 'Pause' : 'Activer'}</button>
              <button onClick={() => { setEditingTask(task); setTitle(task.title); setDescription(task.description); setActionUrl(task.action_url); setReward(task.reward.toString()); setType(task.type); setIsModalOpen(true) }} className="px-3 py-1.5 bg-sky-100 text-sky-700 text-xs font-bold rounded-lg">Modifier</button>
              <button onClick={() => deleteTask(task.id)} className="px-3 py-1.5 bg-red-100 text-red-700 text-xs font-bold rounded-lg">Suppr.</button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6">
            <h2 className="font-bold text-lg mb-4">{editingTask ? 'Modifier' : 'Créer'} une tâche</h2>
            <form onSubmit={handleSave} className="space-y-3">
              <input type="text" required placeholder="Titre (ex: Abonne-toi à notre chaîne)" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
              <textarea required placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none" rows={2} />
              <input type="url" required placeholder="Lien d'action (ex: https://whatsapp.com/channel/...)" value={actionUrl} onChange={e => setActionUrl(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <input type="number" required placeholder="Gain (FCFA)" value={reward} onChange={e => setReward(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                <select value={type} onChange={e => setType(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm">
                  <option value="subscribe">S'abonner</option>
                  <option value="join_channel">Rejoindre un canal</option>
                  <option value="share">Partager</option>
                  <option value="custom">Autre</option>
                </select>
              </div>
              <div className="flex gap-2 mt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl">Annuler</button>
                <button type="submit" className="flex-1 py-3 bg-sky-500 text-white font-bold rounded-xl">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
