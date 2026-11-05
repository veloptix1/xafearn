'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function DiffusionModal({ campaign, userId, submission }: { campaign: any, userId: string, submission?: any }) {
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState<'details' | 'verify'>('details')
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'warning' } | null>(null)
  
  // Système de blocage (Cooldown)
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

  // 🔍 VÉRIFICATION DU COOLDOWN : Réactivation le lendemain à 20h
  useEffect(() => {
    if (submission) return

    const lastProofStr = localStorage.getItem(`lastProof_${campaign.id}`)
    if (lastProofStr) {
      const lastProof = parseInt(lastProofStr, 10)
      const now = new Date()
      const lastProofDate = new Date(lastProof)
      
      // Calcul de la prochaine date de disponibilité : le LENDEMAIN À 20H
      const nextAvailableDate = new Date(lastProofDate)
      nextAvailableDate.setDate(nextAvailableDate.getDate() + 1) // +1 jour
      nextAvailableDate.setHours(20, 0, 0, 0) // Fixé à 20h00

      // Si on est avant cette date, on active le cooldown
      if (now.getTime() < nextAvailableDate.getTime()) {
        setIsCooldown(true)
        
        // Calcul du temps restant en heures et minutes
        const timeDiff = nextAvailableDate.getTime() - now.getTime()
        const hoursLeft = Math.floor(timeDiff / (1000 * 60 * 60))
        const minutesLeft = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))
        
        if (hoursLeft > 0) {
          setCooldownTimeLeft(`Reviens demain après 20h (dans ${hoursLeft}h ${minutesLeft}m)`)
        } else {
          setCooldownTimeLeft(`Reviens après 20h (dans ${minutesLeft} min)`)
        }
      } else {
        // Si la date est dépassée (il est après 20h le lendemain), on nettoie et on autorise
        localStorage.removeItem(`lastProof_${campaign.id}`)
        setIsCooldown(false)
      }
    }
  }, [campaign.id, submission])

  const handleDownloadImage = async () => {
    try {
      if (!campaign.image_url) return showToast("Pas d'image à télécharger.", 'warning')
      const response = await fetch(campaign.image_url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `annonce-${campaign.id}.jpg`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      showToast('Image téléchargée !', 'success')
    } catch (err) {
      showToast('Erreur téléchargement.', 'error')
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(messageText)
      showToast('Texte copié !', 'success')
    } catch (err) {
      showToast('Impossible de copier le texte.', 'error')
    }
  }

  const handleVerify = async () => {
    if (!videoFile) return showToast('Sélectionne une vidéo.', 'warning')
    
    if (videoFile.size > 50 * 1024 * 1024) {
      return showToast('La vidéo ne doit pas dépasser 50 MB.', 'error')
    }

    if (!videoFile.type.startsWith('video/')) {
      return showToast('Le fichier doit être une vidéo.', 'error')
    }

    setUploading(true)

    try {
      const fileName = `proof-${userId}-${Date.now()}.mp4`
      const { error: uploadError } = await supabase.storage.from('proof-videos').upload(fileName, videoFile)
      
      if (uploadError) throw new Error(uploadError.message)

      const { data: { publicUrl } } = supabase.storage.from('proof-videos').getPublicUrl(fileName)

      const { error } = await supabase.from('ad_submissions').insert({
        campaign_id: campaign.id,
        user_id: userId,
        tracking_id: trackingId,
        status: 'pending',
        proof_type: 'video',
        proof_video_url: publicUrl
      })

      if (error) throw new Error(error.message)

      await supabase.from('notifications').insert({
        user_id: userId, 
        title: 'Preuve envoyée ⏳',
        message: `Ta preuve pour "${campaign.title}" est en cours de vérification.`,
        link: '/dashboard/annonces'
      })

      // On sauvegarde l'heure EXACTE de l'envoi
      localStorage.setItem(`lastProof_${campaign.id}`, Date.now().toString())

      setUploading(false)
      setIsOpen(false)
      showToast('Preuve envoyée avec succès !', 'success')
      setTimeout(() => router.refresh(), 1500)

    } catch (err: any) {
      showToast('Erreur : ' + err.message, 'error')
      setUploading(false)
    }
  }

  const isDiffused = !!submission
  const hasProof = !!submission?.proof_video_url
  const isValidated = submission?.status === 'validated'

  if (isValidated) {
    return (
      <div className="w-full py-2.5 text-sm font-bold rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex justify-center items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
        Déjà publié & Payé
      </div>
    )
  }

  if (isDiffused && hasProof) {
    return (
      <div className="w-full py-2.5 text-sm font-bold rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex justify-center items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        En attente de validation
      </div>
    )
  }

  // ⏳ BOUTON DÉSACTIVÉ PENDANT LE COOLDOWN
  if (isCooldown) {
    return (
      <div className="w-full py-2.5 text-sm font-bold rounded-xl bg-slate-100 text-slate-500 border border-slate-200 flex justify-center items-center gap-2 cursor-not-allowed">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        {cooldownTimeLeft}
      </div>
    )
  }

  return (
    <>
      <button onClick={() => { setIsOpen(true); setStep('details') }} className="w-full py-2.5 text-sm font-bold rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition">
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
              <h2 className="font-bold text-slate-900">{step === 'verify' ? 'Envoyer la preuve' : 'Publier cette annonce'}</h2>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-900 bg-white rounded-full p-1 shadow-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-5">
              {step === 'details' && (
                <>
                  <div>
                    <p className="text-sm font-bold text-slate-900 mb-2">1. Téléchargez l'image</p>
                    <button onClick={handleDownloadImage} className="w-full py-2.5 bg-slate-100 text-slate-700 font-semibold text-sm rounded-xl hover:bg-slate-200 transition flex justify-center items-center gap-2">
                      Télécharger l'image
                    </button>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 mb-2">2. Copiez le texte</p>
                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs text-slate-600 whitespace-pre-wrap font-mono mb-2">{messageText}</div>
                    <button onClick={handleCopy} className="w-full py-2.5 bg-sky-50 text-sky-600 font-semibold text-sm rounded-xl hover:bg-sky-100 transition">
                      Copier le texte
                    </button>
                  </div>
                  <button onClick={() => setStep('verify')} className="w-full py-4 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-400 transition">
                    J'ai publié sur mon statut
                  </button>
                </>
              )}

              {step === 'verify' && (
                <>
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
                    <p className="text-sm font-bold text-amber-800 mb-2">Preuve de publication</p>
                    <p className="text-xs text-amber-700 mb-3">Filme ton statut WhatsApp avec l'annonce visible et le nombre de vues.</p>
                    <input type="file" accept="video/*" onChange={(e) => setVideoFile(e.target.files?.[0] || null)} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-amber-100 file:text-amber-700 hover:file:bg-amber-200" />
                    {videoFile && <p className="text-xs text-emerald-600 font-bold mt-2">✅ Vidéo prête ({Math.round(videoFile.size / 1024 / 1024)} MB)</p>}
                  </div>
                  <button onClick={handleVerify} disabled={uploading || !videoFile} className="w-full py-4 bg-sky-500 text-white font-bold rounded-xl hover:bg-sky-400 disabled:opacity-50 transition">
                    {uploading ? 'Envoi en cours...' : 'Envoyer ma preuve'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
