'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function BonusPage() {
  const supabase = createClient()
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [conditions, setConditions] = useState<any>(null)
  const [network, setNetwork] = useState({ l1: 0, l2: 0, l3: 0 })
  const [isRequesting, setIsRequesting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return router.replace('/login')

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      setProfile(prof)

      const { data: cond } = await supabase.rpc('check_bonus_conditions', { p_user_id: session.user.id })
      setConditions(cond)

      const { data: l1 } = await supabase.from('profiles').select('id').eq('referred_by', session.user.id)
      const l1Ids = l1?.map(p => p.id) || []
      let l2Ids: string[] = []
      if (l1Ids.length > 0) {
        const { data: l2 } = await supabase.from('profiles').select('id').in('referred_by', l1Ids)
        l2Ids = l2?.map(p => p.id) || []
      }
      let l3Ids: string[] = []
      if (l2Ids.length > 0) {
        const { data: l3 } = await supabase.from('profiles').select('id').in('referred_by', l2Ids)
        l3Ids = l3?.map(p => p.id) || []
      }
      setNetwork({ l1: l1Ids.length, l2: l2Ids.length, l3: l3Ids.length })

      setLoading(false)
    }
    load()
  }, [supabase, router])

  const copyLink = () => {
    navigator.clipboard.writeText(`https://getagriculture.store/signup?ref=${profile?.referral_code}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleWithdrawClick = () => {
    if (!conditions) return
    if (conditions.available_earnings < conditions.min_withdrawal) {
      setToast(`Il te manque ${(conditions.min_withdrawal - conditions.available_earnings).toLocaleString('fr-FR')} F pour retirer.`)
      setTimeout(() => setToast(null), 3000)
      return
    }
    setShowWithdrawModal(true)
  }

  const confirmWithdrawal = async () => {
    if (!conditions.can_withdraw) return
    setIsRequesting(true)
    const { data, error } = await supabase.rpc('request_bonus_withdrawal', { p_user_id: profile.id })
    if (error) {
      setToast('Erreur: ' + error.message)
    } else if (data.success) {
      setToast(`Retrait effectué ! +${data.amount_received.toLocaleString('fr-FR')} F sur ton solde.`)
      setShowWithdrawModal(false)
      setTimeout(() => router.push('/dashboard'), 2000)
    } else {
      setToast('Conditions non remplies.')
    }
    setIsRequesting(false)
    setTimeout(() => setToast(null), 3000)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin"></div></div>

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white border-b border-slate-200 px-4 py-4 flex items-center gap-3">
        <Link href="/dashboard" className="text-slate-500 bg-slate-100 p-2 rounded-full active:bg-slate-200">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="font-bold text-slate-900 flex-1">Bonus</h1>
      </header>

      <div className="p-4 max-w-md mx-auto space-y-4">

        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-2xl transform translate-x-10 -translate-y-10"></div>
          <div className="relative z-10">
            <p className="text-xs font-bold text-emerald-100 uppercase mb-1">Gains disponibles</p>
            <p className="text-4xl font-black mb-1">{conditions?.available_earnings.toLocaleString('fr-FR') || 0} F</p>
            <p className="text-xs text-emerald-100">Objectif : {conditions?.min_withdrawal.toLocaleString('fr-FR')} F</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase mb-2">Ton lien d'invitation</p>
          <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-3 text-center mb-4">
            <span className="text-lg font-black tracking-widest text-sky-600">{profile?.referral_code}</span>
          </div>
          <button onClick={copyLink} className="w-full py-3 bg-sky-500 text-white font-bold rounded-xl active:scale-95 transition">
            {copied ? 'Lien copié !' : 'Copier le lien'}
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="font-bold text-slate-900 mb-3">Mon réseau</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-sky-50 rounded-xl p-3 text-center"><p className="text-2xl font-black text-sky-600">{network.l1}</p><p className="text-[10px] font-bold text-slate-500">Niveau 1</p></div>
            <div className="bg-indigo-50 rounded-xl p-3 text-center"><p className="text-2xl font-black text-indigo-600">{network.l2}</p><p className="text-[10px] font-bold text-slate-500">Niveau 2</p></div>
            <div className="bg-purple-50 rounded-xl p-3 text-center"><p className="text-2xl font-black text-purple-600">{network.l3}</p><p className="text-[10px] font-bold text-slate-500">Niveau 3</p></div>
          </div>
        </div>

        <button onClick={handleWithdrawClick} className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl shadow-md active:scale-95 transition">
          Demander un retrait
        </button>
      </div>

      {showWithdrawModal && conditions && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-end justify-center p-4" onClick={() => setShowWithdrawModal(false)}>
          <div className="bg-white rounded-t-3xl w-full max-w-md p-6 pb-8 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto mb-4"></div>
            <h2 className="text-xl font-black text-slate-900 mb-1 text-center">Retrait de {conditions.available_earnings.toLocaleString('fr-FR')} F</h2>
            <p className="text-xs text-slate-500 text-center mb-5">10% de frais s'appliquent</p>

            <p className="font-bold text-slate-900 text-sm mb-3">Conditions à remplir :</p>

            <div className="space-y-2 mb-5">
              <div className={`flex items-center gap-3 p-3 rounded-xl border ${conditions.tasks_done >= conditions.required_tasks ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${conditions.tasks_done >= conditions.required_tasks ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-slate-600'}`}>
                  {conditions.tasks_done >= conditions.required_tasks ? '✓' : '!'}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-900">Accomplir {conditions.required_tasks} tâches</p>
                  <p className="text-[10px] text-slate-500">{conditions.tasks_done} / {conditions.required_tasks}</p>
                </div>
              </div>

              <div className={`flex items-center gap-3 p-3 rounded-xl border ${conditions.active_refs >= conditions.required_refs ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${conditions.active_refs >= conditions.required_refs ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-slate-600'}`}>
                  {conditions.active_refs >= conditions.required_refs ? '✓' : '!'}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-900">Avoir {conditions.required_refs} filleuls actifs</p>
                  <p className="text-[10px] text-slate-500">{conditions.active_refs} / {conditions.required_refs}</p>
                </div>
              </div>

              <div className={`flex items-center gap-3 p-3 rounded-xl border ${conditions.phone_set ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${conditions.phone_set ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-slate-600'}`}>
                  {conditions.phone_set ? '✓' : '!'}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-900">Numéro de téléphone ajouté</p>
                </div>
              </div>

              <div className={`flex items-center gap-3 p-3 rounded-xl border ${conditions.email_verified ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${conditions.email_verified ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-slate-600'}`}>
                  {conditions.email_verified ? '✓' : '!'}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-900">Email vérifié</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-100 rounded-xl p-3 text-center mb-4">
              <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Tu recevras</p>
              <p className="text-2xl font-black text-emerald-600">{(conditions.available_earnings * 0.9).toFixed(0)} F</p>
            </div>

            <button onClick={confirmWithdrawal} disabled={!conditions.can_withdraw || isRequesting} className="w-full py-4 bg-emerald-500 text-white font-bold rounded-xl shadow-md disabled:opacity-50 active:scale-95 transition mb-2">
              {isRequesting ? 'Traitement...' : 'Confirmer le retrait'}
            </button>
            <button onClick={() => setShowWithdrawModal(false)} className="w-full py-3 bg-slate-100 text-slate-700 font-bold rounded-xl text-sm">Annuler</button>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[300] px-5 py-3 bg-slate-900 text-white text-sm font-bold rounded-full shadow-xl">{toast}</div>
      )}
    </main>
  )
}
