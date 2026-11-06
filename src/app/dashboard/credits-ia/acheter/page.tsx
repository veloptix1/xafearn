'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const PACKS = [
  { credits: 5, price: 500, popular: false, bonus: 0 },
  { credits: 15, price: 1000, popular: true, bonus: 2 },
  { credits: 30, price: 2000, popular: false, bonus: 5 },
  { credits: 80, price: 5000, popular: false, bonus: 20 },
]

export default function BuyAICreditsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [selectedPack, setSelectedPack] = useState<any>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

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

  const handlePurchase = async () => {
    if (!selectedPack) return
    if ((profile.balance || 0) < selectedPack.price) {
      return showToast('Solde FCFA insuffisant.', 'error')
    }

    setIsProcessing(true)
    try {
      const totalCredits = selectedPack.credits + selectedPack.bonus
      const { data, error } = await supabase.rpc('buy_ai_credits', {
        p_user_id: profile.id,
        p_credits: totalCredits,
        p_price: selectedPack.price
      })

      if (error) throw error
      if (!data.success) throw new Error(data.error)

      setProfile({ ...profile, balance: profile.balance - selectedPack.price, ai_credits: data.new_credits })
      showToast(`${totalCredits} crédits IA ajoutés !`, 'success')
      setSelectedPack(null)
      setTimeout(() => router.push('/dashboard/statut-ia'), 2000)
    } catch (err: any) {
      showToast(err.message, 'error')
    }
    setIsProcessing(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
      <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
      <p className="text-slate-500 font-medium text-sm">Chargement...</p>
    </div>
  )

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-xl shadow-xl text-white text-sm font-bold ${
          toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'
        }`}>
          {toast.message}
        </div>
      )}

      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 px-5 py-4 sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/statut-ia" className="text-slate-500 hover:text-slate-900 bg-slate-100 p-2 rounded-full active:bg-slate-200 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <h1 className="text-lg font-black text-slate-900">Acheter des crédits IA</h1>
        </div>
        <div className="bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-xl border border-indigo-100 flex items-center gap-1.5 text-xs font-bold">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          {profile?.ai_credits || 0}
        </div>
      </header>

      <div className="p-4 max-w-lg mx-auto">

        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm mb-5 flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Solde FCFA</p>
            <p className="text-2xl font-black text-emerald-600">{profile?.balance?.toLocaleString('fr-FR')} F</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Crédits IA</p>
            <p className="text-2xl font-black text-indigo-600">{profile?.ai_credits || 0}</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-3xl p-5 text-white shadow-lg mb-5">
          <h2 className="font-black text-lg mb-1">Plus de crédits = plus de pubs</h2>
          <p className="text-indigo-100 text-xs leading-relaxed">Chaque crédit te permet de générer 1 visuel publicitaire professionnel grâce à l'IA.</p>
        </div>

        <div className="space-y-3 mb-5">
          {PACKS.map((pack, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedPack(pack)}
              className={`w-full p-4 rounded-2xl border-2 transition flex justify-between items-center relative ${
                selectedPack?.credits === pack.credits
                  ? 'border-indigo-500 bg-indigo-50 shadow-md'
                  : 'border-slate-200 bg-white'
              }`}
            >
              {pack.popular && (
                <div className="absolute -top-2 left-4 bg-amber-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">POPULAIRE</div>
              )}
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedPack?.credits === pack.credits ? 'bg-indigo-500 text-white' : 'bg-indigo-100 text-indigo-600'}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <div className="text-left">
                  <p className="font-black text-slate-900">{pack.credits} crédits</p>
                  {pack.bonus > 0 && <p className="text-[10px] text-emerald-600 font-bold">+{pack.bonus} offerts</p>}
                </div>
              </div>
              <p className="font-black text-slate-900">{pack.price.toLocaleString('fr-FR')} F</p>
            </button>
          ))}
        </div>

        <button
          onClick={handlePurchase}
          disabled={!selectedPack || isProcessing || (profile?.balance || 0) < (selectedPack?.price || 0)}
          className="w-full py-4 bg-indigo-500 text-white font-bold rounded-2xl active:scale-95 disabled:opacity-50 transition shadow-lg shadow-indigo-500/30"
        >
          {isProcessing ? 'Traitement...' : selectedPack ? `Payer ${selectedPack.price.toLocaleString('fr-FR')} F` : 'Choisis un pack'}
        </button>

      </div>
    </main>
  )
}
