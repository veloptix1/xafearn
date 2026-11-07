'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Toast from '@/components/Toast'

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
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => setToast({ message, type })

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data)
      setLoading(false)
    }
    load()
  }, [router, supabase])

  // Calculer le montant final (soit prédéfini, soit personnalisé)
  const finalAmount = customAmount ? parseInt(customAmount) || 0 : selectedFCFA
  const coinsToReceive = Math.floor((finalAmount / 1000) * COINS_PER_1000_FCFA)
  const isValidAmount = finalAmount >= MIN_FCFA

  const handleBuyWithBalance = async () => {
    if (!isValidAmount) return showToast(`Le minimum est de ${MIN_FCFA} FCFA.`, 'error')
    if ((profile.balance || 0) < finalAmount) return showToast('Solde FCFA insuffisant.', 'error')
    
    setIsProcessing(true)
    try {
      await supabase.from('profiles').update({ balance: profile.balance - finalAmount }).eq('id', profile.id)
      await supabase.from('profiles').update({ coins_balance: (profile.coins_balance || 0) + coinsToReceive }).eq('id', profile.id)
      await supabase.from('notifications').insert({ 
        user_id: profile.id, 
        title: 'Jetons achetés 🪙', 
        message: `+${coinsToReceive} jetons ajoutés`, 
        link: '/dashboard/reseau' 
      })
      showToast('Achat réussi !', 'success')
      setTimeout(() => router.push('/dashboard/reseau'), 1500)
    } catch (err) {
      showToast('Erreur lors de l\'achat.', 'error')
    }
    setIsProcessing(false)
  }

  const handleBuyWithLeekPay = async () => {
    if (!isValidAmount) return showToast(`Le minimum est de ${MIN_FCFA} FCFA.`, 'error')
    
    setIsProcessing(true)
    try {
      const res = await fetch('/api/leekpay/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          amount: finalAmount, 
          description: `Achat de ${coinsToReceive} jetons XAFEARN` 
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      window.location.href = data.payment_url
    } catch (err: any) {
      showToast(err.message, 'error')
      setIsProcessing(false)
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex items-center gap-4">
        <Link href="/dashboard" className="text-slate-500 bg-slate-100 p-2 rounded-full">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-lg font-bold text-slate-900">Acheter des Jetons</h1>
      </header>

      <div className="p-4 md:p-8 max-w-lg mx-auto mt-4">
        
        {/* Carte Solde */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 text-white shadow-lg mb-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/20 rounded-full blur-2xl transform translate-x-10 -translate-y-10"></div>
          <div className="relative z-10 flex justify-between items-center">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase mb-1">Solde FCFA</p>
              <p className="text-2xl font-black">{profile?.balance?.toLocaleString('fr-FR') || 0} F</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-slate-400 uppercase mb-1">Mes Jetons</p>
              <p className="text-2xl font-black text-amber-400">🪙 {profile?.coins_balance || 0}</p>
            </div>
          </div>
        </div>

        {/* Sélection du montant */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 mb-4">
          <h2 className="font-bold text-slate-900 mb-4 text-sm">Choisis ton montant</h2>
          
          <div className="grid grid-cols-2 gap-2 mb-4">
            {[100, 500, 1000, 2500].map(amount => (
              <button 
                key={amount} 
                onClick={() => { setSelectedFCFA(amount); setCustomAmount('') }} 
                className={`p-3 rounded-xl border-2 transition text-left ${selectedFCFA === amount && !customAmount ? 'border-amber-500 bg-amber-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
              >
                <p className="font-bold text-slate-900 text-sm">{Math.floor((amount / 1000) * COINS_PER_1000_FCFA)} Jetons</p>
                <p className="text-[10px] text-slate-500">{amount.toLocaleString('fr-FR')} F</p>
              </button>
            ))}
          </div>

          <div className="border-t border-slate-100 pt-4">
            <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Ou montant personnalisé (min. {MIN_FCFA} F)</label>
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
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-bold text-amber-700">Tu recevras</span>
            <span className="text-xl font-black text-amber-900">{coinsToReceive.toLocaleString('fr-FR')} 🪙</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-amber-600">Pour un total de</span>
            <span className="text-sm font-bold text-amber-700">{finalAmount.toLocaleString('fr-FR')} FCFA</span>
          </div>
        </div>

        {/* Boutons d'achat */}
        <div className="space-y-2">
          <button 
            onClick={handleBuyWithLeekPay} 
            disabled={isProcessing || !isValidAmount} 
            className="w-full py-4 bg-sky-500 text-white font-bold rounded-xl disabled:opacity-50 transition shadow-md active:scale-[0.98] flex justify-center items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
            Payer par Mobile Money
          </button>
          
          <button 
            onClick={handleBuyWithBalance} 
            disabled={isProcessing || !isValidAmount || (profile?.balance || 0) < finalAmount} 
            className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl disabled:opacity-50 transition shadow-md active:scale-[0.98]"
          >
            Payer avec mon solde ({finalAmount.toLocaleString('fr-FR')} F)
          </button>
        </div>

        {!isValidAmount && finalAmount > 0 && (
          <p className="text-xs text-red-500 text-center mt-2 font-bold">Le minimum est de {MIN_FCFA} FCFA.</p>
        )}
      </div>
    </main>
  )
}
