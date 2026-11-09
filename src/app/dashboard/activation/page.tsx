'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ActivationPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [price, setPrice] = useState(2000)
  const [toast, setToast] = useState<string | null>(null)

  // Réglages de paiement
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

      const { data: priceSetting } = await supabase.from('app_settings').select('value').eq('key', 'activation_price').single()
      if (priceSetting) setPrice(parseInt(priceSetting.value))

      const { data: s } = await supabase.from('app_settings').select('*').in('key', ['payment_provider', 'leekpay_enabled', 'soleaspay_enabled', 'soleaspay_payment_link'])
      const settingsObj: any = {}
      s?.forEach(item => { settingsObj[item.key] = item.value })
      
      setSettings({
        provider: settingsObj.payment_provider || 'leekpay',
        leekEnabled: settingsObj.leekpay_enabled === 'true',
        soleasEnabled: settingsObj.soleaspay_enabled === 'true',
        soleasLink: settingsObj.soleaspay_payment_link || ''
      })

      setLoading(false)
    }
    load()
  }, [supabase, router])

  const showMsg = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  // Paiement par SOLDE
  const activateWithBalance = async () => {
    if (!profile) return
    if ((profile.balance || 0) < price) return showMsg('Solde insuffisant.')
    if (!confirm(`Activer le compte pour ${price} FCFA ?`)) return

    setProcessing(true)
    try {
      const { data, error } = await supabase.rpc('activate_premium_account', { p_user_id: profile.id })
      if (error) throw error
      showMsg('Compte activé avec succès !')
      setTimeout(() => router.push('/dashboard'), 1500)
    } catch (err: any) {
      showMsg('Erreur: ' + err.message)
    }
    setProcessing(false)
  }

  // Paiement par LEEKPAY
  const activateWithLeekPay = async () => {
    setProcessing(true)
    try {
      const res = await fetch('/api/leekpay/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: price, description: 'Activation Premium XAFEARN' })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      window.location.href = data.payment_url
    } catch (err: any) {
      showMsg('Erreur LeekPay: ' + err.message)
      setProcessing(false)
    }
  }

  // Paiement par SOLEASPAY (lien direct)
  const activateWithSoleasPay = () => {
    if (!settings.soleasLink) return showMsg('Lien de paiement non configuré.')
    window.open(settings.soleasLink, '_blank')
    showMsg('Le paiement sera validé manuellement après réception.')
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin"></div></div>

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white border-b border-slate-200 px-4 py-4 flex items-center gap-3">
        <Link href="/dashboard" className="text-slate-500 bg-slate-100 p-2 rounded-full"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg></Link>
        <h1 className="font-bold text-slate-900 flex-1">Activation Premium</h1>
      </header>

      <div className="p-4 max-w-md mx-auto mt-4 space-y-4">

        <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl p-6 text-white text-center shadow-lg">
          <h2 className="text-2xl font-black mb-1">Passe au niveau supérieur</h2>
          <p className="text-amber-100 text-sm">Débloque les tâches Premium et le parrainage à 3 niveaux.</p>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-100">
            <span className="text-slate-500 font-medium">Frais d'activation</span>
            <span className="text-2xl font-black text-slate-900">{price.toLocaleString('fr-FR')} F</span>
          </div>
          <div className="flex justify-between items-center mb-6">
            <span className="text-slate-500 font-medium">Ton solde</span>
            <span className={`font-black ${(profile?.balance || 0) >= price ? 'text-emerald-600' : 'text-red-500'}`}>
              {profile?.balance?.toLocaleString('fr-FR') || 0} F
            </span>
          </div>

          {profile?.is_premium ? (
            <div className="w-full py-4 bg-emerald-50 text-emerald-600 font-bold rounded-xl text-center border border-emerald-200">
              ✅ Ton compte est déjà activé
            </div>
          ) : (
            <div className="space-y-2">
              {/* BOUTON SOLDE */}
              <button onClick={activateWithBalance} disabled={processing || (profile?.balance || 0) < price} className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl shadow-md disabled:opacity-50">
                Payer avec mon solde ({price.toLocaleString('fr-FR')} F)
              </button>

              {/* BOUTONS DE PAIEMENT EXTERNE SELON L'ADMIN */}
              {settings.provider !== 'disabled' && (
                <>
                  {settings.leekEnabled && (
                    <button onClick={activateWithLeekPay} disabled={processing} className="w-full py-4 bg-sky-500 text-white font-bold rounded-xl shadow-md disabled:opacity-50">
                      Payer avec LeekPay
                    </button>
                  )}
                  {settings.soleasEnabled && (
                    <button onClick={activateWithSoleasPay} disabled={processing} className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl shadow-md disabled:opacity-50">
                      Payer avec SoleasPay
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl">
          <p className="text-xs text-amber-800 leading-relaxed">
            💡 Le paiement par <strong>SoleasPay</strong> est validé manuellement par l'admin après réception. Tu recevras une notification dès que ton compte sera activé.
          </p>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[300] px-5 py-3 bg-slate-900 text-white text-sm font-bold rounded-full shadow-xl">{toast}</div>
      )}
    </main>
  )
}
