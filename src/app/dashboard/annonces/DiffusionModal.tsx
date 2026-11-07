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
  const [confirmed, setConfirmed] = useState(false)
  const [localSubmission, setLocalSubmission] = useState<any>(submission)
  const [trackingId, setTrackingId] = useState<string | null>(null)
  const [creatingTracking, setCreatingTracking] = useState(false)
  
  const supabase = createClient()
  const router = useRouter()

  const showToast = (msg: string, type: 'success' | 'error' | 'warning' = 'error') => {
    setToast({ message: msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  useEffect(() => {
    async function refresh() {
      const { data } = await supabase.from('ad_submissions').select('*').eq('campaign_id', campaign.id).eq('user_id', userId).maybeSingle()
      setLocalSubmission(data)
      if (data?.tracking_id) setTrackingId(data.tracking_id)
    }
    refresh()
  }, [campaign.id, userId, submission, supabase])

  const trackingLink = typeof window !== 'undefined' && trackingId ? `${window.location.origin}/track/${trackingId}` : ''

  // 🚀 Génère l'ID et le lien dès l'ouverture du modal (si pas encore fait)
  const handleGenerateLink = async () => {
    setCreatingTracking(true)
    try {
      const newTrackingId = Math.random().toString(36).substring(2, 12)
      
      // Si la soumission existe déjà, on met juste à jour le tracking_id
      if (localSubmission) {
        const { data, error } = await supabase.from('ad_submissions').update({ tracking_id: newTrackingId }).eq('id', localSubmission.id).select().single()
        if (error) throw error
        setTrackingId(newTrackingId)
        setLocalSubmission(data)
      } else {
        // Sinon on crée une nouvelle soumission en attente
        const { data, error } = await supabase.from('ad_submissions').insert({
          campaign_id: campaign.id,
          user_id: userId,
          tracking_id: newTrackingId,
          status: 'en_attente_proof',
        }).select().single()
        if (error) throw error
        setTrackingId(newTrackingId)
        setLocalSubmission(data)
      }
      showToast('Lien généré ! Copie le message complet.', 'success')
    } catch (err: any) {
      showToast('Erreur : ' + err.message, 'error')
    }
    setCreatingTracking(false)
  }

  const handlePublishedClick = () => {
    setStep('upload')
    showToast('Publication enregistrée. Envoie ta preuve après 18h.', 'success')
  }

  const handleUploadProof = async () => {
    if (!confirmed) return showToast('Tu dois confirmer que ton statut a au moins 18h.', 'warning')
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
        status: 'pending'
      }).eq('id', localSubmission.id).select().single()

      if (error) throw error

      setLocalSubmission(data)
      showToast('Preuve envoyée ! En attente de validation.', 'success')
      setIsOpen(false)
      router.refresh()
    } catch (err: any) {
      showToast('Erreur : ' + err.message, 'error')
    }
    setUploading(false)
  }

  const state = !localSubmission ? 'not_published' : 
                localSubmission.status === 'validated' ? 'validated' :
                localSubmission.status === 'rejected' ? 'rejected' :
                localSubmission.status === 'en_attente_proof' ? 'ready_to_prove' :
                localSubmission.proof_video_url ? 'pending' : 'ready_to_prove'

  // ✅ VALIDÉ
  if (state === 'validated') {
    return (
      <div className="w-full py-3 text-sm font-bold rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex justify-center items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
        Validé & Payé
      </div>
    )
  }

  // ❌ REJETÉ
  if (state === 'rejected') {
    return (
      <>
        <button onClick={() => { setIsOpen(true); setStep('upload') }} className="w-full py-3 text-sm font-bold rounded-xl bg-red-500 text-white active:scale-95 transition shadow-md flex justify-center items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          Preuve rejetée - Recommencer
        </button>
        {isOpen && step === 'upload' && (
          <UploadModal 
            title="Nouvelle preuve" 
            description="Ta preuve précédente a été rejetée. Envoie une nouvelle vidéo."
            confirmed={confirmed} setConfirmed={setConfirmed}
            videoFile={videoFile} setVideoFile={setVideoFile}
            uploading={uploading} onClose={() => setIsOpen(false)}
            onSubmit={handleUploadProof} toast={toast} 
            buttonText="Envoyer ma nouvelle preuve"
          />
        )}
      </>
    )
  }

  // ⏳ EN ATTENTE
  if (state === 'pending') {
    return (
      <div className="w-full py-3 text-sm font-bold rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex justify-center items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        En attente de validation
      </div>
    )
  }

  // 🟢 PRÊT À ENVOYER LA PREUVE
  if (state === 'ready_to_prove') {
    return (
      <>
        <button onClick={() => { setIsOpen(true); setStep('upload') }} className="w-full py-3 text-sm font-bold rounded-xl bg-sky-500 text-white active:scale-95 transition shadow-md flex justify-center items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
          Vérifier & Envoyer ma preuve
        </button>
        {isOpen && step === 'upload' && (
          <UploadModal 
            title="Envoyer ma preuve" 
            description="Assure-toi que ton statut a été publié il y a au moins 18 heures."
            confirmed={confirmed} setConfirmed={setConfirmed}
            videoFile={videoFile} setVideoFile={setVideoFile}
            uploading={uploading} onClose={() => setIsOpen(false)}
            onSubmit={handleUploadProof} toast={toast} 
            buttonText="Envoyer ma preuve"
          />
        )}
      </>
    )
  }

  // 🔵 PAS ENCORE PUBLIÉ
  return (
    <>
      <button onClick={() => { setIsOpen(true); setStep('details') }} className="w-full py-3 text-sm font-bold rounded-xl bg-slate-900 text-white active:scale-95 transition flex justify-center items-center gap-2">
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
              
              {/* 🚀 ÉTAPE 1 : GÉNÉRER LE LIEN (seulement si pas encore généré) */}
              {!trackingId ? (
                <button onClick={handleGenerateLink} disabled={creatingTracking} className="w-full py-4 bg-indigo-500 text-white font-bold rounded-xl active:scale-95 transition disabled:opacity-50">
                  {creatingTracking ? 'Génération en cours...' : '1. Générer mon lien de tracking'}
                </button>
              ) : (
                <>
                  {/* 🚀 ÉTAPE 2 : TÉLÉCHARGER L'IMAGE */}
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

                  {/* 🚀 ÉTAPE 3 : COPIER LE TEXTE COMPLET (avec le lien inclus) */}
                  <div>
                    <p className="text-sm font-bold text-slate-900 mb-2">2. Copie le message complet</p>
                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs text-slate-600 whitespace-pre-wrap font-mono mb-2 max-h-40 overflow-y-auto">
                      {`${campaign.title}\n\n${campaign.description}\n\nPrix: ${campaign.price} F\n\n👉 En savoir plus: ${trackingLink}`}
                    </div>
                    <button onClick={async () => {
                      const textToCopy = `${campaign.title}\n\n${campaign.description}\n\nPrix: ${campaign.price} F\n\n👉 En savoir plus: ${trackingLink}`
                      await navigator.clipboard.writeText(textToCopy)
                      showToast('Message copié !', 'success')
                    }} className="w-full py-2.5 bg-sky-50 text-sky-600 font-semibold text-sm rounded-xl active:bg-sky-100 transition">
                      📋 Copier le message complet
                    </button>
                  </div>

                  {/* 🚀 ÉTAPE 4 : CONFIRMER LA PUBLICATION */}
                  <button onClick={handlePublishedClick} className="w-full py-4 bg-emerald-500 text-white font-bold rounded-xl active:scale-95 transition shadow-md">
                    J'ai publié sur mon statut
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {isOpen && step === 'upload' && (
        <UploadModal 
          title="Envoyer ma preuve" 
          description="Assure-toi que ton statut a été publié il y a au moins 18 heures."
          confirmed={confirmed} setConfirmed={setConfirmed}
          videoFile={videoFile} setVideoFile={setVideoFile}
          uploading={uploading} onClose={() => setIsOpen(false)}
          onSubmit={handleUploadProof} toast={toast} 
          buttonText="Envoyer ma preuve"
        />
      )}
    </>
  )
}

// 🧩 Composant réutilisable pour le modal d'upload
function UploadModal({ title, description, confirmed, setConfirmed, videoFile, setVideoFile, uploading, onClose, onSubmit, toast, buttonText }: any) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        {toast && (
          <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[200] px-4 py-3 rounded-xl shadow-lg text-white text-sm font-bold ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}>
            {toast.message}
          </div>
        )}
        
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-lg">{title}</h2>
          <button onClick={onClose} className="p-2 bg-slate-100 rounded-full text-slate-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl mb-4">
          <p className="text-xs text-blue-700 leading-relaxed">{description}</p>
        </div>

        <label className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl cursor-pointer mb-4">
          <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="mt-0.5 w-5 h-5 accent-amber-500 rounded shrink-0" />
          <span className="text-xs text-amber-900 leading-relaxed font-medium">
            Je valide que j'ai posté mon statut <strong>il y a au moins 18h</strong>.
          </span>
        </label>

        <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center relative mb-4">
          <input type="file" accept="video/*" onChange={(e) => setVideoFile(e.target.files?.[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
          {videoFile ? (
            <div>
              <p className="text-sm text-emerald-600 font-bold">Vidéo prête</p>
              <p className="text-[10px] text-slate-400 mt-1">{Math.round(videoFile.size / 1024 / 1024)} MB</p>
            </div>
          ) : (
            <div>
              <svg className="w-8 h-8 text-slate-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              <p className="text-sm text-slate-500">Ajouter une vidéo (max 50 MB)</p>
            </div>
          )}
        </div>

        <button onClick={onSubmit} disabled={uploading || !confirmed || !videoFile} className="w-full py-4 bg-emerald-500 text-white font-bold rounded-xl disabled:opacity-50 active:scale-95 transition shadow-md">
          {uploading ? 'Envoi en cours...' : buttonText}
        </button>
      </div>
    </div>
  )
}
