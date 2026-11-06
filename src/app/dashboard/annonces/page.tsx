
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import DiffusionModal from './DiffusionModal'

export default function AnnoncesPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [submissions, setSubmissions] = useState<any[]>([])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!prof) return router.push('/login')
      setProfile(prof)

      const { data: c } = await supabase.from('campaigns').select('*').eq('status', 'active').order('created_at', { ascending: false })
      setCampaigns(c || [])

      const { data: s } = await supabase.from('ad_submissions').select('*').eq('user_id', user.id)
      setSubmissions(s || [])

      setLoading(false)
    }
    load()
  }, [router, supabase])

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
      <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin mb-4"></div>
      <p className="text-slate-500 font-medium text-sm">Chargement...</p>
    </div>
  )

  const level = profile?.level || 1
  const gainPerView = level === 1 ? 0.50 : level === 2 ? 1.25 : 1.75

  const hasValidatedTest = submissions?.some(s => s.status === 'validated' && campaigns?.find(c => c.id === s.campaign_id)?.is_welcome_campaign)
  const isInTestMode = profile?.is_test_mode === true && !hasValidatedTest

  const welcomeCampaign = campaigns?.find(c => c.is_welcome_campaign)
  const paidCampaigns = campaigns?.filter(c => !c.is_welcome_campaign) || []

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 px-5 py-4 sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-slate-500 hover:text-slate-900 bg-slate-100 p-2 rounded-full active:bg-slate-200 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <h1 className="text-lg font-black text-slate-900">Annonces</h1>
        </div>
        <Link href="/dashboard/annonces/creer" className="px-4 py-2 bg-sky-500 text-white text-xs font-bold rounded-xl active:scale-95 transition shadow-md flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
          Créer
        </Link>
      </header>

      <div className="p-4 max-w-2xl mx-auto">
        
        {isInTestMode && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl mb-5 flex gap-3">
            <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <h3 className="font-bold text-amber-800 text-sm">Mode Test Actif</h3>
              <p className="text-amber-700 text-xs mt-1 leading-relaxed">Publie l'annonce recommandée ci-dessous pour débloquer les campagnes payantes.</p>
            </div>
          </div>
        )}

        {(!campaigns || campaigns.length === 0) ? (
          <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm text-center mt-4">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </div>
            <p className="text-slate-500 text-sm">Aucune annonce active pour le moment.</p>
          </div>
        ) : (
          <div className="space-y-5">
            
            {welcomeCampaign && (
              <div className="bg-white border-2 border-emerald-400 rounded-3xl shadow-md overflow-hidden flex flex-col">
                {welcomeCampaign.image_url && (
                  <div className="h-44 w-full bg-slate-100 relative">
                    <img src={welcomeCampaign.image_url} alt={welcomeCampaign.title} className="w-full h-full object-cover" />
                    <div className="absolute top-3 left-3 bg-emerald-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-md flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.381z" clipRule="evenodd" /></svg>
                      Recommandé
                    </div>
                  </div>
                )}
                <div className="p-5">
                  <h3 className="font-bold text-lg text-slate-900 mb-2">{welcomeCampaign.title}</h3>
                  <p className="text-sm text-slate-500 mb-4 line-clamp-3 leading-relaxed">{welcomeCampaign.description}</p>
                  
                  <div className="flex items-center justify-between mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Gain par vue</p>
                      <p className="text-xl font-black text-emerald-600">0,00 F</p>
                    </div>
                    <span className="bg-purple-50 text-purple-700 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-purple-100">
                      Test (Gratuit)
                    </span>
                  </div>
                  
                  <DiffusionModal campaign={welcomeCampaign} userId={profile.id} submission={submissions?.find(s => s.campaign_id === welcomeCampaign.id)} />
                </div>
              </div>
            )}

            {paidCampaigns.length > 0 && (
              <div className="relative mt-6">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-black text-slate-900">Campagnes payantes</h2>
                  {isInTestMode && (
                    <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase">Bloqué</span>
                  )}
                </div>

                <div className={`grid grid-cols-1 gap-4 ${isInTestMode ? 'blur-[2px] pointer-events-none select-none opacity-50' : ''}`}>
                  {paidCampaigns.map((campaign) => (
                    <div key={campaign.id} className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden flex flex-col">
                      {campaign.image_url && (
                        <div className="h-40 w-full bg-slate-100 relative">
                          <img src={campaign.image_url} alt={campaign.title} className="w-full h-full object-cover" />
                          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-lg text-[10px] font-bold text-slate-900 shadow-sm flex items-center gap-1">
                            <svg className="w-3 h-3 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            {campaign.views_purchased?.toLocaleString('fr-FR')} vues
                          </div>
                        </div>
                      )}
                      <div className="p-5 flex-1 flex flex-col">
                        <h3 className="font-bold text-slate-900 line-clamp-1 mb-1">{campaign.title}</h3>
                        <p className="text-sm text-slate-500 line-clamp-2 mb-4 flex-1 leading-relaxed">{campaign.description}</p>
                        
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
                        
                        <DiffusionModal campaign={campaign} userId={profile.id} submission={submissions?.find(s => s.campaign_id === campaign.id)} />
                      </div>
                    </div>
                  ))}
                </div>

                {isInTestMode && (
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <div className="bg-white/95 backdrop-blur-sm p-6 rounded-3xl shadow-2xl border border-slate-200 text-center max-w-[260px] mx-auto">
                      <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                      </div>
                      <h3 className="font-black text-slate-900 text-base mb-2">Campagnes verrouillées</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">Termine d'abord ta campagne test pour débloquer ces annonces.</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
