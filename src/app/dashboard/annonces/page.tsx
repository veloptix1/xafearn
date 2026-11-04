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
  
  // Calcul du taux de gain selon le niveau
  const level = profile?.level || 1
  const gainPerView = level === 1 ? 0.50 : level === 2 ? 1.25 : 1.75

  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  const { data: submissions } = await supabase
    .from('ad_submissions')
    .select('*')
    .eq('user_id', user.id)

  const hasValidatedTest = submissions?.some(s => s.status === 'validated' && campaigns?.find(c => c.id === s.campaign_id)?.is_welcome_campaign)
  const isInTestMode = profile?.is_test_mode === true && !hasValidatedTest

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
            <h3 className="font-bold text-amber-800 text-sm">Mode Test Actif</h3>
            <p className="text-amber-700 text-xs mt-1">Publie l'annonce recommandée ci-dessous pour débloquer les campagnes payantes.</p>
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
            <div className="bg-white border-2 border-emerald-400 rounded-2xl shadow-md overflow-hidden flex flex-col hover:shadow-lg transition">
              {welcomeCampaign.image_url && (
                <div className="h-48 w-full bg-slate-100 relative">
                  <img src={welcomeCampaign.image_url} alt={welcomeCampaign.title} className="w-full h-full object-cover" />
                  <div className="absolute top-3 left-3 bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md">
                    Recommandé pour toi
                  </div>
                </div>
              )}
              <div className="p-5">
                <h3 className="font-bold text-lg text-slate-900 mb-2">{welcomeCampaign.title}</h3>
                <p className="text-sm text-slate-500 mb-4 line-clamp-3">{welcomeCampaign.description}</p>
                
                {/* On affiche 0 F car c'est une campagne test */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs text-slate-500">Gain par vue</p>
                    <p className="text-xl font-black text-emerald-600">0,00 F</p>
                  </div>
                  <span className="bg-purple-50 text-purple-700 text-xs font-bold px-2 py-1 rounded border border-purple-100">
                    Test (Gratuit)
                  </span>
                </div>

                <DiffusionModal campaign={welcomeCampaign} userId={user.id} submission={submissions?.find(s => s.campaign_id === welcomeCampaign.id)} />
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
                        <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-bold text-slate-900 shadow-sm">
                          {campaign.views_purchased?.toLocaleString('fr-FR')} vues
                        </div>
                      </div>
                    )}
                    <div className="p-4 flex-1 flex flex-col">
                      <h3 className="font-bold text-slate-900 line-clamp-1 mb-1">{campaign.title}</h3>
                      <p className="text-sm text-slate-500 line-clamp-2 mb-4 flex-1">{campaign.description}</p>
                      
                      {/* ICI : On affiche le gain du diffuseur selon SON niveau */}
                      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 mb-4 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Ton gain / vue</p>
                          <p className="text-lg font-black text-emerald-600">{gainPerView.toFixed(2)} F</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Gain max</p>
                          <p className="text-sm font-bold text-slate-700">
                            {(gainPerView * (campaign.views_purchased || 1000)).toLocaleString('fr-FR')} F
                          </p>
                        </div>
                      </div>

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
                    <p className="text-xs text-slate-500 mb-4">Termine d'abord ta campagne test pour débloquer ces annonces.</p>
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
        <img src="/logo.png" alt="XAFEARN" className="h-6 w-auto object-contain" />
      </header>

      <div className="p-4 md:p-8 max-w-4xl mx-auto mt-2">
        <Suspense fallback={<div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin"></div></div>}>
          <CatalogueContent />
        </Suspense>
      </div>
    </main>
  )
}
