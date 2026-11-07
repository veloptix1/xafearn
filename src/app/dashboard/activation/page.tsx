'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Toast from '@/components/Toast'

export default function ActivationPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [activationPrice, setActivationPrice] = useState(2000)
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => setToast({ message: msg, type })

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')
      
      // Charger le profil
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data)
      
      // Charger le prix d'activation dynamique
      const { data: setting } = await supabase.from('app_settings').select('value').eq('key', 'activation_price').single()
      if (setting) setActivationPrice(parseInt(setting.value))
      
      setLoading(false)
    }
    load()
  }, [supabase, router])

  const activateAccount = async () => {
    if (!profile) return
    if ((profile.balance || 0) < activationPrice) {
      return showToast(`Solde insuffisant. Il te faut ${activationPrice} FCFA.`, 'error')
    }
    if (!confirm(`Confirmer l'activation de ton compte Premium pour ${activationPrice} FCFA ?`)) return

    setProcessing(true)
    try {
      // Appel de la fonction RPC sécurisée
      const { data, error } = await supabase.rpc('activate_premium_account', { p_user_id: profile.id })
      
      if (error) throw error

      // Notification locale
      await supabase.from('notifications').insert({
        user_id: profile.id,
        title: 'Compte Activé ! 🎉',
        message: 'Ton compte Premium est activé. Tu as maintenant accès aux tâches Premium et au bonus quotidien.',
        link: '/dashboard/taches'
      })

      showToast('Compte activé avec succès !', 'success')
      setTimeout(() => router.push('/dashboard/taches'), 2000)
    } catch (err: any) {
      showToast('Erreur: ' + err.message, 'error')
    }
    setProcessing(false)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex items-center gap-4">
        <Link href="/dashboard" className="text-slate-500 bg-slate-100 p-2 rounded-full">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-lg font-bold text-slate-900">Activation Premium</h1>
      </header>

      <div className="p-4 max-w-lg mx-auto mt-6">
        <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl p-8 text-white text-center shadow-xl mb-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-2xl transform translate-x-10 -translate-y-10"></div>
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
          </div>
          <h2 className="text-2xl font-black mb-2">Passe au niveau supérieur</h2>
          <p className="text-amber-100 text-sm">Débloque ton potentiel de gains sur Xafearn</p>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 mb-6">
          <h3 className="font-bold text-slate-900 mb-4">Ce que tu obtiens avec l'activation :</h3>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm">Tâches Premium</p>
                <p className="text-xs text-slate-500">Accès à des missions exclusives mieux rémunérées.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm">Bonus quotidien</p>
                <p className="text-xs text-slate-500">Réclame 50 jetons gratuits chaque jour.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm">Parrainage (Niveau 1, 2, 3)</p>
                <p className="text-xs text-slate-500">Gagne 50% au N1, 25% au N2, 10% au N3 sur l'activation de tes filleuls.</p>
              </div>
            </li>
          </ul>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-500 font-medium">Frais d'activation</span>
            <span className="text-2xl font-black text-slate-900">{activationPrice.toLocaleString('fr-FR')} F</span>
          </div>
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
            <span className="text-slate-500 font-medium">Ton solde</span>
            <span className={`text-xl font-black ${(profile?.balance || 0) >= activationPrice ? 'text-emerald-600' : 'text-red-500'}`}>
              {profile?.balance?.toLocaleString('fr-FR') || 0} F
            </span>
          </div>

          {profile?.is_premium ? (
            <div className="w-full py-4 bg-emerald-50 text-emerald-600 font-bold rounded-xl text-center border border-emerald-200">
              ✅ Ton compte est déjà activé
            </div>
          ) : (
            <button 
              onClick={activateAccount} 
              disabled={processing || (profile?.balance || 0) < activationPrice}
              className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              {processing ? 'Activation...' : `Activer mon compte (${activationPrice.toLocaleString('fr-FR')} F)`}
            </button>
          )}
          
          {(profile?.balance || 0) < activationPrice && !profile?.is_premium && (
            <Link href="/dashboard/jetons/acheter" className="block text-center text-xs text-sky-600 font-bold mt-3">
              Recharger mon solde →
            </Link>
          )}
        </div>
      </div>
    </main>
  )
}
