import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

async function TrackLogic({ paramsPromise }: { paramsPromise: Promise<{ id: string }> }) {
  const { id } = await paramsPromise
  const supabase = await createClient()
  
  const { data: submission } = await supabase
    .from('ad_submissions')
    .select('*, campaigns(whatsapp_number, title, user_id)')
    .eq('tracking_id', id)
    .single()

  if (!submission || !submission.campaigns) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="bg-white p-8 rounded-3xl shadow-lg border border-slate-200 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Annonce introuvable</h1>
          <p className="text-slate-500 mb-8">Ce lien de suivi est invalide, a expiré ou l'annonce a été retirée par l'annonceur.</p>
          <Link href="/" className="inline-block w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition">
            Retour à l'accueil
          </Link>
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
        <div className="w-10 h-10 border-4 border-sky-100 border-t-sky-500 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-medium">Redirection vers WhatsApp...</p>
      </div>
    }>
      <TrackLogic paramsPromise={params} />
    </Suspense>
  )
}
