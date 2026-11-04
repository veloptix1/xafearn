'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const PAYS_OPERATEURS: Record<string, { nom: string, operateurs: string[] }> = {
  CM: { nom: 'Cameroun', operateurs: ['Orange Money', 'MTN Mobile Money'] },
  CI: { nom: "Côte d'Ivoire", operateurs: ['Orange Money', 'MTN Mobile Money', 'Moov Money', 'Wave'] },
  SN: { nom: 'Sénégal', operateurs: ['Orange Money', 'Wave', 'Free Money'] },
  BF: { nom: 'Burkina Faso', operateurs: ['Orange Money', 'Moov Money'] },
  ML: { nom: 'Mali', operateurs: ['Orange Money', 'Moov Money'] },
  BJ: { nom: 'Bénin', operateurs: ['MTN Mobile Money', 'Moov Money', 'Celtiis Cash'] },
  TG: { nom: 'Togo', operateurs: ['T-Money (Togocom)', 'Moov Money'] },
  NE: { nom: 'Niger', operateurs: ['Airtel Money', 'Orange Money', 'Moov Money'] },
  GA: { nom: 'Gabon', operateurs: ['Airtel Money', 'Moov Money'] },
  CG: { nom: 'Congo', operateurs: ['Airtel Money', 'MTN Mobile Money'] },
  CD: { nom: 'RD Congo', operateurs: ['Airtel Money', 'Orange Money', 'M-Pesa (Vodacom)'] },
  GN: { nom: 'Guinée', operateurs: ['Orange Money', 'MTN Mobile Money'] },
}

export default function RetraitPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [toast, setToast] = useState<string | null>(null)

  const [country, setCountry] = useState('CM')
  const [operator, setOperator] = useState('Orange Money')
  const [phone, setPhone] = useState('')
  const [fullName, setFullName] = useState('')
  const [amount, setAmount] = useState('')

  const FEE_RATE = 0.05 // 5% de frais

  // Calcul du minimum selon le niveau
  const getMinAmount = (level: number) => {
    if (level === 3) return 500
    if (level === 2) return 1000
    return 2000
  }

  const minAmount = getMinAmount(profile?.level || 1)
  const balance = profile?.balance || 0

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')

      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data)
      setFullName(data?.full_name || '')
      setPhone(data?.phone || '')
      
      // Si le pays de l'utilisateur est dans la liste, le sélectionner par défaut
      if (data?.country && PAYS_OPERATEURS[data.country]) {
        setCountry(data.country)
        setOperator(PAYS_OPERATEURS[data.country].operateurs[0])
      }
      
      setLoading(false)
    }
    load()
  }, [router, supabase])

  // Quand le pays change, on met à jour l'opérateur par défaut
  useEffect(() => {
    if (PAYS_OPERATEURS[country]) {
      setOperator(PAYS_OPERATEURS[country].operateurs[0])
    }
  }, [country])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  const numericAmount = parseFloat(amount) || 0
  const feeAmount = numericAmount * FEE_RATE
  const netAmount = numericAmount - feeAmount

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (numericAmount < minAmount) {
      showToast(`Le montant minimum pour votre niveau est de ${minAmount} FCFA.`)
      return
    }
    if (numericAmount > balance) {
      showToast('Votre solde est insuffisant.')
      return
    }
    if (!phone || !fullName) {
      showToast('Veuillez remplir toutes les informations.')
      return
    }

    setSubmitting(true)

    const { error } = await supabase.from('withdrawals').insert({
      user_id: profile.id,
      amount: numericAmount,
      fee: feeAmount,
      net_amount: netAmount,
      country,
      operator,
      phone_number: phone,
      full_name: fullName,
      status: 'pending'
    })

    if (error) {
      showToast('Erreur: ' + error.message)
      setSubmitting(false)
      return
    }

    // Déduire le montant du solde
    await supabase.from('profiles').update({ balance: balance - numericAmount }).eq('id', profile.id)

    // Notification
    await supabase.from('notifications').insert({
      user_id: profile.id,
      title: 'Demande de retrait 💸',
      message: `Ta demande de retrait de ${numericAmount.toLocaleString('fr-FR')} FCFA a été envoyée. Tu recevras ${netAmount.toLocaleString('fr-FR')} FCFA sous 72h.`,
      link: '/dashboard/historique'
    })

    showToast('Demande de retrait envoyée !')
    setTimeout(() => router.push('/dashboard'), 2000)
  }

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">Chargement...</div>

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex items-center gap-4">
        <Link href="/dashboard" className="text-slate-500 hover:text-slate-900 bg-slate-100 p-2 rounded-full">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-lg font-bold text-slate-900">Retirer mes gains</h1>
      </header>

      <div className="p-4 md:p-8 max-w-lg mx-auto mt-4">
        {toast && <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl text-sm font-bold z-[100]">{toast}</div>}

        {/* Carte Solde */}
        <div className="bg-[#5c9e2f] rounded-3xl p-6 text-white shadow-md mb-6">
          <p className="text-sm font-semibold text-white/90 uppercase tracking-wider mb-1">Solde disponible</p>
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-4xl font-black">{balance.toLocaleString('fr-FR')}</span>
            <span className="text-lg font-bold text-white/90">FCFA</span>
          </div>
          <div className="bg-white/20 rounded-xl p-3 text-sm">
            <p>Niveau {profile?.level} • Retrait minimum : <strong>{minAmount.toLocaleString('fr-FR')} FCFA</strong></p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm space-y-4">
          <h2 className="font-bold text-slate-900 mb-2">Informations de retrait</h2>

          {/* Pays */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Pays</label>
            <select value={country} onChange={e => setCountry(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-900">
              {Object.entries(PAYS_OPERATEURS).map(([code, data]) => (
                <option key={code} value={code}>{data.nom}</option>
              ))}
            </select>
          </div>

          {/* Opérateur */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Opérateur Mobile Money</label>
            <select value={operator} onChange={e => setOperator(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-900">
              {PAYS_OPERATEURS[country]?.operateurs.map(op => (
                <option key={op} value={op}>{op}</option>
              ))}
            </select>
          </div>

          {/* Numéro */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Numéro de téléphone (Mobile Money)</label>
            <input type="tel" required placeholder="Ex: 690000000" value={phone} onChange={e => setPhone(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900" />
          </div>

          {/* Nom */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nom complet (titulaire du compte)</label>
            <input type="text" required placeholder="Nom inscrit sur le compte" value={fullName} onChange={e => setFullName(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900" />
          </div>

          {/* Montant */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Montant à retirer (FCFA)</label>
            <input type="number" required min={minAmount} max={balance} placeholder={`Min. ${minAmount}`} value={amount} onChange={e => setAmount(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900 font-bold text-lg" />
          </div>

          {/* Récapitulatif des frais */}
          {numericAmount > 0 && (
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Montant demandé</span>
                <span className="font-semibold">{numericAmount.toLocaleString('fr-FR')} F</span>
              </div>
              <div className="flex justify-between text-red-500">
                <span>Frais de retrait (5%)</span>
                <span className="font-semibold">-{feeAmount.toLocaleString('fr-FR')} F</span>
              </div>
              <div className="border-t border-slate-200 pt-2 flex justify-between text-emerald-600 font-bold">
                <span>Vous recevrez</span>
                <span>{netAmount.toLocaleString('fr-FR')} F</span>
              </div>
            </div>
          )}

          <button type="submit" disabled={submitting || numericAmount < minAmount || numericAmount > balance} className="w-full py-4 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-400 disabled:opacity-50 transition shadow-md">
            {submitting ? 'Envoi...' : 'Confirmer le retrait'}
          </button>
        </form>
      </div>
    </main>
  )
}
