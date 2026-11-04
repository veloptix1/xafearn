import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'

async function AnalyticsContent() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 1. Récupérer toutes les campagnes de l'annonceur
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // 2. Récupérer toutes les soumissions liées à ces campagnes
  const campaignIds = campaigns?.map(c => c.id) || []
  const { data: submissions } = await supabase
    .from('ad_submissions')
    .select('*')
    .in('campaign_id', campaignIds)

  // 3. Récupérer les profils des diffuseurs pour connaître leurs villes (si on veut cibler)
  const { data: profiles } = await supabase.from('profiles').select('id, city')

  // --- CALCULS STATISTIQUES ---
  const totalViews = submissions?.reduce((acc, s) => acc + (s.views_count || 0), 0) || 0
  const totalClicks = submissions?.reduce((acc, s) => acc + (s.whatsapp_clicks || 0), 0) || 0
  const totalBudget = campaigns?.reduce((acc, c) => acc + (c.budget || 0), 0) || 0
  const activeCampaigns = campaigns?.filter(c => c.status === 'active').length || 0
  const conversionRate = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : '0.0'

  // Calcul des performances par ville (basé sur les profils des diffuseurs)
  const viewsByCity: Record<string, number> = {}
  submissions?.forEach(sub => {
    const profile = profiles?.find(p => p.id === sub.user_id)
    const city = profile?.city || 'Inconnue'
    viewsByCity[city] = (viewsByCity[city] || 0) + (sub.views_count || 0)
  })
  const topCities = Object.entries(viewsByCity)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4)

  return (
    <div className="space-y-6">
      
      {/* 1. CARTES DE STATISTIQUES GLOBALES */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Vues Totales</p>
          <p className="text-2xl font-black text-slate-900">{totalViews.toLocaleString('fr-FR')}</p>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Clics WhatsApp</p>
          <p className="text-2xl font-black text-emerald-600">{totalClicks.toLocaleString('fr-FR')}</p>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Taux de Conv.</p>
          <p className="text-2xl font-black text-sky-600">{conversionRate}%</p>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Budget Dépensé</p>
          <p className="text-2xl font-black text-amber-600">{totalBudget.toLocaleString('fr-FR')} F</p>
        </div>
      </div>

      {/* 2. GRAPHIQUE : RÉPARTITION DES VUES PAR VILLE */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-5">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-bold text-slate-900">Où sont tes clients ?</h2>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">Top Villes</span>
        </div>
        
        {topCities.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">Aucune donnée de localisation pour le moment.</p>
        ) : (
          <div className="space-y-4">
            {topCities.map(([city, views], index) => {
              const percentage = totalViews > 0 ? (views / totalViews) * 100 : 0
              const colors = ['bg-sky-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500']
              return (
                <div key={city}>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-slate-700">{index + 1}. {city}</span>
                    <span className="text-slate-900">{views.toLocaleString('fr-FR')} vues ({percentage.toFixed(1)}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3">
                    <div className={`${colors[index]} h-3 rounded-full transition-all`} style={{ width: `${percentage}%` }}></div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 3. LISTE DÉTAILLÉE DES CAMPAGNES */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-4">Performance de tes campagnes</h2>
        <div className="space-y-3">
          {campaigns?.length === 0 ? (
            <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm text-center">
              <p className="text-slate-500 text-sm mb-4">Tu n'as pas encore lancé de campagne.</p>
              <Link href="/dashboard/annonces/creer" className="inline-block px-6 py-2 bg-sky-500 text-white font-bold rounded-xl text-sm">
                Créer ma première campagne
              </Link>
            </div>
          ) : (
            campaigns?.map((c) => {
              const campSubs = submissions?.filter(s => s.campaign_id === c.id) || []
              const views = campSubs.reduce((acc, s) => acc + (s.views_count || 0), 0)
              const clicks = campSubs.reduce((acc, s) => acc + (s.whatsapp_clicks || 0), 0)
              const progress = c.views_purchased > 0 ? Math.min((views / c.views_purchased) * 100, 100) : 0
              const campConv = views > 0 ? ((clicks / views) * 100).toFixed(1) : '0.0'
              
              return (
                <div key={c.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                  <div className="p-4 flex flex-col md:flex-row gap-4">
                    {c.image_url && (
                      <img src={c.image_url} className="w-full md:w-24 h-24 object-cover rounded-xl shrink-0" />
                    )}
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-bold text-slate-900">{c.title}</h3>
                          <p className="text-xs text-slate-500 mt-1">Budget : {c.budget?.toLocaleString('fr-FR')} F • {c.duration_days} jours</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${
                          c.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 
                          c.status === 'pending' ? 'bg-amber-100 text-amber-700' : 
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {c.status === 'active' ? 'En ligne' : c.status === 'pending' ? 'En attente' : c.status}
                        </span>
                      </div>

                      {/* Barre de progression des vues */}
                      <div className="mt-4">
                        <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                          <span>Progression des vues</span>
                          <span>{views} / {c.views_purchased}</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2">
                          <div className="bg-sky-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }}></div>
                        </div>
                      </div>

                      {/* Stats détaillées */}
                      <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                        <div className="bg-slate-50 p-2 rounded-lg">
                          <p className="text-[10px] text-slate-500 font-bold uppercase">Vues</p>
                          <p className="text-sm font-black text-slate-900">{views}</p>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-lg">
                          <p className="text-[10px] text-slate-500 font-bold uppercase">Clics</p>
                          <p className="text-sm font-black text-emerald-600">{clicks}</p>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-lg">
                          <p className="text-[10px] text-slate-500 font-bold uppercase">Conv.</p>
                          <p className="text-sm font-black text-sky-600">{campConv}%</p>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

    </div>
  )
}

export default function AnalyticsPage() {
  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-slate-500 hover:text-slate-900 bg-slate-100 p-2 rounded-full">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <h1 className="text-lg font-bold text-slate-900">Tableau de Bord</h1>
        </div>
        <Link href="/dashboard/annonces/creer" className="px-3 py-1.5 bg-sky-500 text-white text-xs font-bold rounded-lg hover:bg-sky-400">
          + Campagne
        </Link>
      </header>

      <div className="p-4 md:p-8 max-w-4xl mx-auto mt-2">
        <Suspense fallback={<div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin"></div></div>}>
          <AnalyticsContent />
        </Suspense>
      </div>
    </main>
  )
}
