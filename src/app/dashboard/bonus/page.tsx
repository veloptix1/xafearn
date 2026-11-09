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
  const [totalInvites, setTotalInvites] = useState(0)
  const [pendingEarnings, setPendingEarnings] = useState(0)
  const [isRequesting, setIsRequesting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return router.replace('/login')

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      setProfile(prof)

      // Récupérer le statut des conditions
      const { data: cond } = await supabase.rpc('check_bonus_conditions', { p_user_id: session.user.id })
      setConditions(cond)

      // Compter les filleuls directs (invitations)
      const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('referred_by', session.user.id)
      setTotalInvites(count || 0)

      // Calculer les gains en attente
      const { data: pending } = await supabase.from('bonus_earnings').select('amount').eq('referrer_id', session.user.id).eq('status', 'pending')
      setPendingEarnings(pending?.reduce((sum, e) => sum + Number(e.amount), 0) || 0)

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

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin"></div></div>

  const progress = conditions ? Math.min((conditions.available_earnings / conditions.min_withdrawal) * 100, 100) : 0

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white border-b border-slate-200 px-4 py-4 flex items-center gap-3">
        <Link href="/dashboard" className="text-slate-500 bg-slate-100 p-2 rounded-full active:bg-slate-200">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="font-bold text-slate-900 flex-1">Bonus</h1>
      </header>

      <div className="p-4 max-w-md mx-auto space-y-4">

        {/* HERO : Gains disponibles */}
        <div className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 rounded-[2rem] p-6 text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl transform translate-x-16 -translate-y-16"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-teal-300/20 rounded-full blur-2xl transform -translate-x-10 translate-y-10"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 bg-emerald-300 rounded-full animate-pulse"></div>
              <p className="text-xs font-bold text-emerald-100 uppercase tracking-wider">Gains disponibles</p>
            </div>
            <div className="flex items-baseline gap-2 mb-3">
              <p className="text-5xl font-black">{conditions?.available_earnings.toLocaleString('fr-FR') || 0}</p>
              <p className="text-lg font-bold text-emerald-200">FCFA</p>
            </div>
            
            {/* Barre de progression */}
            <div className="mb-3">
              <div className="flex justify-between text-[10px] font-bold text-emerald-100 mb-1">
                <span>Progression</span>
                <span>{progress.toFixed(0)}%</span>
              </div>
              <div className="w-full h-2.5 bg-emerald-900/40 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-yellow-300 to-emerald-200 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
              </div>
            </div>

            <p className="text-[11px] text-emerald-100">Objectif : {conditions?.min_withdrawal.toLocaleString('fr-FR')} F pour débloquer le retrait</p>
          </div>
        </div>

        {/* Statistiques : Invitations + En attente */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 bg-sky-100 text-sky-600 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </div>
              <p className="text-[10px] font-bold text-slate-500 uppercase">Invités</p>
            </div>
            <p className="text-2xl font-black text-slate-900">{totalInvites}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <p className="text-[10px] font-bold text-slate-500 uppercase">En attente</p>
            </div>
            <p className="text-2xl font-black text-slate-900">{pendingEarnings.toLocaleString('fr-FR')} F</p>
          </div>
        </div>

        {/* Lien d'invitation */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-slate-500 uppercase">Ton lien d'invitation</p>
            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">100 F / invité</span>
          </div>
          <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-3 text-center mb-3">
            <span className="text-lg font-black tracking-widest text-emerald-600">{profile?.referral_code}</span>
          </div>
          <button onClick={copyLink} className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl active:scale-95 transition flex items-center justify-center gap-2">
            {copied ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                Lien copié !
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                Copier mon lien
              </>
            )}
          </button>
        </div>

        {/* Explication */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-900 mb-1">Comment ça marche ?</p>
              <p className="text-[11px] text-emerald-800 leading-relaxed">Partage ton lien. Quand une personne s'inscrit avec, tu gagnes <strong>100 FCFA</strong> automatiquement. Ces gains sont retirables une fois les conditions remplies.</p>
            </div>
          </div>
        </div>

        {/* Bouton retrait */}
        <button onClick={handleWithdrawClick} className="w-full py-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white font-bold rounded-xl shadow-lg active:scale-95 transition flex items-center justify-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          Demander un retrait
        </button>
      </div>

      {/* Modale de retrait */}
      {showWithdrawModal && conditions && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-end justify-center p-4" onClick={() => setShowWithdrawModal(false)}>
          <div className="bg-white rounded-t-3xl w-full max-w-md p-6 pb-8 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto mb-4"></div>
            <h2 className="text-xl font-black text-slate-900 mb-1 text-center">Retrait de {conditions.available_earnings.toLocaleString('fr-FR')} F</h2>
            <p className="text-xs text-slate-500 text-center mb-5">10% de frais s'appliquent</p>

            <p className="font-bold text-slate-900 text-sm mb-3">Conditions à remplir :</p>

            <div className="space-y-2 mb-5">
              <div className={`flex items-center gap-3 p-3 rounded-xl border ${conditions.tasks_done >= conditions.required_tasks ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${conditions.tasks_done >= conditions.required_tasks ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-slate-600'}`}>{conditions.tasks_done >= conditions.required_tasks ? '✓' : '!'}</div>
                <div className="flex-1"><p className="text-xs font-bold text-slate-900">Accomplir {conditions.required_tasks} tâches</p><p className="text-[10px] text-slate-500">{conditions.tasks_done} / {conditions.required_tasks}</p></div>
              </div>
              <div className={`flex items-center gap-3 p-3 rounded-xl border ${conditions.active_refs >= conditions.required_refs ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${conditions.active_refs >= conditions.required_refs ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-slate-600'}`}>{conditions.active_refs >= conditions.required_refs ? '✓' : '!'}</div>
                <div className="flex-1"><p className="text-xs font-bold text-slate-900">Avoir {conditions.required_refs} filleuls actifs</p><p className="text-[10px] text-slate-500">{conditions.active_refs} / {conditions.required_refs}</p></div>
              </div>
              <div className={`flex items-center gap-3 p-3 rounded-xl border ${conditions.phone_set ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${conditions.phone_set ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-slate-600'}`}>{conditions.phone_set ? '✓' : '!'}</div>
                <div className="flex-1"><p className="text-xs font-bold text-slate-900">Numéro de téléphone ajouté</p></div>
              </div>
              <div className={`flex items-center gap-3 p-3 rounded-xl border ${conditions.email_verified ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${conditions.email_verified ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-slate-600'}`}>{conditions.email_verified ? '✓' : '!'}</div>
                <div className="flex-1"><p className="text-xs font-bold text-slate-900">Email vérifié</p></div>
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
