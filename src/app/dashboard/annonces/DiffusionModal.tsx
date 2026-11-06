'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function DiffusionModal({ campaign, userId, submission }: { campaign: any, userId: string, submission?: any }) {
  const [isOpen, setIsOpen] = useState(false)
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'warning' } | null>(null)
  const [step, setStep] = useState<'details' | 'upload'>('details')
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [localSubmission, setLocalSubmission] = useState<any>(submission)

  const supabase = createClient()
  const router = useRouter()

  const showToast = (msg: string, type: 'success' | 'error' | 'warning' = 'error') => {
    setToast({ message: msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  // Rafraîchir la soumission quand elle change
  useEffect(() => {
    async function refresh() {
      const { data } = await supabase.from('ad_submissions').select('*').eq('campaign_id', campaign.id).eq('user_id', userId).maybeSingle()
      setLocalSubmission(data)
    }
    refresh()
  }, [campaign.id, userId, submission])

  // 🧮 CALCUL DES ÉTATS
  const [state, setState] = useState<'not_published' | 'cooldown' | 'ready_to_prove' | 'pending' | 'validated'>('not_published')
  const [cooldownTimeLeft, setCooldownTimeLeft] = useState('')

  useEffect(() => {
    console.log('State calc - submission:', localSubmission)
    
    if (!localSubmission) {
      setState('not_published')
      return
    }
    
    if (localSubmission.status === 'validated') {
      setState('validated')
      return
    }
    
    if (localSubmission.proof_video_url) {
      setState('pending')
      return
    }
    
    const createdAt = new Date(localSubmission.created_at)
    const now = new Date()
    const isSameDay = 
      createdAt.getDate() === now.getDate() &&
      createdAt.getMonth() === now.getMonth() &&
      createdAt.getFullYear() === now.getFullYear()

    console.log('Same day?', isSameDay, 'Hour:', now.getHours())

    if (isSameDay && now.getHours() < 18) {
      setState('cooldown')
      const nextRelease = new Date(now)
      nextRelease.setHours(18, 0, 0, 0)
      const timeDiff = nextRelease.getTime() - now.getTime()
      const hoursLeft = Math.floor(timeDiff / (1000 * 60 * 60))
      const minutesLeft = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))
      setCooldownTimeLeft(`Reviens après 18h (dans ${hoursLeft}h ${minutesLeft}m)`)
    } else {
      setState('ready_to_prove')
    }
  }, [localSubmission])

  // 🚀 ÉTAPE 1 : Créer la soumission
  const handlePublishedClick = async () => {
    try {
      console.log('Creating submission for campaign:', campaign.id, 'user:', userId)
      
      const { data, error } = await supabase.from('ad_submissions').insert({
        campaign_id: campaign.id,
        user_id: userId,
        tracking_id: Math.random().toString(36).substring(2, 10),
        status: 'pending',
      }).select().single()

      if (error) {
        console.error('Insert error:', error)
        throw error
      }

      console.log('Submission created:', data)
      setLocalSubmission(data)
      showToast('Publication enregistrée !', 'success')
      setIsOpen(false)
    } catch (err: any) {
      console.error('Caught error:', err)
      showToast('Erreur : ' + err.message, 'error')
    }
  }

  // 🚀 ÉTAPE 2 : Upload preuve
  const handleUploadProof = async () => {
    if (!videoFile) return showToast('Sélectionne une vidéo.', 'warning')
    if (videoFile.size > 50 * 1024 * 1024) return showToast('Max 50 MB.', 'error')
    if (!videoFile.type.startsWith('video/')) return showToast('Doit être une vidéo.', 'error')

    setUploading(true)
    try {
      const fileName = `proof-${userId}-${Date.now()}.mp4`
      const { error: uploadError } = await supabase.storage.from('proof-videos').upload(fileName, videoFile)
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('proof-videos').getPublicUrl(fileName)

      const { data, error } = await supabase.from('ad_submissions').update({
        proof_video_url: publicUrl,
        proof_type: 'video',
      }).eq('id', localSubmission.id).select().single()

      if (error) throw error

      setLocalSubmission(data)
      showToast('Preuve envoyée !', 'success')
      setIsOpen(false)
    } catch (err: any) {
      showToast('Erreur : ' + err.message, 'error')
    }
    setUploading(false)
  }

  if (state === 'validated') {
    return (
      <div className="w-full py-3 text-sm font-bold rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex justify-center items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
        Terminé & Payé
      </div>
    )
  }

  if (state === 'pending') {
    return (
      <div className="w-full py-3 text-sm font-bold rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex justify-center items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        En attente de validation
      </div>
    )
  }

  if (state === 'cooldown') {
    return (
      <div className="w-full py-3 text-sm font-bold rounded-xl bg-slate-100 text-slate-500 border border-slate-200 flex justify-center items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        {cooldownTimeLeft}
      </div>
    )
  }

  if (state === 'ready_to_prove') {
    return (
      <>
        <button onClick={() => { setIsOpen(true); setStep('upload'); }} className="w-full py-3 text-sm font-bold rounded-xl bg-sky-500 text-white active:scale-95 transition shadow-md flex justify-center items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
          Envoyer ma preuve
        </button>

        {isOpen && step === 'upload' && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm sm:p-4">
            <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 shadow-2xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold text-lg">Preuve de publication</h2>
                <button onClick={() => setIsOpen(false)} className="p-2 bg-slate-100 rounded-full text-slate-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <p className="text-xs text-slate-500 mb-4">Filme ton statut WhatsApp avec l'annonce visible.</p>
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center relative mb-4">
                <input type="file" accept="video/*" onChange={(e) => setVideoFile(e.target.files?.[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                {videoFile ? (
                  <p className="text-sm text-emerald-600 font-bold">Vidéo prête ({Math.round(videoFile.size / 1024 / 1024)} MB)</p>
                ) : (
                  <p className="text-sm text-slate-500">Ajouter une vidéo (max 50 MB)</p>
                )}
              </div>
              <button onClick={handleUploadProof} disabled={uploading || !videoFile} className="w-full py-4 bg-sky-500 text-white font-bold rounded-xl disabled:opacity-50">
                {uploading ? 'Envoi en cours...' : 'Envoyer ma preuve'}
              </button>
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <>
      <button onClick={() => { setIsOpen(true); setStep('details'); }} className="w-full py-3 text-sm font-bold rounded-xl bg-slate-900 text-white active:scale-95 transition flex justify-center items-center gap-2">
        Diffuser cette annonce
      </button>

      {isOpen && step === 'details' && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            {toast && (
              <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[200] px-4 py-3 rounded-xl shadow-lg text-white text-sm font-bold ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}>
                {toast.message}
              </div>
            )}
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-lg">Publier cette annonce</h2>
              <button onClick={() => setIsOpen(false)} className="p-2 bg-slate-100 rounded-full text-slate-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm font-bold text-slate-900 mb-2">1. Télécharge l'image</p>
                <button onClick={async () => {
                  const response = await fetch(campaign.image_url)
                  const blob = await response.blob()
                  const url = window.URL.createObjectURL(blob)
                  const link = document.createElement('a')
                  link.href = url
                  link.download = `annonce.jpg`
                  link.click()
                  showToast('Image téléchargée !', 'success')
                }} className="w-full py-2.5 bg-slate-100 text-slate-700 font-semibold text-sm rounded-xl active:bg-slate-200 transition">
                  Télécharger l'image
                </button>
              </div>

              <div>
                <p className="text-sm font-bold text-slate-900 mb-2">2. Copie le texte</p>
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs text-slate-600 whitespace-pre-wrap font-mono mb-2">
                  {`${campaign.title}\n\n${campaign.description}\n\nPrix: ${campaign.price} F`}
                </div>
                <button onClick={async () => {
                  await navigator.clipboard.writeText(`${campaign.title}\n\n${campaign.description}\n\nPrix: ${campaign.price} F`)
                  showToast('Texte copié !', 'success')
                }} className="w-full py-2.5 bg-sky-50 text-sky-600 font-semibold text-sm rounded-xl active:bg-sky-100 transition">
                  Copier le texte
                </button>
              </div>

              <button onClick={handlePublishedClick} className="w-full py-4 bg-emerald-500 text-white font-bold rounded-xl active:scale-95 transition shadow-md">
                J'ai publié sur mon statut
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
