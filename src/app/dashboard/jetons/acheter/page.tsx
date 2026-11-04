'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Toast from '@/components/Toast'

const COINS_PER_1000_FCFA = 800

export default function BuyCoinsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [selectedFCFA, setSelectedFCFA] = useState(1000)
  const [isProcessing, setIsProcessing] = useState(false)
  
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' | 'warning' } | null>(null)
  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => setToast({ message, type })

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

  const coinsToReceive = Math.floor((selectedFCFA / 1000) * COINS_PER_1000_FCFA)

  const handleBuyWithBalance = async () => {
    if ((profile.balance || 0) < selectedFCFA) return showToast('Solde FCFA insuffisant.', 'error')
    setIsProcessing(true)
    try {
      await supabase.from('profiles').update({ balance: profile.balance - selectedFCFA }).eq('id', profile.id)
      await supabase.from('profiles').update({ coins_balance: (profile.coins_balance || 0) + coinsToReceive }).eq('id', profile.id)
      await supabase.from('notifications').insert({ user_id: profile.id, title: 'Jetons achetés 🪙', message: `+${coinsToReceive} jetons`, link: '/dashboard/reseau' })
      showToast('Achat réussi !', 'success')
      setTimeout(() => router.push('/dashboard/reseau'), 1500)
    } catch (err) { showToast('Erreur.', 'error') }
    setIsProcessing(false)
  }

  const handleBuyWithLeekPay = async () => {
    setIsProcessing(true)
    try {
      const res = await fetch('/api/leekpay/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: selectedFCFA, description: `Achat de ${coinsToReceive} jetons XAFEARN` })
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
        <Link href="/dashboard" className="text-slate-500 bg-slate-100 p-2 rounded-full"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg></Link>
        <h1 className="text-lg font-bold text-slate-900">Acheter des Jetons</h1>
      </header>

      <div className="p-4 md:p-8 max-w-lg mx-auto mt-4">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm mb-6 flex justify-between items-center">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase mb-1">Solde FCFA</p>
            <p className="text-2xl font-black text-emerald-600">{profile?.balance?.toLocaleString('fr-FR')} F</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-slate-500 uppercase mb-1">Mes Jetons</p>
            <p className="text-2xl font-black text-amber-500">🪙 {profile?.coins_balance || 0}</p>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          {[1000, 2500, 5000, 10000].map(amount => (
            <button key={amount} onClick={() => setSelectedFCFA(amount)} className={`w-full p-4 rounded-2xl border-2 transition flex justify-between items-center ${selectedFCFA === amount ? 'border-amber-500 bg-amber-50' : 'border-slate-200 bg-white'}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center font-bold text-lg">🪙</div>
                <div className="text-left">
                  <span className="font-bold text-slate-900 block">{Math.floor((amount / 1000) * 800)} Jetons</span>
                  <span className="text-xs text-slate-500">pour {amount.toLocaleString('fr-FR')} FCFA</span>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <button onClick={handleBuyWithBalance} disabled={isProcessing || (profile?.balance || 0) < selectedFCFA} className="w-full py-4 bg-emerald-500 text-white font-bold rounded-xl disabled:opacity-50 transition shadow-md">
            Payer avec mon solde ({selectedFCFA.toLocaleString('fr-FR')} F)
          </button>
          <button onClick={handleBuyWithLeekPay} disabled={isProcessing} className="w-full py-4 bg-sky-500 text-white font-bold rounded-xl disabled:opacity-50 transition shadow-md flex justify-center items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
            Payer par Mobile Money
          </button>
        </div>
      </div>
    </main>
  )
}
