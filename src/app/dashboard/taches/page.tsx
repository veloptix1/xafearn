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
  
  // États pour le modal
  const [activeTask, setActiveTask] = useState<any>(null)
  const [modalStep, setModalStep] = useState<'start' | 'verify'>('start')
  const [screenshot, setScreenshot] = useState<File | null>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

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

  const handleTaskClick = (task: any) => {
    setActiveTask(task)
    setScreenshot(null)
    setVideoFile(null)
    
    if (task.type === 'diffusion_duration') {
      setModalStep('start')
    } else {
      // Ouvrir le lien directement pour les tâches simples
      window.open(task.action_url, '_blank')
      setModalStep('verify')
    }
  }

  const handleCopy = () => {
    const text = activeTask.description
    navigator.clipboard.writeText(text)
    showToast('Texte copié !')
  }

  const handleDownload = async () => {
    if (!activeTask.image_url) return
    try {
      const response = await fetch(activeTask.image_url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `tache-${activeTask.id}.jpg`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      showToast('Image téléchargée !')
    } catch (err) {
      showToast('Erreur téléchargement')
    }
  }

  const submitProof = async () => {
    const fileToUpload = activeTask.type === 'diffusion_duration' ? videoFile : screenshot
    if (!fileToUpload) return showToast('Veuillez uploader une preuve.')

    setUploading(true)

    const fileName = `task-proof-${profile.id}-${Date.now()}.${activeTask.type === 'diffusion_duration' ? 'mp4' : 'jpg'}`
    const { error: uploadError } = await supabase.storage.from('proof-videos').upload(fileName, fileToUpload)
    
    if (uploadError) {
      showToast('Erreur upload')
      setUploading(false)
      return
    }
    const { data: { publicUrl } } = supabase.storage.from('proof-videos').getPublicUrl(fileName)

    // On enregistre la soumission avec le lien de la preuve
    const { error } = await supabase.from('task_submissions').insert({
      task_id: activeTask.id,
      user_id: profile.id,
      status: 'pending',
      proof_screenshot_url: publicUrl // On utilise ce champ pour stocker le lien (vidéo ou image)
    })

    if (error) {
      showToast('Erreur: ' + error.message)
    } else {
      showToast('Preuve envoyée ! En attente de validation.')
      setSubmissions([...submissions, { task_id: activeTask.id, status: 'pending' }])
      setActiveTask(null)
    }
    setUploading(false)
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
        {toast && <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl text-sm font-bold z-[100]">{toast}</div>}

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
              <div key={task.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
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
                  <p className="text-sm text-slate-500 mb-4 line-clamp-2">{task.description}</p>
                  
                  {task.type === 'diffusion_duration' && (
                    <div className="bg-amber-50 border border-amber-100 p-2 rounded-lg mb-4">
                      <p className="text-xs text-amber-800 font-bold">⏱ Durée : {task.duration_hours} heures</p>
                      <p className="text-xs text-amber-700 mt-1">Garde ton statut visible pendant toute la durée.</p>
                    </div>
                  )}

                  {isCompleted ? (
                    <div className="w-full py-2.5 bg-emerald-50 text-emerald-600 font-bold text-sm rounded-xl text-center border border-emerald-100">✅ Tâche accomplie</div>
                  ) : isPending ? (
                    <div className="w-full py-2.5 bg-amber-50 text-amber-600 font-bold text-sm rounded-xl text-center border border-amber-100">⏳ En attente de validation</div>
                  ) : (
                    <button onClick={() => handleTaskClick(task)} className="w-full py-2.5 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-slate-800 transition">
                      {task.type === 'diffusion_duration' ? 'Commencer la mission' : 'Faire la tâche'}
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* MODAL */}
      {activeTask && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="font-bold text-lg">{activeTask.title}</h2>
              <button onClick={() => setActiveTask(null)} className="text-slate-400 hover:text-slate-900">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Étape 1 : Diffusion (Télécharger + Copier) */}
            {modalStep === 'start' && activeTask.type === 'diffusion_duration' && (
              <div className="space-y-4">
                <div className="bg-sky-50 border border-sky-200 p-4 rounded-xl">
                  <p className="text-sm text-sky-800 font-medium mb-3">1. Télécharge l'image</p>
                  <button onClick={handleDownload} className="w-full py-2 bg-white border border-sky-200 text-sky-700 font-bold text-sm rounded-lg">Télécharger l'image</button>
                </div>
                <div className="bg-sky-50 border border-sky-200 p-4 rounded-xl">
                  <p className="text-sm text-sky-800 font-medium mb-3">2. Copie le texte</p>
                  <div className="bg-white p-3 rounded-lg text-xs text-slate-600 border border-sky-100 mb-2 whitespace-pre-wrap">{activeTask.description}</div>
                  <button onClick={handleCopy} className="w-full py-2 bg-white border border-sky-200 text-sky-700 font-bold text-sm rounded-lg">Copier le texte</button>
                </div>
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
                  <p className="text-sm text-amber-800 font-bold">3. Publie sur ton statut</p>
                  <p className="text-xs text-amber-700 mt-1">Garde le statut visible pendant <strong>{activeTask.duration_hours} heures</strong>. Ensuite, reviens ici pour envoyer ta preuve.</p>
                </div>
                <button onClick={() => setModalStep('verify')} className="w-full py-3 bg-emerald-500 text-white font-bold rounded-xl mt-4">
                  J'ai publié, vérifier mon statut
                </button>
              </div>
            )}

            {/* Étape 2 : Preuve (Vidéo pour diffusion, Image pour tâches simples) */}
            {modalStep === 'verify' && (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
                  <p className="text-sm text-amber-800 font-bold mb-2">
                    {activeTask.type === 'diffusion_duration' ? 'Preuve vidéo (Obligatoire)' : 'Preuve (Capture d\'écran)'}
                  </p>
                  <p className="text-xs text-amber-700 mb-3">
                    {activeTask.type === 'diffusion_duration' 
                      ? 'Filme ton statut WhatsApp pour montrer que tu l\'as bien publié et gardé.' 
                      : 'Fais une capture d\'écran qui prouve que tu as réalisé la tâche.'}
                  </p>
                  <input 
                    type="file" 
                    accept={activeTask.type === 'diffusion_duration' ? 'video/*' : 'image/*'} 
                    onChange={(e) => {
                      if (activeTask.type === 'diffusion_duration') setVideoFile(e.target.files?.[0] || null)
                      else setScreenshot(e.target.files?.[0] || null)
                    }} 
                    className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-amber-100 file:text-amber-700 hover:file:bg-amber-200" 
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setActiveTask(null)} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl">Annuler</button>
                  <button onClick={submitProof} disabled={uploading || (!screenshot && !videoFile)} className="flex-1 py-3 bg-emerald-500 text-white font-bold rounded-xl disabled:opacity-50">
                    {uploading ? 'Envoi...' : 'Envoyer ma preuve'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  )
}
