'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function HistoriquePage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'gains' | 'diffusions'>('gains')
  
  const [profile, setProfile] = useState<any>(null)
  const [withdrawals, setWithdrawals] = useState<any[]>([])
  const [submissions, setSubmissions] = useState<any[]>([])
  const [campaigns, setCampaigns] = useState<any[]>([])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')

      // 1. Profil
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)

      // 2. Retraits (Gains)
      const { data: wds } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      setWithdrawals(wds || [])

      // 3. Soumissions (Diffusions)
      const { data: subs } = await supabase
        .from('ad_submissions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      setSubmissions(subs || [])

      // 4. Campagnes (pour avoir les titres et les gains)
      if (subs && subs.length > 0) {
        const campIds = subs.map(s => s.campaign_id)
        const { data: camps } = await supabase.from('campaigns').select('*').in('id', campIds)
        setCampaigns(camps || [])
      }

      setLoading(false)
    }
    load()
  }, [router, supabase])

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">Chargement...</div>

  const level = profile?.level || 1
  const gainPerView = level === 1 ? 0.50 : level === 2 ? 1.25 : 1.75

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex items-center gap-4">
        <Link href="/dashboard" className="text-slate-500 hover:text-slate-900 bg-slate-100 p-2 rounded-full">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-lg font-bold text-slate-900">Mon Historique</h1>
      </header>

      <div className="p-4 md:p-8 max-w-2xl mx-auto mt-4">
        
        {/* Onglets */}
        <div className="flex bg-slate-200 p-1 rounded-xl mb-6">
          <button 
            onClick={() => setActiveTab('gains')} 
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition ${activeTab === 'gains' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
          >
            💰 Mes Gains & Retraits
          </button>
          <button 
            onClick={() => setActiveTab('diffusions')} 
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition ${activeTab === 'diffusions' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500'}`}
          >
            📢 Mes Diffusions
          </button>
        </div>

        {/* SECTION GAINS */}
        {activeTab === 'gains' && (
          <div className="space-y-4">
            {withdrawals.length === 0 ? (
              <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <h3 className="font-bold text-slate-900 mb-1">Aucun retrait</h3>
                <p className="text-slate-500 text-sm">Vos demandes de retrait apparaîtront ici.</p>
              </div>
            ) : (
              withdrawals.map(w => (
                <div key={w.id} className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex justify-between items-center">
                  <div>
                    <p className="font-bold text-slate-900">{w.operator} ({w.country})</p>
                    <p className="text-xs text-slate-500">{new Date(w.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                    <p className="text-xs text-slate-400 mt-1">Frais: {w.fee} F</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-slate-900">{w.amount.toLocaleString('fr-FR')} F</p>
                    <p className={`text-xs font-bold mt-1 ${w.status === 'paid' ? 'text-emerald-600' : w.status === 'rejected' ? 'text-red-600' : 'text-amber-600'}`}>
                      {w.status === 'paid' ? 'Payé' : w.status === 'rejected' ? 'Rejeté' : 'En attente'}
                    </p>
                  </div>
                </div>
              ))
            )}
            
            {/* Info sur les gains */}
            <div className="bg-sky-50 border border-sky-100 p-4 rounded-2xl mt-4">
              <p className="text-xs text-sky-800 font-medium">
                💡 Ton gain actuel : <strong>{gainPerView.toFixed(2)} F / vue</strong> (Niveau {level})
              </p>
            </div>
          </div>
        )}

        {/* SECTION DIFFUSIONS */}
        {activeTab === 'diffusions' && (
          <div className="space-y-4">
            {submissions.length === 0 ? (
              <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
                </div>
                <h3 className="font-bold text-slate-900 mb-1">Aucune diffusion</h3>
                <p className="text-slate-500 text-sm">Vos diffusions apparaîtront ici.</p>
              </div>
            ) : (
              submissions.map(s => {
                const campaign = campaigns.find(c => c.id === s.campaign_id)
                return (
                  <div key={s.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="flex gap-3 p-3">
                      {campaign?.image_url && (
                        <img src={campaign.image_url} className="w-16 h-16 rounded-lg object-cover shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-slate-900 text-sm truncate">{campaign?.title || 'Campagne supprimée'}</h3>
                        <p className="text-xs text-slate-500 mt-1">
                          {new Date(s.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        </p>
                        <div className="flex justify-between items-center mt-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            s.status === 'validated' ? 'bg-emerald-100 text-emerald-700' : 
                            s.status === 'rejected' ? 'bg-red-100 text-red-700' : 
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {s.status === 'validated' ? 'Validé' : s.status === 'rejected' ? 'Rejeté' : 'En attente'}
                          </span>
                          {s.status === 'validated' && (
                            <span className="text-xs font-bold text-emerald-600">
                              +{(s.views_count * gainPerView).toFixed(2)} F
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {s.status === 'validated' && (
                      <div className="bg-emerald-50 px-3 py-2 text-xs text-emerald-700 border-t border-emerald-100">
                        {s.views_count} vues validées
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}

      </div>
    </main>
  )
}
