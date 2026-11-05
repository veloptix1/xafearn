'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Toast from '@/components/Toast'

export default function TasksPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState<any[]>([])
  const [submissions, setSubmissions] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [isTestModeActive, setIsTestModeActive] = useState(false)
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' | 'warning' } | null>(null)
  
  const [activeTask, setActiveTask] = useState<any>(null)
  const [screenshot, setScreenshot] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)
      setIsTestModeActive(prof?.is_test_mode === true)

      // Charger les tâches et les campagnes de type 'task'
      const { data: t } = await supabase.from('tasks').select('*').eq('status', 'active')
      const { data: c } = await supabase.from('campaigns').select('*').eq('status', 'active').eq('display_type', 'task')
      
      const combined = [
        ...(t || []),
        ...(c || []).map(camp => ({ 
          ...camp, 
          is_campaign_task: true, 
          type: 'diffusion_duration', 
          gain_per_view: camp.custom_gain_per_view, 
          action_url: camp.whatsapp_number, 
          reward: 0 
        }))
      ]
      setTasks(combined)

      const { data: subs } = await supabase.from('task_submissions').select('*').eq('user_id', user.id)
      setSubmissions(subs || [])
      
      setLoading(false)
    }
    load()
  }, [router, supabase])

  const showToast = (msg: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setToast({ message: msg, type })
  }

  const startTask = (task: any) => {
    if (isTestModeActive) {
      return showToast('Termine d\'abord ton annonce test pour débloquer les tâches.', 'warning')
    }
    setActiveTask(task)
    setScreenshot(null)
    window.open(task.action_url, '_blank')
  }

  const submitProof = async () => {
    if (!screenshot) return showToast('Veuillez uploader une capture d\'écran.', 'warning')
    setUploading(true)

    const fileName = `task-proof-${profile.id}-${Date.now()}.jpg`
    const { error: uploadError } = await supabase.storage.from('proof-videos').upload(fileName, screenshot)
    
    if (uploadError) {
      showToast('Erreur upload', 'error')
      setUploading(false)
      return
    }
    const { data: { publicUrl } } = supabase.storage.from('proof-videos').getPublicUrl(fileName)

    const { error } = await supabase.from('task_submissions').insert({
      task_id: activeTask.id,
      user_id: profile.id,
      status: 'pending',
      proof_screenshot_url: publicUrl
    })

    if (error) {
      showToast('Erreur: ' + error.message, 'error')
    } else {
      showToast('Tâche soumise ! En attente de validation.', 'success')
      setSubmissions([...submissions, { task_id: activeTask.id, status: 'pending' }])
      setActiveTask(null)
    }
    setUploading(false)
  }

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center">Chargement...</div>

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex items-center gap-4">
        <Link href="/dashboard" className="text-slate-500 hover:text-slate-900 bg-slate-100 p-2 rounded-full">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-lg font-bold text-slate-900">Tâches rémunérées</h1>
      </header>

      <div className="p-4 md:p-8 max-w-lg mx-auto mt-4 space-y-4">
        {/* Blocage si mode test */}
        {isTestModeActive && (
          <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl text-center">
            <div className="w-12 h-12 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            </div>
            <h3 className="font-bold text-amber-800 mb-1">Tâches bloquées</h3>
            <p className="text-sm text-amber-700 mb-4">Termine d'abord ton annonce test pour débloquer les tâches rémunérées.</p>
            <Link href="/dashboard/annonces" className="inline-block px-6 py-2 bg-amber-500 text-white font-bold text-sm rounded-xl">
              Aller à l'annonce test
            </Link>
          </div>
        )}

        <div className="bg-gradient-to-br from-sky-500 to-blue-600 rounded-3xl p-6 text-white shadow-lg mb-6">
          <h2 className="text-xl font-bold mb-2">Gagne plus en un clic</h2>
          <p className="text-sky-100 text-sm">Accomplis des missions simples et reçois de l'argent après validation.</p>
        </div>

        {tasks.length === 0 ? (
          <div className="bg-white p-8 rounded-3xl text-center text-slate-500">Aucune tâche disponible.</div>
        ) : (
          tasks.map(task => {
            const submission = submissions.find(s => s.task_id === task.id)
            const isCompleted = submission?.status === 'approved'
            const isPending = submission?.status === 'pending'

            return (
              <div key={task.id} className={`bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden ${isTestModeActive ? 'opacity-50 pointer-events-none' : ''}`}>
                {task.image_url && (
                  <div className="h-32 w-full bg-slate-100">
                    <img src={task.image_url} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="p-5">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-slate-900">{task.title}</h3>
                    <span className="bg-emerald-50 text-emerald-700 font-black text-sm px-3 py-1 rounded-lg border border-emerald-100">
                      {task.type === 'diffusion_duration' ? `${task.gain_per_view} F/vue` : `+${task.reward} F`}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mb-4">{task.description}</p>

                  {isCompleted ? (
                    <div className="w-full py-2.5 bg-emerald-50 text-emerald-600 font-bold text-sm rounded-xl text-center border border-emerald-100">✅ Tâche accomplie</div>
                  ) : isPending ? (
                    <div className="w-full py-2.5 bg-amber-50 text-amber-600 font-bold text-sm rounded-xl text-center border border-amber-100">⏳ En attente de validation</div>
                  ) : (
                    <button onClick={() => startTask(task)} className="w-full py-2.5 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-slate-800 transition">
                      Faire la tâche
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Modal de preuve */}
      {activeTask && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6">
            <h2 className="font-bold text-lg mb-2">Preuve de réalisation</h2>
            <p className="text-sm text-slate-500 mb-4">Tâche : <strong>{activeTask.title}</strong></p>
            
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl mb-4">
              <p className="text-xs text-amber-800">Fais une capture d'écran qui prouve que tu as bien réalisé la tâche et upload-la ici.</p>
            </div>

            <input 
              type="file" 
              accept="image/*" 
              onChange={(e) => setScreenshot(e.target.files?.[0] || null)} 
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100 mb-4" 
            />

            <div className="flex gap-2">
              <button onClick={() => setActiveTask(null)} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl">Annuler</button>
              <button onClick={submitProof} disabled={uploading || !screenshot} className="flex-1 py-3 bg-emerald-500 text-white font-bold rounded-xl disabled:opacity-50">
                {uploading ? 'Envoi...' : 'Envoyer la preuve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
