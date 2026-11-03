import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'

async function TrackLogic({ paramsPromise }: { paramsPromise: Promise<{ id: string }> }) {
  // On attend les params ICI, à l'intérieur du composant enveloppé dans Suspense
  const { id } = await paramsPromise
  const supabase = await createClient()
  
  const { data: submission } = await supabase
    .from('ad_submissions')
    .select('*, campaigns(whatsapp_number, title, user_id)')
    .eq('tracking_id', id)
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

  await supabase.rpc('increment_view', { tracking_id_param: id })

  const whatsapp = submission.campaigns.whatsapp_number.replace(/\D/g, '')
  const message = encodeURIComponent(`Bonjour, je vous contacte suite à votre annonce XAFERAN : ${submission.campaigns.title}`)
  
  redirect(`https://wa.me/${whatsapp}?text=${message}`)
}

export default function TrackPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
        <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-medium">Redirection en cours...</p>
      </div>
    }>
      {/* On passe la promesse directement au composant enfant */}
      <TrackLogic paramsPromise={params} />
    </Suspense>
  )
}
