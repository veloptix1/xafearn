'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function TasksPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState<any[]>([])
  const [submissions, setSubmissions] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)

      const { data: t } = await supabase.from('tasks').select('*').eq('status', 'active')
      setTasks(t || [])

      const { data: subs } = await supabase.from('task_submissions').select('*').eq('user_id', user.id)
      setSubmissions(subs || [])
      
      setLoading(false)
    }
    load()
  }, [router, supabase])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  const handleComplete = async (task: any) => {
    // Ouvrir le lien dans un nouvel onglet
    window.open(task.action_url, '_blank')

    // Créer la soumission
    const { error } = await supabase.from('task_submissions').insert({
      task_id: task.id,
      user_id: profile.id,
      status: 'pending' // L'admin validera manuellement
    })

    if (error) {
      showToast('Erreur: ' + error.message)
    } else {
      showToast('Tâche soumise ! En attente de validation.')
      // Mettre à jour l'état local
      setSubmissions([...submissions, { task_id: task.id, status: 'pending' }])
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex items-center gap-4">
        <Link href="/dashboard" className="text-slate-500 hover:text-slate-900 bg-slate-100 p-2 rounded-full">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-lg font-bold text-slate-900">Tâches rémunérées</h1>
      </header>

      <div className="p-4 md:p-8 max-w-lg mx-auto mt-4 space-y-4">
        {toast && <div className="bg-slate-900 text-white p-3 rounded-xl text-center text-sm font-bold">{toast}</div>}

        <div className="bg-gradient-to-br from-sky-500 to-blue-600 rounded-3xl p-6 text-white shadow-lg mb-6">
          <h2 className="text-xl font-bold mb-2">Gagne plus en un clic</h2>
          <p className="text-sky-100 text-sm">Accomplis des missions simples (t'abonner, rejoindre un canal) et reçois de l'argent immédiatement après validation.</p>
        </div>

        {tasks.length === 0 ? (
          <div className="bg-white p-8 rounded-3xl text-center text-slate-500">Aucune tâche disponible pour le moment.</div>
        ) : (
          tasks.map(task => {
            const submission = submissions.find(s => s.task_id === task.id)
            const isCompleted = submission?.status === 'approved'
            const isPending = submission?.status === 'pending'

            return (
              <div key={task.id} className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-slate-900">{task.title}</h3>
                  <span className="bg-emerald-50 text-emerald-700 font-black text-sm px-3 py-1 rounded-lg border border-emerald-100">+{task.reward} F</span>
                </div>
                <p className="text-sm text-slate-500 mb-4">{task.description}</p>

                {isCompleted ? (
                  <div className="w-full py-2.5 bg-emerald-50 text-emerald-600 font-bold text-sm rounded-xl text-center border border-emerald-100">✅ Tâche accomplie</div>
                ) : isPending ? (
                  <div className="w-full py-2.5 bg-amber-50 text-amber-600 font-bold text-sm rounded-xl text-center border border-amber-100">⏳ En attente de validation</div>
                ) : (
                  <button onClick={() => handleComplete(task)} className="w-full py-2.5 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-slate-800 transition">
                    Faire la tâche
                  </button>
                )}
              </div>
            )
          })
        )}
      </div>
    </main>
  )
}
