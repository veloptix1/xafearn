'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function DiffusionModal({ campaign, userId, submission }: { campaign: any, userId: string, submission?: any }) {
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState<'details' | 'verify'>('details')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  
  const [trackingId] = useState(() => submission?.tracking_id || Math.random().toString(36).substring(2, 10))
  const trackingUrl = typeof window !== 'undefined' ? `${window.location.origin}/track/${trackingId}` : ''
  const messageText = `${campaign.title}\n\n${campaign.description}\n\nPrix: ${campaign.price} F\n\n👉 Contactez-nous ici : ${trackingUrl}`

  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(messageText)
    showToast('Texte copié !')
  }

  const handleDownload = async () => {
    try {
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
      showToast('Image téléchargée !')
    } catch (err) {
      showToast('Erreur lors du téléchargement.')
    }
  }

  // Étape 1 : L'utilisateur a publié, on crée une soumission "pending" SANS preuve
  const handlePublish = async () => {
    setLoading(true)
    const { error } = await supabase.from('ad_submissions').insert({
      campaign_id: campaign.id,
      user_id: userId,
      tracking_id: trackingId,
      status: 'pending'
    })

    if (error) {
      showToast('Erreur: ' + error.message)
      setLoading(false)
      return
    }
    
    setLoading(false)
    setIsOpen(false)
    showToast('Publication enregistrée !')
    router.refresh()
  }

  // Étape 2 : L'utilisateur envoie sa preuve vidéo
  const handleVerify = async () => {
    if (!videoFile) {
      showToast('Tu dois sélectionner une vidéo.')
      return
    }
    setUploading(true)
    
    // 1. Upload de la vidéo
    const fileName = `proof-${userId}-${Date.now()}.mp4`
    const { error: uploadError } = await supabase.storage.from('proof-videos').upload(fileName, videoFile)
    if (uploadError) {
      showToast('Erreur upload vidéo.')
      setUploading(false)
      return
    }
    const { data: { publicUrl } } = supabase.storage.from('proof-videos').getPublicUrl(fileName)

    // 2. Mettre à jour la soumission avec la preuve
    const { error } = await supabase.from('ad_submissions').update({
      proof_type: 'video',
      proof_video_url: publicUrl
    }).eq('id', submission.id)

    if (error) {
      showToast('Erreur: ' + error.message)
      setUploading(false)
      return
    }

    // 3. Créer la notification
    await supabase.from('notifications').insert({
      user_id: userId,
      title: 'Preuve envoyée ⏳',
      message: `Ta preuve pour "${campaign.title}" est en cours de vérification.`,
      link: '/dashboard/annonces'
    })

    setUploading(false)
    setIsOpen(false)
    showToast('Preuve envoyée ! En attente de validation.')
    router.refresh()
  }

  const isDiffused = !!submission
  const isPending = submission?.status === 'pending'
  const isValidated = submission?.status === 'validated'
  const hasProof = !!submission?.proof_video_url

  if (isValidated) {
    return (
      <div className="w-full py-2.5 text-sm font-bold rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex justify-center items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
        Déjà publié & Payé
      </div>
    )
  }

  // Si la soumission est en attente ET qu'il y a déjà une preuve, on affiche le statut
  if (isPending && hasProof) {
    return (
      <div className="w-full py-2.5 text-sm font-bold rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex justify-center items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        En attente de validation
      </div>
    )
  }

  return (
    <>
      <button 
        onClick={() => { setIsOpen(true); setStep(isDiffused ? 'verify' : 'details') }} 
        className={`w-full py-2.5 text-sm font-bold rounded-xl transition ${
          isDiffused ? 'bg-sky-50 text-sky-600 hover:bg-sky-100 border border-sky-100' : 'bg-slate-900 text-white hover:bg-slate-800'
        }`}
      >
        {isDiffused ? 'Vérifier l\'annonce' : 'Diffuser cette annonce'}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          {toast && <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl text-sm font-bold z-[110]">{toast}</div>}
          
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="font-bold text-slate-900">{step === 'verify' ? 'Vérifier la publication' : 'Publier cette annonce'}</h2>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-900 bg-white rounded-full p-1 shadow-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-5">
              
              {/* ETAPE 1 : COPIER LE TEXTE ET L'IMAGE */}
              {step === 'details' && (
                <>
                  <div>
                    <p className="text-sm font-bold text-slate-900 mb-2">1. Téléchargez l'image</p>
                    <button onClick={handleDownload} className="w-full py-2.5 bg-slate-100 text-slate-700 font-semibold text-sm rounded-xl hover:bg-slate-200 transition flex justify-center items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      Télécharger l'image
                    </button>
                  </div>

                  <div>
                    <p className="text-sm font-bold text-slate-900 mb-2">2. Copiez le texte</p>
                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs text-slate-600 whitespace-pre-wrap font-mono mb-2">
                      {messageText}
                    </div>
                    <button onClick={handleCopy} className="w-full py-2.5 bg-sky-50 text-sky-600 font-semibold text-sm rounded-xl hover:bg-sky-100 transition flex justify-center items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                      Copier le texte
                    </button>
                  </div>

                  <button onClick={handlePublish} disabled={loading} className="w-full py-4 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-400 disabled:opacity-50 transition shadow-md">
                    {loading ? 'Enregistrement...' : 'J\'ai publié sur mon statut'}
                  </button>
                </>
              )}

              {/* ETAPE 2 : UPLOADER LA PREUVE VIDÉO */}
              {step === 'verify' && (
                <>
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
                    <p className="text-sm font-bold text-amber-800 mb-2">Preuve de publication</p>
                    <p className="text-xs text-amber-700 mb-3">Filme ton statut WhatsApp avec l'annonce visible et le nombre de vues pour valider tes gains.</p>
                    <input 
                      type="file" 
                      accept="video/*" 
                      onChange={(e) => setVideoFile(e.target.files?.[0] || null)} 
                      className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-amber-100 file:text-amber-700 hover:file:bg-amber-200" 
                    />
                  </div>

                  <button onClick={handleVerify} disabled={uploading || !videoFile} className="w-full py-4 bg-sky-500 text-white font-bold rounded-xl hover:bg-sky-400 disabled:opacity-50 transition shadow-md">
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
