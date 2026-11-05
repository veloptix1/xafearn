'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function DiffusionModal({ campaign, userId, submission }: { campaign: any, userId: string, submission?: any }) {
  const [isOpen, setIsOpen] = useState(false)
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'warning' } | null>(null)
  
  // États du cooldown
  const [isCooldown, setIsCooldown] = useState(false)
  const [cooldownTimeLeft, setCooldownTimeLeft] = useState('')

  const [trackingId] = useState(() => Math.random().toString(36).substring(2, 10))
  const trackingUrl = typeof window !== 'undefined' ? `${window.location.origin}/track/${trackingId}` : ''
  const messageText = `${campaign.title}\n\n${campaign.description}\n\nPrix: ${campaign.price} F\n\n👉 Contactez-nous ici : ${trackingUrl}`

  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const showToast = (msg: string, type: 'success' | 'error' | 'warning' = 'error') => {
    setToast({ message: msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  // 🔍 VÉRIFICATION DU COOLDOWN
  useEffect(() => {
    if (!submission || !submission.last_publish_date) {
      setIsCooldown(false)
      return
    }

    const lastPublish = new Date(submission.last_publish_date)
    const now = new Date()

    const isSameDay = 
      lastPublish.getDate() === now.getDate() &&
      lastPublish.getMonth() === now.getMonth() &&
      lastPublish.getFullYear() === now.getFullYear()

    // Si on est le même jour ET qu'il n'est pas encore 18h → BLOQUÉ
    if (isSameDay && now.getHours() < 18) {
      setIsCooldown(true)
      
      const nextRelease = new Date(now)
      nextRelease.setHours(18, 0, 0, 0)
      
      const timeDiff = nextRelease.getTime() - now.getTime()
      const hoursLeft = Math.floor(timeDiff / (1000 * 60 * 60))
      const minutesLeft = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))

      setCooldownTimeLeft(`Reviens après 18h (dans ${hoursLeft}h ${minutesLeft}m)`)
    } else {
      setIsCooldown(false)
    }
  }, [submission])

  // 🚀 ÉTAPE 1 : L'utilisateur clique sur "J'ai publié" (BLOQUE LE BOUTON)
  const handlePublishedClick = async () => {
    const now = new Date()
    
    // On enregistre la date de publication (bloque pour aujourd'hui)
    if (submission) {
      await supabase.from('ad_submissions').update({ last_publish_date: now.toISOString() }).eq('id', submission.id)
    } else {
      await supabase.from('ad_submissions').insert({
        campaign_id: campaign.id,
        user_id: userId,
        tracking_id: trackingId,
        status: 'pending', // En attente
        last_publish_date: now.toISOString()
      })
    }
    
    setIsCooldown(true)
    
    const nextRelease = new Date(now)
    nextRelease.setHours(18, 0, 0, 0)
    const timeDiff = nextRelease.getTime() - now.getTime()
    const hoursLeft = Math.floor(timeDiff / (1000 * 60 * 60))
    const minutesLeft = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))
    setCooldownTimeLeft(`Reviens après 18h (dans ${hoursLeft}h ${minutesLeft}m)`)
    
    setIsOpen(false)
    showToast('Publication enregistrée ! Reviens après 18h pour envoyer ta preuve.', 'success')
    setTimeout(() => router.refresh(), 1000)
  }

  // 🚀 ÉTAPE 2 : L'utilisateur envoie sa preuve (Après 18h)
  const handleVerify = async () => {
    if (!videoFile) return showToast('Sélectionne une vidéo.', 'warning')
    if (videoFile.size > 50 * 1024 * 1024) return showToast('La vidéo ne doit pas dépasser 50 MB.', 'error')
    if (!videoFile.type.startsWith('video/')) return showToast('Le fichier doit être une vidéo.', 'error')

    setUploading(true)

    try {
      const fileName = `proof-${userId}-${Date.now()}.mp4`
      const { error: uploadError } = await supabase.storage.from('proof-videos').upload(fileName, videoFile)
      if (uploadError) throw new Error(uploadError.message)

      const { data: { publicUrl } } = supabase.storage.from('proof-videos').getPublicUrl(fileName)

      // On met à jour la soumission avec la preuve
      await supabase.from('ad_submissions').update({
        proof_video_url: publicUrl,
        proof_type: 'video',
        status: 'pending' // En attente de validation admin
      }).eq('campaign_id', campaign.id).eq('user_id', userId)

      await supabase.from('notifications').insert({
        user_id: userId, 
        title: 'Preuve envoyée ⏳',
        message: `Ta preuve pour "${campaign.title}" est en cours de vérification.`,
        link: '/dashboard/annonces'
      })

      setUploading(false)
      setIsOpen(false)
      showToast('Preuve envoyée ! En attente de validation.', 'success')
      setTimeout(() => router.refresh(), 1500)

    } catch (err: any) {
      showToast('Erreur : ' + err.message, 'error')
      setUploading(false)
    }
  }

  const hasProof = !!submission?.proof_video_url
  const isValidated = submission?.status === 'validated'
  const isPending = submission?.status === 'pending' && hasProof

  // ✅ ÉTAT FINAL : Validé par l'admin
  if (isValidated) {
    return (
      <div className="w-full py-2.5 text-sm font-bold rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex justify-center items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
        Terminé & Payé
      </div>
    )
  }

  // ⏳ ÉTAT : Preuve envoyée en attente
  if (isPending) {
    return (
      <div className="w-full py-2.5 text-sm font-bold rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex justify-center items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        En attente de validation
      </div>
    )
  }

  // ⏳ ÉTAT : Cooldown actif (Bouton bloqué)
  if (isCooldown) {
    return (
      <div className="w-full py-2.5 text-sm font-bold rounded-xl bg-slate-100 text-slate-500 border border-slate-200 flex justify-center items-center gap-2 cursor-not-allowed">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        {cooldownTimeLeft}
      </div>
    )
  }

  // 🟢 ÉTAT : Prêt à envoyer la preuve (Après 18h)
  if (submission && submission.last_publish_date && !hasProof) {
    return (
      <>
        <button onClick={() => setIsOpen(true)} className="w-full py-2.5 text-sm font-bold rounded-xl bg-sky-500 text-white hover:bg-sky-600 transition shadow-md flex justify-center items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
          Vérifier & Envoyer ma preuve
        </button>

        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            {toast && (
              <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[200] px-4 py-3 rounded-xl shadow-xl font-bold text-sm text-white ${
                toast.type === 'success' ? 'bg-emerald-500' : 
                toast.type === 'error' ? 'bg-red-500' : 'bg-amber-500'
              }`}>{toast.message}</div>
            )}
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h2 className="font-bold text-slate-900">Envoyer la preuve</h2>
                <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-900 bg-white rounded-full p-1 shadow-sm">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="p-5 space-y-5">
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
                  <p className="text-sm font-bold text-amber-800 mb-2">Preuve de publication</p>
                  <p className="text-xs text-amber-700 mb-3">Filme ton statut WhatsApp avec l'annonce visible et le nombre de vues.</p>
                  <input type="file" accept="video/*" onChange={(e) => setVideoFile(e.target.files?.[0] || null)} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-amber-100 file:text-amber-700 hover:file:bg-amber-200" />
                  {videoFile && <p className="text-xs text-emerald-600 font-bold mt-2">✅ Vidéo prête ({Math.round(videoFile.size / 1024 / 1024)} MB)</p>}
                </div>
                <button onClick={handleVerify} disabled={uploading || !videoFile} className="w-full py-4 bg-sky-500 text-white font-bold rounded-xl hover:bg-sky-400 disabled:opacity-50 transition">
                  {uploading ? 'Envoi en cours...' : 'Envoyer ma preuve'}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  // 🟢 ÉTAT INITIAL : Diffuser l'annonce
  return (
    <>
      <button onClick={() => setIsOpen(true)} className="w-full py-2.5 text-sm font-bold rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition">
        Diffuser cette annonce
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          
          {toast && (
            <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[200] px-4 py-3 rounded-xl shadow-xl font-bold text-sm text-white ${
              toast.type === 'success' ? 'bg-emerald-500' : 
              toast.type === 'error' ? 'bg-red-500' : 'bg-amber-500'
            }`}>
              {toast.message}
            </div>
          )}

          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="font-bold text-slate-900">Publier cette annonce</h2>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-900 bg-white rounded-full p-1 shadow-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-5">
              <div>
                <p className="text-sm font-bold text-slate-900 mb-2">1. Téléchargez l'image</p>
                <button onClick={async () => {
                  const response = await fetch(campaign.image_url)
                  const blob = await response.blob()
                  const url = window.URL.createObjectURL(blob)
                  const link = document.createElement('a')
                  link.href = url
                  link.download = `annonce.jpg`
                  link.click()
                  showToast('Image téléchargée !', 'success')
                }} className="w-full py-2.5 bg-slate-100 text-slate-700 font-semibold text-sm rounded-xl hover:bg-slate-200 transition">
                  Télécharger l'image
                </button>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 mb-2">2. Copiez le texte</p>
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs text-slate-600 whitespace-pre-wrap font-mono mb-2">{messageText}</div>
                <button onClick={async () => {
                  await navigator.clipboard.writeText(messageText)
                  showToast('Texte copié !', 'success')
                }} className="w-full py-2.5 bg-sky-50 text-sky-600 font-semibold text-sm rounded-xl hover:bg-sky-100 transition">
                  Copier le texte
                </button>
              </div>
              <button onClick={handlePublishedClick} className="w-full py-4 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-400 transition">
                J'ai publié sur mon statut
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
