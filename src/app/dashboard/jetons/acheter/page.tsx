'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const COINS_PER_1000_FCFA = 800
const MIN_FCFA = 100

export default function BuyCoinsPage() {
  const supabase = createClient()
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [selectedFCFA, setSelectedFCFA] = useState(1000)
  const [customAmount, setCustomAmount] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // Réglages paiement
  const [settings, setSettings] = useState({
    provider: 'leekpay',
    leekEnabled: true,
    soleasEnabled: false,
    soleasLink: ''
  })

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return router.replace('/login')

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      setProfile(prof)

      const { data: s } = await supabase.from('app_settings').select('*').in('key', ['payment_provider', 'leekpay_enabled', 'soleaspay_enabled', 'soleaspay_payment_link'])
      const obj: any = {}
      s?.forEach(item => { obj[item.key] = item.value })
      
      setSettings({
        provider: obj.payment_provider || 'leekpay',
        leekEnabled: obj.leekpay_enabled === 'true',
        soleasEnabled: obj.soleaspay_enabled === 'true',
        soleasLink: obj.soleaspay_payment_link || ''
      })

      setLoading(false)
    }
    load()
  }, [supabase, router])

  const showMsg = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const finalAmount = customAmount ? parseInt(customAmount) || 0 : selectedFCFA
  const coinsToReceive = Math.floor((finalAmount / 1000) * COINS_PER_1000_FCFA)
  const isValidAmount = finalAmount >= MIN_FCFA

  const buyWithBalance = async () => {
    if (!isValidAmount) return showMsg(`Minimum ${MIN_FCFA} FCFA.`)
    if ((profile.balance || 0) < finalAmount) return showMsg('Solde insuffisant.')
    
    setIsProcessing(true)
    try {
      await supabase.from('profiles').update({ balance: profile.balance - finalAmount }).eq('id', profile.id)
      await supabase.from('profiles').update({ coins_balance: (profile.coins_balance || 0) + coinsToReceive }).eq('id', profile.id)
      showMsg(`+${coinsToReceive} jetons ajoutés !`)
      setTimeout(() => router.push('/dashboard'), 1500)
    } catch (err) {
      showMsg('Erreur lors de l\'achat.')
    }
    setIsProcessing(false)
  }

  const buyWithLeekPay = async () => {
    if (!isValidAmount) return showMsg(`Minimum ${MIN_FCFA} FCFA.`)
    setIsProcessing(true)
    try {
      const res = await fetch('/api/leekpay/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: finalAmount, description: `Achat de ${coinsToReceive} jetons XAFEARN` })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      window.location.href = data.payment_url
    } catch (err: any) {
      showMsg('Erreur LeekPay: ' + err.message)
      setIsProcessing(false)
    }
  }

  const buyWithSoleasPay = () => {
    if (!isValidAmount) return showMsg(`Minimum ${MIN_FCFA} FCFA.`)
    if (!settings.soleasLink) return showMsg('Lien SoleasPay non configuré.')
    window.open(settings.soleasLink, '_blank')
    showMsg('Paiement validé manuellement. Contacte le support après paiement.')
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin"></div></div>

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white border-b border-slate-200 px-4 py-4 flex items-center gap-3">
        <Link href="/dashboard" className="text-slate-500 bg-slate-100 p-2 rounded-full">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="font-bold text-slate-900 flex-1">Acheter des Jetons</h1>
      </header>

      <div className="p-4 max-w-md mx-auto mt-2 space-y-4">
        
        {/* Solde */}
        <div className="bg-slate-900 rounded-3xl p-5 text-white shadow-lg flex justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Solde FCFA</p>
            <p className="text-xl font-black">{profile?.balance?.toLocaleString('fr-FR') || 0} F</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Mes Jetons</p>
            <p className="text-xl font-black text-amber-400">{profile?.coins_balance || 0}</p>
          </div>
        </div>

        {/* Choix du montant */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200">
          <h2 className="font-bold text-slate-900 mb-3 text-sm">Choisis ton montant</h2>
          
          <div className="grid grid-cols-2 gap-2 mb-4">
            {[100, 500, 1000, 2500].map(amount => (
              <button 
                key={amount} 
                onClick={() => { setSelectedFCFA(amount); setCustomAmount('') }} 
                className={`p-3 rounded-xl border-2 transition text-left ${selectedFCFA === amount && !customAmount ? 'border-amber-500 bg-amber-50' : 'border-slate-200'}`}
              >
                <p className="font-bold text-slate-900 text-sm">{Math.floor((amount / 1000) * COINS_PER_1000_FCFA)} Jetons</p>
                <p className="text-[10px] text-slate-500">{amount.toLocaleString('fr-FR')} F</p>
              </button>
            ))}
          </div>

          <div className="border-t border-slate-100 pt-4">
            <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Montant personnalisé (min. {MIN_FCFA} F)</label>
            <div className="relative">
              <input 
                type="number" 
                value={customAmount} 
                onChange={e => setCustomAmount(e.target.value)} 
                placeholder={`${MIN_FCFA}`} 
                min={MIN_FCFA}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-amber-500 pr-16" 
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">FCFA</span>
            </div>
          </div>
        </div>

        {/* Résumé */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-bold text-amber-700">Tu recevras</span>
            <span className="text-xl font-black text-amber-900">{coinsToReceive.toLocaleString('fr-FR')} Jetons</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-amber-600">Total à payer</span>
            <span className="text-sm font-bold text-amber-700">{finalAmount.toLocaleString('fr-FR')} FCFA</span>
          </div>
        </div>

        {/* Boutons de paiement */}
        <div className="space-y-2">
          <button onClick={buyWithBalance} disabled={isProcessing || !isValidAmount || (profile?.balance || 0) < finalAmount} className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl shadow-md disabled:opacity-50 active:scale-95 transition">
            Payer avec mon solde ({finalAmount.toLocaleString('fr-FR')} F)
          </button>

          {settings.provider !== 'disabled' && (
            <>
              {settings.leekEnabled && (
                <button onClick={buyWithLeekPay} disabled={isProcessing || !isValidAmount} className="w-full py-4 bg-sky-500 text-white font-bold rounded-xl shadow-md disabled:opacity-50 active:scale-95 transition">
                  Payer avec LeekPay
                </button>
              )}
              {settings.soleasEnabled && (
                <button onClick={buyWithSoleasPay} disabled={isProcessing || !isValidAmount} className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl shadow-md disabled:opacity-50 active:scale-95 transition">
                  Payer avec SoleasPay
                </button>
              )}
            </>
          )}
        </div>

        {!isValidAmount && finalAmount > 0 && (
          <p className="text-xs text-red-500 text-center font-bold">Le minimum est de {MIN_FCFA} FCFA.</p>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[300] px-5 py-3 bg-slate-900 text-white text-sm font-bold rounded-full shadow-xl">{toast}</div>
      )}
    </main>
  )
}
