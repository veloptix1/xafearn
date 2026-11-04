'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Toast from '@/components/Toast'

// Taux de conversion : 1000 FCFA = 800 jetons (Marge plateforme : 20%)
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

  // Calcul du nombre de jetons reçus selon le montant payé
  const coinsToReceive = Math.floor((selectedFCFA / 1000) * COINS_PER_1000_FCFA)

  const handleBuy = async () => {
    if ((profile.balance || 0) < selectedFCFA) {
      return showToast('Solde FCFA insuffisant. Recharge ton compte d\'abord.', 'error')
    }

    setIsProcessing(true)
    try {
      // 1. Déduire le solde FCFA
      await supabase.from('profiles').update({ balance: profile.balance - selectedFCFA }).eq('id', profile.id)
      
      // 2. Ajouter les jetons
      await supabase.from('profiles').update({ coins_balance: (profile.coins_balance || 0) + coinsToReceive }).eq('id', profile.id)

      // 3. Notification
      await supabase.from('notifications').insert({
        user_id: profile.id,
        title: 'Achat de jetons réussi 🪙',
        message: `Tu as acheté ${coinsToReceive} jetons pour ${selectedFCFA.toLocaleString('fr-FR')} FCFA.`,
        link: '/dashboard/reseau'
      })

      showToast(`Tu as acheté ${coinsToReceive} jetons !`, 'success')
      setTimeout(() => router.push('/dashboard/reseau'), 2000)
    } catch (err) {
      showToast('Erreur lors de l\'achat.', 'error')
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
        <h1 className="text-lg font-bold text-slate-900">Acheter des Jetons</h1>
      </header>

      <div className="p-4 md:p-8 max-w-lg mx-auto mt-4">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm mb-6">
          <p className="text-xs font-bold text-slate-500 uppercase mb-1">Ton solde FCFA</p>
          <p className="text-3xl font-black text-emerald-600">{profile?.balance?.toLocaleString('fr-FR')} F</p>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl p-6 text-white shadow-lg mb-6">
          <h2 className="text-xl font-bold mb-2">Soutiens tes créateurs préférés</h2>
          <p className="text-amber-100 text-sm">Achète des jetons et envoie-les aux publications que tu aimes.</p>
        </div>

        {/* Packs d'achat */}
        <div className="space-y-3 mb-6">
          {[1000, 2500, 5000, 10000].map(amount => {
            const coins = Math.floor((amount / 1000) * COINS_PER_1000_FCFA)
            return (
              <button 
                key={amount} 
                onClick={() => setSelectedFCFA(amount)}
                className={`w-full p-4 rounded-2xl border-2 transition flex justify-between items-center ${selectedFCFA === amount ? 'border-amber-500 bg-amber-50' : 'border-slate-200 bg-white'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center font-bold text-lg">🪙</div>
                  <div className="text-left">
                    <span className="font-bold text-slate-900 block">{coins} Jetons</span>
                    <span className="text-xs text-slate-500">pour {amount.toLocaleString('fr-FR')} FCFA</span>
                  </div>
                </div>
                <span className="font-black text-slate-700">{amount.toLocaleString('fr-FR')} F</span>
              </button>
            )
          })}
        </div>

        <button 
          onClick={handleBuy} 
          disabled={isProcessing || (profile?.balance || 0) < selectedFCFA} 
          className="w-full py-4 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-400 disabled:opacity-50 transition shadow-md"
        >
          {isProcessing ? 'Achat en cours...' : `Payer ${selectedFCFA.toLocaleString('fr-FR')} F pour ${coinsToReceive} jetons`}
        </button>
      </div>
    </main>
  )
}
