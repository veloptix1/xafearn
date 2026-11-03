import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function TrackPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  
  // On récupère la soumission pour trouver le numéro WhatsApp de l'annonceur
  const { data: submission } = await supabase
    .from('ad_submissions')
    .select('*, campaigns(whatsapp_number, title, user_id)')
    .eq('tracking_id', params.id)
    .single()

  if (!submission || !submission.campaigns) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
          <h1 className="text-xl font-bold text-slate-900 mb-2">Lien invalide</h1>
          <p className="text-slate-500">Cette annonce n'existe plus ou a expiré.</p>
        </div>
      </div>
    )
  }

  // Incrémenter le nombre de clics (vues)
  await supabase.rpc('increment_view', { tracking_id_param: params.id })

  const whatsapp = submission.campaigns.whatsapp_number.replace(/\D/g, '')
  const message = encodeURIComponent(`Bonjour, je vous contacte suite à votre annonce XAFERAN : ${submission.campaigns.title}`)
  
  // Redirection directe vers WhatsApp
  redirect(`https://wa.me/${whatsapp}?text=${message}`)
}
