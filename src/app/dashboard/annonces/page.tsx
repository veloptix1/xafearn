import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import DiffusionModal from './DiffusionModal'

async function CatalogueContent() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const isInTestMode = profile?.is_test_mode === true

  // On récupère toutes les campagnes actives
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  const { data: submissions } = await supabase
    .from('ad_submissions')
    .select('*')
    .eq('user_id', user.id)

  // On sépare l'annonce test et les annonces payantes
  const welcomeCampaign = campaigns?.find(c => c.is_welcome_campaign)
  const paidCampaigns = campaigns?.filter(c => !c.is_welcome_campaign) || []

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Catalogue</h1>
        <Link href="/dashboard/annonces/creer" className="px-4 py-2 bg-sky-500 text-white text-sm font-bold rounded-xl hover:bg-sky-400 transition shadow-sm flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
          Créer
        </Link>
      </div>

      {isInTestMode && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl mb-6 flex gap-3">
          <div className="text-amber-500 shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div>
            <h3 className="font-bold text-amber-800 text-sm">Mode Test Actif (2 jours)</h3>
            <p className="text-amber-700 text-xs mt-1">Publie l'annonce recommandée ci-dessous pour prouver ta fiabilité et débloquer toutes les campagnes payantes.</p>
          </div>
        </div>
      )}

      {!campaigns || campaigns.length === 0 ? (
        <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm text-center">
          <p className="text-slate-500 text-sm">Aucune annonce active pour le moment.</p>
        </div>
      ) : (
        <div className="space-y-4">
          
          {/* L'annonce de bienvenue */}
          {welcomeCampaign && (
            <div>
              <div className="bg-white border-2 border-emerald-400 rounded-2xl shadow-md overflow-hidden flex flex-col hover:shadow-lg transition">
                {welcomeCampaign.image_url && (
                  <div className="h-48 w-full bg-slate-100 relative">
                    <img src={welcomeCampaign.image_url} alt={welcomeCampaign.title} className="w-full h-full object-cover" />
                    <div className="absolute top-3 left-3 bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                      Recommandé pour toi
                    </div>
                  </div>
                )}
                <div className="p-5">
                  <h3 className="font-bold text-lg text-slate-900 mb-2">{welcomeCampaign.title}</h3>
                  <p className="text-sm text-slate-500 mb-4 line-clamp-3">{welcomeCampaign.description}</p>
                  <DiffusionModal campaign={welcomeCampaign} userId={user.id} submission={submissions?.find(s => s.campaign_id === welcomeCampaign.id)} />
                </div>
              </div>
            </div>
          )}

          {/* Les campagnes payantes */}
          {paidCampaigns.length > 0 && (
            <div className="relative mt-8">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-lg font-bold text-slate-900">Campagnes payantes</h2>
                {isInTestMode && (
                  <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Bloqué</span>
                )}
              </div>

              <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${isInTestMode ? 'blur-sm pointer-events-none select-none opacity-60' : ''}`}>
                {paidCampaigns.map((campaign) => (
                  <div key={campaign.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                    {campaign.image_url && (
                      <div className="h-40 w-full bg-slate-100 relative">
                        <img src={campaign.image_url} alt={campaign.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="p-4 flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-slate-900 line-clamp-1">{campaign.title}</h3>
                        {campaign.price > 0 && <span className="font-black text-emerald-600 whitespace-nowrap ml-2">{campaign.price} F</span>}
                      </div>
                      <p className="text-sm text-slate-500 line-clamp-2 mb-4 flex-1">{campaign.description}</p>
                      <DiffusionModal campaign={campaign} userId={user.id} submission={submissions?.find(s => s.campaign_id === campaign.id)} />
                    </div>
                  </div>
                ))}
              </div>

              {isInTestMode && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-200 text-center max-w-xs mx-auto">
                    <div className="w-12 h-12 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm mb-1">Campagnes verrouillées</h3>
                    <p className="text-xs text-slate-500 mb-4">Termine d'abord ta campagne test pour débloquer ces annonces et gagner plus.</p>
                    <Link href="#welcome" className="block w-full py-2 bg-slate-900 text-white font-bold text-xs rounded-lg hover:bg-slate-800 transition">
                      Voir l'annonce test
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  )
}

export default function AnnoncesPage() {
  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-slate-500 hover:text-slate-900">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <h1 className="text-lg font-bold text-slate-900">Annonces</h1>
        </div>
        <img src="/logo.png" alt="XAFERAN" className="h-6 w-auto object-contain" />
      </header>

      <div className="p-4 md:p-8 max-w-4xl mx-auto mt-2">
        <Suspense fallback={<div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin"></div></div>}>
          <CatalogueContent />
        </Suspense>
      </div>
    </main>
  )
}
