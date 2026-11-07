'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Toast from '@/components/Toast'

export default function MonLienPage() {
  const supabase = createClient()
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [network, setNetwork] = useState<{ level1: any[], level2: any[], level3: any[] }>({ level1: [], level2: [], level3: [] })
  const [totalEarnings, setTotalEarnings] = useState(0)
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => setToast({ message: msg, type })

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.replace('/login')

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)

      // 1. Récupérer les filleuls directs (Niveau 1)
      const { data: lvl1 } = await supabase.from('profiles').select('id, full_name, is_premium, avatar_url').eq('referred_by', user.id)
      
      // 2. Récupérer les filleuls de niveau 2
      let lvl2: any[] = []
      if (lvl1 && lvl1.length > 0) {
        const lvl1Ids = lvl1.map(p => p.id)
        const { data: l2 } = await supabase.from('profiles').select('id, full_name, is_premium, avatar_url').in('referred_by', lvl1Ids)
        if (l2) lvl2 = l2
      }

      // 3. Récupérer les filleuls de niveau 3
      let lvl3: any[] = []
      if (lvl2.length > 0) {
        const lvl2Ids = lvl2.map(p => p.id)
        const { data: l3 } = await supabase.from('profiles').select('id, full_name, is_premium, avatar_url').in('referred_by', lvl2Ids)
        if (l3) lvl3 = l3
      }

      setNetwork({ level1: lvl1 || [], level2: lvl2, level3: lvl3 })

      // 4. Calculer les gains de parrainage
      const { data: txs } = await supabase.from('transactions').select('amount').eq('user_id', user.id).in('type', ['referral_l1', 'referral_l2', 'referral_l3'])
      if (txs) {
        const total = txs.reduce((sum, tx) => sum + Number(tx.amount), 0)
        setTotalEarnings(total)
      }

      setLoading(false)
    }
    init()
  }, [supabase, router])

  const copyLink = () => {
    const link = `${window.location.origin}/signup?ref=${profile?.referral_code}`
    navigator.clipboard.writeText(link)
    showToast('Lien copié dans le presse-papier !', 'success')
  }

  const copyCode = () => {
    navigator.clipboard.writeText(profile?.referral_code || '')
    showToast('Code copié !', 'success')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-medium">Chargement...</p>
      </div>
    )
  }

  const referralLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/signup?ref=${profile?.referral_code}`

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex items-center gap-4">
        <Link href="/dashboard" className="text-slate-500 hover:text-slate-900 bg-slate-100 p-2 rounded-full transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-lg font-bold text-slate-900">Mon Lien de Parrainage</h1>
      </header>

      <div className="p-4 md:p-8 max-w-2xl mx-auto mt-4 space-y-4">
        
        {/* Carte des gains totaux */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-10 -translate-y-10"></div>
          <div className="relative z-10">
            <p className="text-emerald-100 text-xs font-bold uppercase tracking-wider mb-1">Gains de parrainage</p>
            <h2 className="text-4xl font-black mb-1">{totalEarnings.toLocaleString('fr-FR')} FCFA</h2>
            <p className="text-xs text-emerald-100">Depuis le début</p>
          </div>
        </div>

        {/* Carte lien de parrainage */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-900 mb-4 text-sm">Invite tes amis</h3>
          
          <div className="mb-4">
            <label className="text-xs font-bold text-slate-500 mb-1 block">Ton code</label>
            <div className="flex gap-2">
              <div className="flex-1 p-3 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl text-center">
                <span className="text-xl font-black text-slate-900 tracking-wider">{profile?.referral_code}</span>
              </div>
              <button onClick={copyCode} className="px-4 bg-sky-100 text-sky-600 rounded-xl font-bold active:bg-sky-200 transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              </button>
            </div>
          </div>

          <div className="mb-2">
            <label className="text-xs font-bold text-slate-500 mb-1 block">Ton lien d'invitation</label>
            <input type="text" readOnly value={referralLink} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600" />
          </div>

          <button onClick={copyLink} className="w-full py-3 bg-sky-500 text-white font-bold rounded-xl text-sm shadow-md active:scale-[0.98] transition mt-2">
            Copier mon lien d'invitation
          </button>

          <div className="mt-4 bg-amber-50 border border-amber-200 p-3 rounded-xl text-[11px] text-amber-800 leading-relaxed">
            💡 <strong>Rappel important :</strong> Tu ne gagnes de l'argent que si ton filleul <strong>active son compte Premium (2000 FCFA)</strong>. Les comptes non activés ne te rapportent rien.
          </div>
        </div>

        {/* Statistiques du réseau */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 text-center">
            <p className="text-[10px] font-bold text-slate-500 uppercase">Niveau 1</p>
            <p className="text-2xl font-black text-sky-600 mt-1">{network.level1.length}</p>
            <p className="text-[9px] text-slate-400">50% de commission</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 text-center">
            <p className="text-[10px] font-bold text-slate-500 uppercase">Niveau 2</p>
            <p className="text-2xl font-black text-indigo-600 mt-1">{network.level2.length}</p>
            <p className="text-[9px] text-slate-400">25% de commission</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 text-center">
            <p className="text-[10px] font-bold text-slate-500 uppercase">Niveau 3</p>
            <p className="text-2xl font-black text-purple-600 mt-1">{network.level3.length}</p>
            <p className="text-[9px] text-slate-400">10% de commission</p>
          </div>
        </div>

        {/* Liste des filleuls */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
            <h3 className="font-bold text-slate-700 text-sm">Mes filleuls</h3>
          </div>
          
          {network.level1.length === 0 && network.level2.length === 0 && network.level3.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <p className="text-sm">Aucun filleul pour le moment.</p>
              <p className="text-xs mt-1">Partage ton lien pour commencer à gagner !</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {network.level1.map(f => (
                <div key={f.id} className="flex items-center gap-3 p-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-blue-500 rounded-full flex items-center justify-center font-bold text-white text-sm shrink-0">
                    {f.full_name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 text-sm truncate">{f.full_name}</p>
                    <p className="text-[10px] text-slate-500">Niveau 1</p>
                  </div>
                  {f.is_premium ? (
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md">Actif</span>
                  ) : (
                    <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded-md">Inactif</span>
                  )}
                </div>
              ))}
              {network.level2.map(f => (
                <div key={f.id} className="flex items-center gap-3 p-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center font-bold text-white text-sm shrink-0">
                    {f.full_name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 text-sm truncate">{f.full_name}</p>
                    <p className="text-[10px] text-slate-500">Niveau 2</p>
                  </div>
                  {f.is_premium ? (
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md">Actif</span>
                  ) : (
                    <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded-md">Inactif</span>
                  )}
                </div>
              ))}
              {network.level3.map(f => (
                <div key={f.id} className="flex items-center gap-3 p-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center font-bold text-white text-sm shrink-0">
                    {f.full_name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 text-sm truncate">{f.full_name}</p>
                    <p className="text-[10px] text-slate-500">Niveau 3</p>
                  </div>
                  {f.is_premium ? (
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md">Actif</span>
                  ) : (
                    <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded-md">Inactif</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
