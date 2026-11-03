'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function DiffusionModal({ campaign, userId, submission }: { campaign: any, userId: string, submission?: any }) {
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState<'details' | 'verify'>('details')
  const [loading, setLoading] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  
  const [trackingId] = useState(() => submission?.tracking_id || Math.random().toString(36).substring(2, 10))
  const trackingUrl = typeof window !== 'undefined' ? `${window.location.origin}/track/${trackingId}` : ''
  const messageText = `${campaign.title}\n\n${campaign.description}\n\nPrix: ${campaign.price} F\n\n👉 Contactez-nous ici : ${trackingUrl}`

  const [proofType, setProofType] = useState<'video' | 'qr_code' | null>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const supabase = createClient()
  const router = useRouter()

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(messageText)
    showToast('Texte et lien copiés !')
  }

  const handleDownload = async () => {
    if (!campaign.image_url) return
    const response = await fetch(campaign.image_url)
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `annonce-${campaign.id}.jpg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handlePublish = async () => {
    setLoading(true)
    const { error } = await supabase.from('ad_submissions').insert({
      campaign_id: campaign.id,
      user_id: userId,
      tracking_id: trackingId,
      status: 'pending'
    })

    if (error) {
      showToast('Erreur : ' + error.message)
      setLoading(false)
      return
    }
    setIsOpen(false)
    setLoading(false)
    router.refresh()
  }

  const handleVerifySubmit = async () => {
    if (proofType === 'video' && !videoFile) {
      showToast('Veuillez sélectionner une vidéo.')
      return
    }

    setUploading(true)
    let proofUrl = null
    let qrToken = null

    if (proofType === 'video' && videoFile) {
      const fileName = `proof-${submission.id}-${Date.now()}.mp4`
      const { error: uploadError } = await supabase.storage.from('proof-videos').upload(fileName, videoFile)
      
      if (uploadError) {
        showToast('Erreur upload vidéo.')
        setUploading(false)
        return
      }
      const { data } = supabase.storage.from('proof-videos').getPublicUrl(fileName)
      proofUrl = data.publicUrl
    } else if (proofType === 'qr_code') {
      qrToken = `qr_${Math.random().toString(36).substring(2, 10)}`
    }

    // ON GARDE LE STATUT 'pending' POUR QUE L'ADMIN VALIDE
    const { error } = await supabase.from('ad_submissions').update({
      status: 'pending', 
      proof_type: proofType,
      proof_video_url: proofUrl,
      qr_scan_token: qrToken
    }).eq('id', submission.id)

    if (error) {
      showToast('Erreur lors de la validation.')
      setUploading(false)
      return
    }

    setUploading(false)
    setIsOpen(false)
    showToast('Preuve envoyée ! En attente de validation par l\'admin.')
    router.refresh()
  }

  const isDiffused = !!submission

  return (
    <>
      <button 
        onClick={() => { setIsOpen(true); setStep(isDiffused ? 'verify' : 'details') }}
        className={`w-full py-2.5 text-sm font-bold rounded-xl transition ${
          isDiffused ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-200' : 'bg-slate-900 text-white hover:bg-slate-800'
        }`}
      >
        {isDiffused ? 'Vérifier l\'annonce' : 'Diffuser cette annonce'}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          {toastMessage && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl text-sm font-medium z-[110]">
              {toastMessage}
            </div>
          )}

          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="font-bold text-slate-900">{step === 'verify' ? 'Vérifier la publication' : 'Publier cette annonce'}</h2>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-900 bg-white rounded-full p-1 shadow-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-5 overflow-y-auto">
              {step === 'details' && (
                <div className="space-y-6">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 mb-2">1. Téléchargez l'image</p>
                    <button onClick={handleDownload} className="w-full py-2.5 bg-slate-100 text-slate-700 font-semibold text-sm rounded-xl hover:bg-slate-200 transition flex justify-center items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      Télécharger l'image
                    </button>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 mb-2">2. Copiez le texte + lien</p>
                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm text-slate-600 whitespace-pre-wrap font-mono text-xs mb-3">
                      {messageText}
                    </div>
                    <button onClick={handleCopy} className="w-full py-2.5 bg-sky-50 text-sky-600 font-semibold text-sm rounded-xl hover:bg-sky-100 transition flex justify-center items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                      Copier le texte
                    </button>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl text-sm text-emerald-800">
                    <p className="font-bold mb-1">💡 Comment gagner ?</p>
                    <p>Publiez sur votre statut WhatsApp. Dès que c'est fait, cliquez sur le bouton ci-dessous pour envoyer votre preuve.</p>
                  </div>
                  <button onClick={handlePublish} disabled={loading} className="w-full py-4 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-400 transition shadow-md">
                    {loading ? 'Enregistrement...' : "J'ai publié"}
                  </button>
                </div>
              )}

              {step === 'verify' && (
                <div className="space-y-6">
                  <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl text-sm text-amber-800">
                    <p className="font-bold mb-1">Preuve de publication requise</p>
                    <p>L'admin va vérifier votre preuve. Vous recevrez vos gains une fois validés.</p>
                  </div>

                  <div className="space-y-3">
                    <label className={`block border-2 rounded-xl p-4 cursor-pointer transition ${proofType === 'video' ? 'border-sky-500 bg-sky-50' : 'border-slate-200 hover:border-sky-300'}`}>
                      <div className="flex items-center gap-3">
                        <input type="radio" name="proof" checked={proofType === 'video'} onChange={() => setProofType('video')} className="w-4 h-4 text-sky-500 accent-sky-500" />
                        <div>
                          <p className="font-bold text-slate-900">Vidéo de preuve</p>
                          <p className="text-xs text-slate-500">Filmez votre statut avec le nombre de vues.</p>
                        </div>
                      </div>
                      {proofType === 'video' && (
                        <div className="mt-3">
                          <input type="file" accept="video/*" onChange={(e) => setVideoFile(e.target.files?.[0] || null)} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100" />
                        </div>
                      )}
                    </label>

                    <label className={`block border-2 rounded-xl p-4 cursor-pointer transition ${proofType === 'qr_code' ? 'border-sky-500 bg-sky-50' : 'border-slate-200 hover:border-sky-300'}`}>
                      <div className="flex items-center gap-3">
                        <input type="radio" name="proof" checked={proofType === 'qr_code'} onChange={() => setProofType('qr_code')} className="w-4 h-4 text-sky-500 accent-sky-500" />
                        <div>
                          <p className="font-bold text-slate-900">Méthode QR Code (Auto)</p>
                          <p className="text-xs text-slate-500">Scannez un QR code pour valider automatiquement.</p>
                        </div>
                      </div>
                      {proofType === 'qr_code' && (
                        <div className="mt-4 flex flex-col items-center bg-white p-4 rounded-xl border border-slate-200">
                          <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${trackingUrl}`} alt="QR Code" className="w-32 h-32 mb-2" />
                          <p className="text-xs text-slate-500 text-center">Scannez ce code avec votre téléphone pour valider.</p>
                        </div>
                      )}
                    </label>
                  </div>

                  <button onClick={handleVerifySubmit} disabled={uploading || !proofType} className="w-full py-4 bg-sky-500 text-white font-bold rounded-xl hover:bg-sky-400 disabled:opacity-50 transition shadow-md">
                    {uploading ? 'Envoi en cours...' : 'Envoyer la preuve'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
