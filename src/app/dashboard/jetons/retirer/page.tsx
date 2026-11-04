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
  
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' | 'warning' } | null>(null)
  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => setToast({ message, type })

  const COMMISSION_RATE = 0.40 // 40% pour la plateforme
  const coinsToConvert = profile?.coins_balance || 0
  const fcfcToReceive = coinsToConvert * (1 - COMMISSION_RATE)
  const commission = coinsToConvert * COMMISSION_RATE

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

  const handleConvert = async () => {
    if (coinsToConvert <= 0) return showToast('Tu n\'as pas de jetons à convertir.', 'warning')
    
    setIsProcessing(true)
    try {
      // 1. Ajouter l'argent au solde FCFA
      await supabase.from('profiles').update({ 
        balance: (profile.balance || 0) + fcfcToReceive 
      }).eq('id', profile.id)

      // 2. Retirer les jetons du profil
      await supabase.from('profiles').update({ 
        coins_balance: 0 
      }).eq('id', profile.id)

      // 3. Enregistrer la conversion (trace)
      await supabase.from('coin_conversions').insert({
        user_id: profile.id,
        coins_converted: coinsToConvert,
        fcfc_received: fcfcToReceive,
        commission: commission
      })

      // 4. Notification
      await supabase.from('notifications').insert({
        user_id: profile.id,
        title: 'Jetons convertis ! 💰',
        message: `Tu as converti ${coinsToConvert} jetons en ${fcfcToReceive.toFixed(0)} FCFA. Ton solde a été mis à jour.`,
        link: '/dashboard'
      })

      showToast(`Tu as reçu ${fcfcToReceive.toFixed(0)} FCFA !`, 'success')
      setTimeout(() => router.push('/dashboard'), 2000)
    } catch (err) {
      showToast('Erreur lors de la conversion.', 'error')
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
          <p className="text-4xl font-black text-amber-500 mb-2">🪙 {coinsToConvert}</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm mb-6">
          <h2 className="font-bold text-slate-900 mb-4 text-center">Détails de la conversion</h2>
          
          <div className="space-y-2 text-sm mb-6">
            <div className="flex justify-between text-slate-600">
              <span>Valeur des jetons</span>
              <span className="font-semibold">{coinsToConvert.toLocaleString('fr-FR')} F</span>
            </div>
            <div className="flex justify-between text-red-500">
              <span>Frais de plateforme (40%)</span>
              <span className="font-semibold">-{commission.toFixed(0)} F</span>
            </div>
            <div className="border-t border-slate-200 pt-2 flex justify-between text-emerald-600 font-bold text-lg">
              <span>Tu recevras sur ton solde</span>
              <span>{fcfcToReceive.toFixed(0)} F</span>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl mb-4">
            <p className="text-xs text-amber-800">💡 Cet argent sera ajouté à ton solde FCFA. Tu pourras ensuite le retirer via Mobile Money depuis la page "Retirer".</p>
          </div>

          <button 
            onClick={handleConvert} 
            disabled={isProcessing || coinsToConvert <= 0} 
            className="w-full py-4 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-400 disabled:opacity-50 transition shadow-md"
          >
            {isProcessing ? 'Conversion...' : 'Convertir en FCFA'}
          </button>
        </div>
      </div>
    </main>
  )
}
