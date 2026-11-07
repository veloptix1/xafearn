import Link from 'next/link'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'

async function TrackLogic({ paramsPromise }: { paramsPromise: Promise<{ id: string }> }) {
  const { id } = await paramsPromise
  const supabase = await createClient()

  // 1. Chercher une soumission via le tracking_id
  let { data: submission } = await supabase
    .from('ad_submissions')
    .select('*, campaigns(*)')
    .eq('tracking_id', id)
    .maybeSingle()

  let campaign = submission?.campaigns

  // 2. Si pas trouvé, chercher la campagne directement via son ID
  if (!campaign) {
    const { data: directCampaign } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    
    if (directCampaign) {
      campaign = directCampaign
      submission = { tracking_id: id, campaigns: directCampaign }
    }
  }

  // 3. Si vraiment introuvable
  if (!campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="bg-white p-8 rounded-3xl shadow-lg border border-slate-200 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Annonce introuvable</h1>
          <p className="text-slate-500 mb-8">Ce lien de suivi est invalide, a expiré ou l'annonce a été retirée.</p>
          <Link href="/" className="inline-block w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition">
            Retour à l'accueil
          </Link>
        </div>
      </div>
    )
  }

  // 4. Compter la vue
  try {
    await supabase.rpc('increment_view', { tracking_id_param: id })
  } catch (err) {
    console.log('Erreur tracking view:', err)
  }

  // 🔥 NETTOYAGE INTELLIGENT DU NUMÉRO WHATSAPP
  // On récupère le numéro depuis l'une des colonnes possibles
  const rawNumber = campaign.whatsapp_number || campaign.phone || campaign.contact_phone || ''
  
  // On enlève tout sauf les chiffres
  let cleanNumber = rawNumber.replace(/\D/g, '')
  
  // Si le numéro commence par 0, on l'enlève (format local)
  if (cleanNumber.startsWith('0')) cleanNumber = cleanNumber.substring(1)
  
  // Si le numéro ne commence pas par l'indicatif du pays (237 pour Cameroun), on l'ajoute
  // ⚠️ Change '237' par l'indicatif de ton pays si besoin
  if (cleanNumber && !cleanNumber.startsWith('237') && cleanNumber.length <= 10) {
    cleanNumber = '237' + cleanNumber
  }

  const message = encodeURIComponent(`Bonjour, je vous contacte suite à votre annonce XAFEARN : ${campaign.title}`)
  
  // 🔥 Lien WhatsApp correct
  const whatsappLink = cleanNumber 
    ? `https://wa.me/${cleanNumber}?text=${message}`
    : null

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200">
        
        {campaign.image_url && (
          <div className="h-56 w-full relative">
            <img src={campaign.image_url} alt={campaign.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
            <div className="absolute bottom-4 left-4 right-4 text-white">
              <h1 className="text-2xl font-bold leading-tight">{campaign.title}</h1>
            </div>
          </div>
        )}

        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm text-slate-500 mb-1">Prix</p>
              <p className="text-2xl font-black text-emerald-600">
                {campaign.price > 0 ? `${campaign.price} FCFA` : 'Gratuit'}
              </p>
            </div>
            <div className="bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full border border-emerald-100 flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
              Annonce Vérifiée
            </div>
          </div>

          <p className="text-slate-600 text-sm mb-8 leading-relaxed">{campaign.description}</p>

          {/* 🔥 BOUTON WHATSAPP CONDITIONNEL */}
          {whatsappLink ? (
            <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="w-full py-4 bg-[#25D366] text-white font-bold rounded-xl hover:bg-[#128C7E] transition shadow-md flex justify-center items-center gap-2 text-lg">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Contacter sur WhatsApp
            </a>
          ) : (
            <div className="w-full py-4 bg-slate-100 text-slate-500 font-bold rounded-xl text-center">
              Contact indisponible
            </div>
          )}
        </div>
      </div>
      <div className="mt-8 text-center">
        <p className="text-xs text-slate-400 font-medium">Propulsé par <span className="font-bold text-slate-600">XAFEARN</span></p>
      </div>
    </div>
  )
}

export default function TrackPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
        <div className="w-10 h-10 border-4 border-sky-100 border-t-sky-500 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-medium">Chargement de l'annonce...</p>
      </div>
    }>
      <TrackLogic paramsPromise={params} />
    </Suspense>
  )
}
