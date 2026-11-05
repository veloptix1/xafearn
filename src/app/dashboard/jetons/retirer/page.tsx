'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Toast from '@/components/Toast'

export default function ConvertCoinsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [amountToConvert, setAmountToConvert] = useState('')
  
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' | 'warning' } | null>(null)
  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => setToast({ message, type })

  // Taux de conversion caché (1 jeton = 1 FCFA brut)
  // La plateforme garde 40%, donc l'utilisateur reçoit 60%
  const RATE = 0.60 

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data)
      setAmountToConvert(data?.coins_balance?.toString() || '0')
      setLoading(false)
    }
    load()
  }, [router, supabase])

  const maxCoins = profile?.coins_balance || 0
  const coins = parseInt(amountToConvert) || 0
  const fcfcToReceive = coins * RATE

  const handleConvert = async () => {
    if (coins <= 0) return showToast('Entre un montant valide.', 'warning')
    if (coins > maxCoins) return showToast('Tu n\'as pas assez de jetons.', 'error')
    
    setIsProcessing(true)
    try {
      // 1. Ajouter l'argent au solde FCFA
      await supabase.from('profiles').update({ 
        balance: (profile.balance || 0) + fcfcToReceive 
      }).eq('id', profile.id)

      // 2. Retirer les jetons convertis
      await supabase.from('profiles').update({ 
        coins_balance: maxCoins - coins 
      }).eq('id', profile.id)

      // 3. Enregistrer la conversion
      await supabase.from('coin_conversions').insert({
        user_id: profile.id,
        coins_converted: coins,
        fcfc_received: fcfcToReceive,
        commission: coins - fcfcToReceive
      })

      // 4. Notification
      await supabase.from('notifications').insert({
        user_id: profile.id,
        title: 'Jetons convertis ! 💰',
        message: `Tu as converti ${coins} jetons et reçu ${fcfcToReceive.toFixed(0)} FCFA sur ton solde.`,
        link: '/dashboard'
      })

      showToast(`Conversion réussie ! +${fcfcToReceive.toFixed(0)} FCFA`, 'success')
      setTimeout(() => router.push('/dashboard'), 2000)
    } catch (err) {
      showToast('Erreur lors de la conversion.', 'error')
    }
    setIsProcessing(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
      <div className="w-10 h-10 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin mb-4"></div>
      <p className="text-slate-500 font-medium">Chargement...</p>
    </div>
  )

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
        
        {/* Carte Profil */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm mb-6 flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
            {profile?.full_name?.charAt(0)}
          </div>
          <div>
            <p className="font-bold text-slate-900">{profile?.full_name}</p>
            <p className="text-xs text-slate-500">Niveau {profile?.level} • {profile?.city || 'Ville non définie'}</p>
          </div>
        </div>

        {/* Solde Jetons */}
        <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl p-6 text-white shadow-lg mb-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-2xl transform translate-x-10 -translate-y-10"></div>
          <div className="relative z-10">
            <p className="text-amber-100 text-xs font-bold uppercase tracking-wider mb-1">Jetons disponibles</p>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black">🪙 {maxCoins.toLocaleString('fr-FR')}</span>
            </div>
          </div>
        </div>

        {/* Formulaire de conversion */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm mb-6">
          <h2 className="font-bold text-slate-900 mb-4">Combien veux-tu convertir ?</h2>
          
          <div className="relative mb-4">
            <input 
              type="number" 
              value={amountToConvert} 
              onChange={e => setAmountToConvert(e.target.value)} 
              max={maxCoins}
              className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-xl text-2xl font-black text-slate-900 focus:border-amber-400 outline-none pr-24" 
            />
            <button 
              onClick={() => setAmountToConvert(maxCoins.toString())}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-lg"
            >
              MAX
            </button>
          </div>
          
          <input 
            type="range" 
            min="0" 
            max={maxCoins} 
            value={coins} 
            onChange={e => setAmountToConvert(e.target.value)}
            className="w-full accent-amber-500 mb-6"
          />

          {/* Simulation en temps réel */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 text-center mb-6">
            <p className="text-xs font-bold text-slate-500 uppercase mb-2">Tu recevras</p>
            <p className="text-4xl font-black text-emerald-600 mb-1">{fcfcToReceive.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} FCFA</p>
            <p className="text-xs text-slate-400">sur ton solde FCFA</p>
          </div>

          <button 
            onClick={handleConvert} 
            disabled={isProcessing || coins <= 0 || coins > maxCoins} 
            className="w-full py-4 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-400 disabled:opacity-50 transition shadow-md"
          >
            {isProcessing ? 'Conversion...' : `Convertir ${coins.toLocaleString('fr-FR')} jetons`}
          </button>
        </div>

        {/* Info utile */}
        <div className="bg-sky-50 border border-sky-100 p-4 rounded-2xl">
          <p className="text-xs text-sky-800 leading-relaxed">
            💡 <strong>Comment ça marche ?</strong><br />
            Une fois converti, l'argent est ajouté à ton solde principal. Tu pourras ensuite demander un retrait sur Mobile Money depuis la page <strong>"Retirer"</strong>.
          </p>
        </div>
      </div>
    </main>
  )
}
