'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Toast from '@/components/Toast'

const PAYS_OPERATEURS: Record<string, { nom: string, operateurs: string[] }> = {
  CM: { nom: 'Cameroun', operateurs: ['Orange Money', 'MTN Mobile Money'] },
  CI: { nom: "Côte d'Ivoire", operateurs: ['Orange Money', 'MTN Mobile Money', 'Moov Money', 'Wave'] },
  SN: { nom: 'Sénégal', operateurs: ['Orange Money', 'Wave', 'Free Money'] },
  BF: { nom: 'Burkina Faso', operateurs: ['Orange Money', 'Moov Money'] },
  ML: { nom: 'Mali', operateurs: ['Orange Money', 'Moov Money'] },
  BJ: { nom: 'Bénin', operateurs: ['MTN Mobile Money', 'Moov Money'] },
  TG: { nom: 'Togo', operateurs: ['T-Money', 'Moov Money'] },
  GA: { nom: 'Gabon', operateurs: ['Airtel Money', 'Moov Money'] },
  CG: { nom: 'Congo', operateurs: ['Airtel Money', 'MTN Mobile Money'] },
  CD: { nom: 'RD Congo', operateurs: ['Airtel Money', 'Orange Money', 'M-Pesa'] },
}

export default function WithdrawCoinsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  
  // Infos de retrait
  const [country, setCountry] = useState('CM')
  const [operator, setOperator] = useState('Orange Money')
  const [phone, setPhone] = useState('')
  const [fullName, setFullName] = useState('')

  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' | 'warning' } | null>(null)
  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => setToast({ message, type })

  const COMMISSION_RATE = 0.40
  const coinsToWithdraw = profile?.coins_balance || 0
  const fcfcToReceive = coinsToWithdraw * (1 - COMMISSION_RATE)
  const commission = coinsToWithdraw * COMMISSION_RATE

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data)
      setFullName(data?.full_name || '')
      setPhone(data?.phone || '')
      if (data?.country && PAYS_OPERATEURS[data.country]) {
        setCountry(data.country)
        setOperator(PAYS_OPERATEURS[data.country].operateurs[0])
      }
      setLoading(false)
    }
    load()
  }, [router, supabase])

  useEffect(() => {
    if (PAYS_OPERATEURS[country]) {
      setOperator(PAYS_OPERATEURS[country].operateurs[0])
    }
  }, [country])

  const handleWithdraw = async () => {
    if (coinsToWithdraw <= 0) return showToast('Tu n\'as pas de jetons à retirer.', 'warning')
    if (!phone || !fullName) return showToast('Remplis tes informations de paiement.', 'warning')
    
    setIsProcessing(true)
    try {
      // 1. Créer la demande de retrait (En attente)
      await supabase.from('coin_withdrawals').insert({
        user_id: profile.id,
        coins_amount: coinsToWithdraw,
        fcfc_amount: fcfcToReceive,
        commission: commission,
        status: 'pending',
        payment_method: operator,
        phone_number: phone,
        full_name: fullName
      })

      // 2. Déduire les jetons du profil (pour éviter qu'il ne les dépense ailleurs)
      await supabase.from('profiles').update({ coins_balance: 0 }).eq('id', profile.id)

      // 3. Notification
      await supabase.from('notifications').insert({
        user_id: profile.id,
        title: 'Demande de retrait envoyée ⏳',
        message: `Ta demande de conversion de ${coinsToWithdraw} jetons en ${fcfcToReceive.toFixed(0)} FCFA est en cours de traitement.`,
        link: '/dashboard'
      })

      showToast('Demande envoyée ! L\'admin va valider ton paiement.', 'success')
      setTimeout(() => router.push('/dashboard'), 2500)
    } catch (err) {
      showToast('Erreur lors de la demande.', 'error')
    }
    setIsProcessing(false)
  }

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center">Chargement...</div>

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex items-center gap-4">
        <Link href="/dashboard" className="text-slate-500 hover:text-slate-900 bg-slate-100 p-2 rounded-full">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-lg font-bold text-slate-900">Convertir mes Jetons</h1>
      </header>

      <div className="p-4 md:p-8 max-w-lg mx-auto mt-4">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm mb-6 text-center">
          <p className="text-xs font-bold text-slate-500 uppercase mb-1">Jetons disponibles</p>
          <p className="text-4xl font-black text-amber-500 mb-2">🪙 {coinsToWithdraw}</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm mb-6">
          <h2 className="font-bold text-slate-900 mb-4 text-center">Détails de la conversion</h2>
          <div className="space-y-2 text-sm mb-6">
            <div className="flex justify-between text-slate-600"><span>Valeur des jetons</span><span className="font-semibold">{coinsToWithdraw.toLocaleString('fr-FR')} F</span></div>
            <div className="flex justify-between text-red-500"><span>Frais (40%)</span><span className="font-semibold">-{commission.toFixed(2)} F</span></div>
            <div className="border-t border-slate-200 pt-2 flex justify-between text-emerald-600 font-bold text-lg"><span>Tu recevras</span><span>{fcfcToReceive.toFixed(0)} F</span></div>
          </div>

          {/* Formulaire de paiement */}
          <div className="space-y-3 border-t border-slate-100 pt-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Pays</label>
              <select value={country} onChange={e => setCountry(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm">
                {Object.entries(PAYS_OPERATEURS).map(([code, data]) => <option key={code} value={code}>{data.nom}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Opérateur</label>
              <select value={operator} onChange={e => setOperator(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm">
                {PAYS_OPERATEURS[country]?.operateurs.map(op => <option key={op} value={op}>{op}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Numéro de téléphone</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Ex: 690000000" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nom complet (titulaire)</label>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Ton nom" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
            </div>
          </div>
        </div>

        <button onClick={handleWithdraw} disabled={isProcessing || coinsToWithdraw <= 0} className="w-full py-4 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-400 disabled:opacity-50 transition shadow-md">
          {isProcessing ? 'Traitement...' : 'Demander le paiement'}
        </button>
      </div>
    </main>
  )
}
