import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'

async function AnalyticsContent() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Récupérer toutes les campagnes de l'annonceur
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // Récupérer toutes les soumissions liées à ces campagnes
  const campaignIds = campaigns?.map(c => c.id) || []
  const { data: submissions } = await supabase
    .from('ad_submissions')
    .select('*')
    .in('campaign_id', campaignIds)

  // Calculer les statistiques globales
  const totalViews = submissions?.reduce((acc, s) => acc + (s.views_count || 0), 0) || 0
  const totalClicks = submissions?.reduce((acc, s) => acc + (s.whatsapp_clicks || 0), 0) || 0
  const totalBudgetSpent = campaigns?.reduce((acc, c) => acc + (c.budget || 0), 0) || 0
  const activeCampaigns = campaigns?.filter(c => c.status === 'active').length || 0
  const conversionRate = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : '0.0'

  // Top 3 des meilleures campagnes (par vues)
  const topCampaigns = campaigns?.map(c => {
    const campSubs = submissions?.filter(s => s.campaign_id === c.id) || []
    const views = campSubs.reduce((acc, s) => acc + (s.views_count || 0), 0)
    return { ...c, totalViews: views }
  }).sort((a, b) => b.totalViews - a.totalViews).slice(0, 3)

  return (
    <div className="space-y-6">
      
      {/* 4 Cartes de statistiques */}
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
          <p className="text-2xl font-black text-amber-600">{totalBudgetSpent.toLocaleString('fr-FR')} F</p>
        </div>
      </div>

      {/* Top Campagnes */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">Top 3 de tes campagnes</h2>
          <p className="text-xs text-slate-500">Les annonces qui génèrent le plus de vues.</p>
        </div>
        <div className="divide-y divide-slate-100">
          {topCampaigns?.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">Aucune campagne pour le moment.</div>
          ) : (
            topCampaigns?.map((c, idx) => (
              <div key={c.id} className="p-4 flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${idx === 0 ? 'bg-amber-100 text-amber-600' : idx === 1 ? 'bg-slate-200 text-slate-600' : 'bg-orange-100 text-orange-600'}`}>
                  #{idx + 1}
                </div>
                {c.image_url && <img src={c.image_url} className="w-12 h-12 rounded-lg object-cover shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 text-sm truncate">{c.title}</p>
                  <p className="text-xs text-slate-500">{c.totalViews.toLocaleString('fr-FR')} vues</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded ${c.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {c.status === 'active' ? 'Active' : c.status === 'pending' ? 'En attente' : c.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Liste complète des campagnes */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">Toutes mes campagnes ({campaigns?.length || 0})</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {campaigns?.map((c) => {
            const campSubs = submissions?.filter(s => s.campaign_id === c.id) || []
            const views = campSubs.reduce((acc, s) => acc + (s.views_count || 0), 0)
            const clicks = campSubs.reduce((acc, s) => acc + (s.whatsapp_clicks || 0), 0)
            const progress = c.views_purchased > 0 ? Math.min((views / c.views_purchased) * 100, 100) : 0
            
            return (
              <div key={c.id} className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{c.title}</p>
                    <p className="text-xs text-slate-500">Budget: {c.budget?.toLocaleString('fr-FR')} F • {c.duration_days} jours</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded ${c.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {c.status}
                  </span>
                </div>
                
                {/* Barre de progression */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1 bg-slate-100 rounded-full h-2">
                    <div className="bg-sky-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }}></div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-600">{progress.toFixed(0)}%</span>
                </div>
                
                <div className="flex justify-between text-xs text-slate-500">
                  <span>{views} / {c.views_purchased} vues</span>
                  <span className="font-bold text-emerald-600">{clicks} clics WhatsApp</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}

export default function AnalyticsPage() {
  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex items-center gap-4">
        <Link href="/dashboard" className="text-slate-500 hover:text-slate-900 bg-slate-100 p-2 rounded-full">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-lg font-bold text-slate-900">Tableau de Bord Annonceur</h1>
      </header>

      <div className="p-4 md:p-8 max-w-4xl mx-auto mt-2">
        <Suspense fallback={<div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin"></div></div>}>
          <AnalyticsContent />
        </Suspense>
      </div>
    </main>
  )
}
