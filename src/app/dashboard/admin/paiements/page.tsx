'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function AdminPaymentsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // Réglages
  const [provider, setProvider] = useState('leekpay')
  const [soleasLink, setSoleasLink] = useState('')
  const [leekEnabled, setLeekEnabled] = useState(true)
  const [soleasEnabled, setSoleasEnabled] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return router.replace('/login')

      const { data: prof } = await supabase.from('profiles').select('role, is_admin').eq('id', session.user.id).single()
      if (!prof || (prof.role !== 'admin' && !prof.is_admin)) return router.replace('/dashboard')
      setIsAdmin(true)

      const { data: settings } = await supabase.from('app_settings').select('*').in('key', [
        'payment_provider', 'soleaspay_payment_link', 'leekpay_enabled', 'soleaspay_enabled'
      ])
      settings?.forEach(s => {
        if (s.key === 'payment_provider') setProvider(s.value)
        if (s.key === 'soleaspay_payment_link') setSoleasLink(s.value)
        if (s.key === 'leekpay_enabled') setLeekEnabled(s.value === 'true')
        if (s.key === 'soleaspay_enabled') setSoleasEnabled(s.value === 'true')
      })
      setLoading(false)
    }
    load()
  }, [supabase, router])

  const showMsg = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const save = async () => {
    setSaving(true)
    try {
      const updates = [
        { key: 'payment_provider', value: provider },
        { key: 'soleaspay_payment_link', value: soleasLink },
        { key: 'leekpay_enabled', value: leekEnabled ? 'true' : 'false' },
        { key: 'soleaspay_enabled', value: soleasEnabled ? 'true' : 'false' },
      ]
      for (const u of updates) {
        await supabase.from('app_settings').upsert({ key: u.key, value: u.value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
      }
      showMsg('Paramètres sauvegardés !')
    } catch (err: any) {
      showMsg('Erreur : ' + err.message)
    }
    setSaving(false)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin"></div></div>
  if (!isAdmin) return null

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white border-b border-slate-200 px-4 py-4 flex items-center gap-3">
        <Link href="/dashboard/admin" className="text-slate-500 bg-slate-100 p-2 rounded-full"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg></Link>
        <h1 className="font-bold text-slate-900 flex-1">Admin - Paiements</h1>
      </header>

      <div className="p-4 max-w-md mx-auto space-y-4">

        <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl">
          <p className="text-xs text-blue-800 leading-relaxed">Choisis quel fournisseur de paiement est actif. Les utilisateurs ne verront que les boutons activés.</p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Fournisseur actif</label>
            <select value={provider} onChange={e => setProvider(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-sky-500">
              <option value="leekpay">LeekPay</option>
              <option value="soleaspay">SoleasPay</option>
              <option value="manual">Lien manuel (admin)</option>
              <option value="disabled">Désactiver le paiement</option>
            </select>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-bold text-slate-900 uppercase mb-3">Boutons à afficher</p>
            <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl mb-2">
              <input type="checkbox" checked={leekEnabled} onChange={e => setLeekEnabled(e.target.checked)} className="w-4 h-4 accent-sky-500" />
              <span className="text-sm font-bold text-slate-700">LeekPay</span>
            </label>
            <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
              <input type="checkbox" checked={soleasEnabled} onChange={e => setSoleasEnabled(e.target.checked)} className="w-4 h-4 accent-sky-500" />
              <span className="text-sm font-bold text-slate-700">SoleasPay</span>
            </label>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Lien de paiement SoleasPay</label>
            <input type="url" value={soleasLink} onChange={e => setSoleasLink(e.target.value)} placeholder="https://soleaspay.com/pay/..." className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-sky-500" />
            <p className="text-[10px] text-slate-500 mt-1">Colle ici le lien que SoleasPay te donne pour recevoir les paiements.</p>
          </div>

          <button onClick={save} disabled={saving} className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl shadow-md disabled:opacity-50">
            {saving ? 'Enregistrement...' : 'Sauvegarder'}
          </button>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[300] px-5 py-3 bg-slate-900 text-white text-sm font-bold rounded-full shadow-xl">{toast}</div>
      )}
    </main>
  )
}
