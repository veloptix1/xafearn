'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const PAYS = [
  { code: 'CM', nom: 'Cameroun', operateurs: ['Orange Money', 'MTN Mobile Money'] },
  { code: 'CI', nom: "Côte d'Ivoire", operateurs: ['Orange Money', 'MTN', 'Moov', 'Wave'] },
  { code: 'SN', nom: 'Sénégal', operateurs: ['Orange Money', 'Wave', 'Free Money'] },
  { code: 'BF', nom: 'Burkina Faso', operateurs: ['Orange Money', 'Moov'] },
  { code: 'ML', nom: 'Mali', operateurs: ['Orange Money', 'Moov'] },
  { code: 'BJ', nom: 'Bénin', operateurs: ['MTN', 'Moov', 'Celtiis'] },
  { code: 'TG', nom: 'Togo', operateurs: ['T-Money', 'Moov'] },
  { code: 'NE', nom: 'Niger', operateurs: ['Airtel', 'Orange', 'Moov'] },
  { code: 'GA', nom: 'Gabon', operateurs: ['Airtel', 'Moov'] },
  { code: 'CG', nom: 'Congo', operateurs: ['Airtel', 'MTN'] },
  { code: 'CD', nom: 'RD Congo', operateurs: ['Airtel', 'Orange', 'M-Pesa'] },
  { code: 'GN', nom: 'Guinée', operateurs: ['Orange', 'MTN'] },
]

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
  const [showConditionsModal, setShowConditionsModal] = useState(false)
  const [withdrawForm, setWithdrawForm] = useState({
    country: 'CM',
    operator: 'Orange Money',
    phone: '',
    fullName: '',
    amount: ''
  })

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return router.replace('/login')

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      setProfile(prof)

      const { data: cond } = await supabase.rpc('check_bonus_conditions', { p_user_id: session.user.id })
      setConditions(cond)

      const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('referred_by', session.user.id)
      setTotalInvites(count || 0)

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
    setWithdrawForm({ ...withdrawForm, amount: conditions.available_earnings.toString() })
    setShowWithdrawModal(true)
  }

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!conditions) return

    // Vérifier les conditions
    if (!conditions.can_withdraw) {
      setShowWithdrawModal(false)
      setShowConditionsModal(true)
      return
    }

    setIsRequesting(true)
    const { data, error } = await supabase.rpc('process_bonus_withdrawal', {
      p_user_id: profile.id,
      p_amount: parseFloat(withdrawForm.amount),
      p_country: withdrawForm.country,
      p_operator: withdrawForm.operator,
      p_phone: withdrawForm.phone,
      p_full_name: withdrawForm.fullName
    })

    if (error) {
      setToast('Erreur: ' + error.message)
    } else if (data.success) {
      setToast(`Demande envoyée ! Tu recevras ${data.net_amount.toLocaleString('fr-FR')} F sous 72h.`)
      setShowWithdrawModal(false)
      setTimeout(() => router.push('/dashboard'), 2000)
    } else {
      setToast(data.reason || 'Erreur inconnue')
    }
    setIsRequesting(false)
    setTimeout(() => setToast(null), 3000)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin"></div></div>

  const progress = conditions ? Math.min((conditions.available_earnings / conditions.min_withdrawal) * 100, 100) : 0
  const remaining = conditions ? Math.max(conditions.min_withdrawal - conditions.available_earnings, 0) : 0
  const currentCountry = PAYS.find(p => p.code === withdrawForm.country) || PAYS[0]

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white border-b border-slate-200 px-4 py-4 flex items-center gap-3 sticky top-0 z-50">
        <Link href="/dashboard" className="text-slate-500 bg-slate-100 p-2 rounded-full active:bg-slate-200">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="font-black text-slate-900 flex-1">Bonus</h1>
      </header>

      <div className="p-4 max-w-md mx-auto space-y-4 mt-2">

        <div className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 rounded-[2rem] p-6 text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl transform translate-x-16 -translate-y-16"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 bg-emerald-300 rounded-full animate-pulse"></div>
              <p className="text-xs font-bold text-emerald-100 uppercase tracking-wider">Solde Bonus</p>
            </div>
            <div className="flex items-baseline gap-2 mb-4">
              <p className="text-5xl font-black">{conditions?.available_earnings.toLocaleString('fr-FR') || 0}</p>
              <p className="text-lg font-bold text-emerald-200">FCFA</p>
            </div>
            <div className="mb-2">
              <div className="flex justify-between text-[10px] font-bold text-emerald-100 mb-1">
                <span>Objectif de retrait</span>
                <span>{conditions?.min_withdrawal.toLocaleString('fr-FR')} F</span>
              </div>
              <div className="w-full h-3 bg-black/20 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-yellow-300 to-emerald-200 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
            <p className="text-[11px] font-medium text-emerald-100">
              {remaining > 0 ? `Encore ${remaining.toLocaleString('fr-FR')} F pour débloquer le retrait` : 'Retrait débloqué !'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 bg-sky-100 text-sky-600 rounded-xl flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </div>
            <div><p className="text-[10px] font-bold text-slate-500 uppercase">Invités</p><p className="text-xl font-black text-slate-900">{totalInvites}</p></div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div><p className="text-[10px] font-bold text-slate-500 uppercase">En attente</p><p className="text-xl font-black text-slate-900">{pendingEarnings.toLocaleString('fr-FR')} F</p></div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-slate-500 uppercase">Ton lien d'invitation</p>
            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">100 F / invité</span>
          </div>
          <div className="flex items-center gap-2 p-3 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl mb-4">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shrink-0 shadow-sm text-lg font-black text-emerald-600">{profile?.full_name?.charAt(0)}</div>
            <div className="flex-1 min-w-0"><p className="text-[10px] text-slate-500 font-bold">Code parrain</p><p className="text-sm font-black text-slate-900 tracking-wider truncate">{profile?.referral_code}</p></div>
          </div>
          <button onClick={copyLink} className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl active:scale-95 transition flex items-center justify-center gap-2 shadow-lg">
            {copied ? <><svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg> Lien copié !</> : <><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg> Copier mon lien</>}
          </button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
          <h3 className="text-sm font-black text-blue-900 mb-2">Comment gagner ?</h3>
          <div className="flex gap-3 mb-2"><div className="w-6 h-6 bg-blue-200 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">1</div><p className="text-xs text-blue-800">Partage ton lien avec tes amis.</p></div>
          <div className="flex gap-3 mb-2"><div className="w-6 h-6 bg-blue-200 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">2</div><p className="text-xs text-blue-800">Ils s'inscrivent avec ton lien.</p></div>
          <div className="flex gap-3"><div className="w-6 h-6 bg-blue-200 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">3</div><p className="text-xs text-blue-800">Tu gagnes <strong>100 FCFA</strong> automatiquement.</p></div>
        </div>

        <button onClick={handleWithdrawClick} className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold rounded-xl shadow-lg active:scale-95 transition flex items-center justify-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          Demander un retrait
        </button>
      </div>

      {/* MODALE DE RETRAIT */}
      {showWithdrawModal && conditions && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-end justify-center p-4" onClick={() => setShowWithdrawModal(false)}>
          <form onSubmit={handleWithdrawSubmit} className="bg-white rounded-t-3xl w-full max-w-md p-6 pb-8 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto mb-4"></div>
            <h2 className="text-xl font-black text-slate-900 mb-1 text-center">Retrait Bonus</h2>
            <p className="text-xs text-slate-500 text-center mb-5">Montant disponible : {conditions.available_earnings.toLocaleString('fr-FR')} F</p>

            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Montant à retirer (FCFA)</label>
                <input type="number" required value={withdrawForm.amount} onChange={e => setWithdrawForm({...withdrawForm, amount: e.target.value})} max={conditions.available_earnings} min={conditions.min_withdrawal} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Pays</label>
                <select value={withdrawForm.country} onChange={e => {
                  const c = PAYS.find(p => p.code === e.target.value) || PAYS[0]
                  setWithdrawForm({...withdrawForm, country: c.code, operator: c.operateurs[0]})
                }} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-500">
                  {PAYS.map(p => <option key={p.code} value={p.code}>{p.nom}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Réseau Mobile Money</label>
                <select value={withdrawForm.operator} onChange={e => setWithdrawForm({...withdrawForm, operator: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-500">
                  {currentCountry.operateurs.map(op => <option key={op} value={op}>{op}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Numéro de téléphone</label>
                <input type="tel" required value={withdrawForm.phone} onChange={e => setWithdrawForm({...withdrawForm, phone: e.target.value})} placeholder="Ex: 690000000" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Nom complet (titulaire)</label>
                <input type="text" required value={withdrawForm.fullName} onChange={e => setWithdrawForm({...withdrawForm, fullName: e.target.value})} placeholder="Nom sur le compte" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-500" />
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 text-center mb-4 border border-slate-200">
              <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Tu recevras (après 10% de frais)</p>
              <p className="text-2xl font-black text-emerald-600">{((parseFloat(withdrawForm.amount) || 0) * 0.9).toFixed(0)} F</p>
            </div>

            <button type="submit" disabled={isRequesting} className="w-full py-4 bg-emerald-500 text-white font-bold rounded-xl shadow-md disabled:opacity-50 active:scale-95 transition mb-2">
              {isRequesting ? 'Envoi...' : 'Envoyer la demande'}
            </button>
            <button type="button" onClick={() => setShowWithdrawModal(false)} className="w-full py-3 bg-slate-100 text-slate-700 font-bold rounded-xl text-sm">Annuler</button>
          </form>
        </div>
      )}

      {/* MODALE DES CONDITIONS */}
      {showConditionsModal && conditions && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-end justify-center p-4" onClick={() => setShowConditionsModal(false)}>
          <div className="bg-white rounded-t-3xl w-full max-w-md p-6 pb-8 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto mb-4"></div>
            
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>

            <h2 className="text-xl font-black text-slate-900 mb-1 text-center">Conditions non remplies</h2>
            <p className="text-xs text-slate-500 text-center mb-5">Tu dois compléter ces conditions pour retirer.</p>

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

            <button onClick={() => setShowConditionsModal(false)} className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl text-sm">Compris</button>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[300] px-5 py-3 bg-slate-900 text-white text-sm font-bold rounded-full shadow-xl">{toast}</div>
      )}
    </main>
  )
}
