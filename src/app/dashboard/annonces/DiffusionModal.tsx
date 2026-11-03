'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function DiffusionModal({ campaign, userId }: { campaign: any, userId: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [published, setPublished] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  // Générer un ID de tracking unique à l'ouverture
  const [trackingId] = useState(() => Math.random().toString(36).substring(2, 10))
  const trackingUrl = typeof window !== 'undefined' ? `${window.location.origin}/track/${trackingId}` : ''

  const messageText = `${campaign.title}\n\n${campaign.description}\n\nPrix: ${campaign.price} F\n\n👉 Contactez-nous ici : ${trackingUrl}`

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText)
    alert('Texte copié !')
  }

  const handleDownload = () => {
    if (!campaign.image_url) return
    const link = document.createElement('a')
    link.href = campaign.image_url
    link.download = `annonce-${campaign.id}.jpg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleSubmit = async () => {
    setLoading(true)
    
    // Enregistrer la soumission dans la base
    const { error } = await supabase
      .from('ad_submissions')
      .insert({
        campaign_id: campaign.id,
        user_id: userId,
        tracking_id: trackingId,
        status: 'pending'
      })

    if (error) {
      alert('Erreur lors de l\'enregistrement : ' + error.message)
      setLoading(false)
      return
    }

    setPublished(true)
    setLoading(false)
    setTimeout(() => {
      setIsOpen(false)
      router.refresh()
    }, 2000)
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="w-full py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition"
      >
        Diffuser cette annonce
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <h2 className="font-bold text-slate-900">Publier cette annonce</h2>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-900">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-5 overflow-y-auto">
              {published ? (
                <div className="text-center py-10">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Publication enregistrée !</h3>
                  <p className="text-sm text-slate-500">Votre diffusion est en attente de validation. Revenez demain pour vérifier vos gains.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 mb-2">1. Téléchargez l'image</p>
                    {campaign.image_url && (
                      <div className="relative rounded-xl overflow-hidden border border-slate-200 mb-3">
                        <img src={campaign.image_url} alt="Annonce" className="w-full h-40 object-cover" />
                      </div>
                    )}
                    <button onClick={handleDownload} className="w-full py-2 bg-slate-100 text-slate-700 font-semibold text-sm rounded-lg hover:bg-slate-200 transition flex justify-center items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      Télécharger l'image
                    </button>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-900 mb-2">2. Copiez le texte + votre lien traçable</p>
                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm text-slate-600 whitespace-pre-wrap font-mono text-xs mb-3">
                      {messageText}
                    </div>
                    <button onClick={handleCopy} className="w-full py-2 bg-sky-50 text-sky-600 font-semibold text-sm rounded-lg hover:bg-sky-100 transition flex justify-center items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                      Copier le texte
                    </button>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl text-sm text-emerald-800">
                    <p className="font-bold mb-1">💡 Comment gagner ?</p>
                    <p>Publiez l'image et le texte sur votre statut WhatsApp. Chaque personne qui cliquera sur votre lien sera redirigée vers l'annonceur, et vous gagnerez de l'argent.</p>
                  </div>

                  <button onClick={handleSubmit} disabled={loading} className="w-full py-4 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-400 transition shadow-md">
                    {loading ? 'Enregistrement...' : "J'ai publié"}
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
