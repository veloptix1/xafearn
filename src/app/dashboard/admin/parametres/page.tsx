'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Toast from '@/components/Toast'

export default function AdminSettingsPage() {
  const supabase = createClient()
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [activationPrice, setActivationPrice] = useState('2000')
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message: msg, type })
  }

  useEffect(() => {
    async function init() {
      // 1. Vérifier que l'utilisateur est bien admin
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.replace('/login')

      const { data: prof } = await supabase.from('profiles').select('role, is_admin').eq('id', user.id).single()
      if (!prof || (prof.role !== 'admin' && !prof.is_admin)) {
        return router.replace('/dashboard') // Rediriger si pas admin
      }
      setIsAdmin(true)

      // 2. Charger le prix actuel
      const { data: setting } = await supabase.from('app_settings').select('value').eq('key', 'activation_price').single()
      if (setting) setActivationPrice(setting.value)

      setLoading(false)
    }
    init()
  }, [supabase, router])

  const saveSettings = async () => {
    if (!activationPrice || isNaN(parseInt(activationPrice))) {
      return showToast('Veuillez entrer un prix valide.', 'error')
    }
    
    setSaving(true)
    try {
      // Mettre à jour (ou insérer si n'existe pas)
      const { error } = await supabase.from('app_settings').upsert({
        key: 'activation_price',
        value: activationPrice,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' })

      if (error) throw error

      showToast('Prix d\'activation mis à jour avec succès !', 'success')
    } catch (err: any) {
      showToast('Erreur: ' + err.message, 'error')
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-medium">Vérification des droits...</p>
      </div>
    )
  }

  if (!isAdmin) return null

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex items-center gap-4">
        <Link href="/dashboard/admin" className="text-slate-500 hover:text-slate-900 bg-slate-100 p-2 rounded-full transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Paramètres Plateforme</h1>
          <p className="text-xs text-slate-500">Configuration globale de Xafearn</p>
        </div>
      </header>

      <div className="p-4 md:p-8 max-w-2xl mx-auto mt-4 space-y-6">
        
        {/* Carte Explication */}
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl flex gap-3">
          <svg className="w-6 h-6 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <div>
            <h3 className="font-bold text-blue-900 text-sm">Note importante</h3>
            <p className="text-xs text-blue-700 mt-1 leading-relaxed">Les modifications effectuées ici s'appliquent instantanément à tous les utilisateurs de la plateforme.</p>
          </div>
        </div>

        {/* Section Prix d'activation */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <h2 className="font-bold text-slate-900">Prix d'activation Premium</h2>
              <p className="text-xs text-slate-500">Montant requis pour activer un compte</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Montant (FCFA)</label>
              <div className="relative">
                <input 
                  type="number" 
                  value={activationPrice} 
                  onChange={e => setActivationPrice(e.target.value)} 
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-xl font-black text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition" 
                  placeholder="2000"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">FCFA</span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
              <p className="text-xs font-bold text-slate-500 uppercase mb-2">Aperçu des commissions</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Niveau 1 (50%)</span>
                  <span className="font-bold text-emerald-600">{Math.floor(parseInt(activationPrice || '0') * 0.5).toLocaleString('fr-FR')} F</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Niveau 2 (25%)</span>
                  <span className="font-bold text-sky-600">{Math.floor(parseInt(activationPrice || '0') * 0.25).toLocaleString('fr-FR')} F</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Niveau 3 (10%)</span>
                  <span className="font-bold text-indigo-600">{Math.floor(parseInt(activationPrice || '0') * 0.1).toLocaleString('fr-FR')} F</span>
                </div>
                <div className="border-t border-slate-200 pt-1 mt-1 flex justify-between">
                  <span className="font-bold text-slate-800">Reste pour la plateforme (15%)</span>
                  <span className="font-bold text-slate-800">{Math.floor(parseInt(activationPrice || '0') * 0.15).toLocaleString('fr-FR')} F</span>
                </div>
              </div>
            </div>

            <button 
              onClick={saveSettings} 
              disabled={saving}
              className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl shadow-lg active:scale-[0.98] transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                'Enregistrement...'
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                  Enregistrer le nouveau prix
                </>
              )}
            </button>
          </div>
        </div>

        {/* Autres réglages (à venir) */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 opacity-60">
          <h2 className="font-bold text-slate-900 mb-2">Autres paramètres</h2>
          <p className="text-xs text-slate-500">D'autres options de configuration arriveront bientôt (taux de conversion, frais de retrait, etc).</p>
        </div>

      </div>
    </main>
  )
}
