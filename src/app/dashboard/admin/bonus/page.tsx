'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function AdminBonusPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const [reward, setReward] = useState('100')
  const [minWithdrawal, setMinWithdrawal] = useState('2000')
  const [fee, setFee] = useState('10')
  const [holdDays, setHoldDays] = useState('7')
  const [requiredTasks, setRequiredTasks] = useState('8')
  const [requiredRefs, setRequiredRefs] = useState('2')

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return router.replace('/login')

      const { data: prof } = await supabase.from('profiles').select('role, is_admin').eq('id', session.user.id).single()
      if (!prof || (prof.role !== 'admin' && !prof.is_admin)) return router.replace('/dashboard')
      setIsAdmin(true)

      const { data: settings } = await supabase.from('app_settings').select('*').in('key', [
        'bonus_referral_reward', 'bonus_min_withdrawal', 'bonus_withdrawal_fee',
        'bonus_hold_days', 'bonus_required_tasks', 'bonus_required_active_refs'
      ])
      settings?.forEach(s => {
        if (s.key === 'bonus_referral_reward') setReward(s.value)
        if (s.key === 'bonus_min_withdrawal') setMinWithdrawal(s.value)
        if (s.key === 'bonus_withdrawal_fee') setFee(s.value)
        if (s.key === 'bonus_hold_days') setHoldDays(s.value)
        if (s.key === 'bonus_required_tasks') setRequiredTasks(s.value)
        if (s.key === 'bonus_required_active_refs') setRequiredRefs(s.value)
      })
      setLoading(false)
    }
    load()
  }, [supabase, router])

  const showMsg = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      const updates = [
        { key: 'bonus_referral_reward', value: reward },
        { key: 'bonus_min_withdrawal', value: minWithdrawal },
        { key: 'bonus_withdrawal_fee', value: fee },
        { key: 'bonus_hold_days', value: holdDays },
        { key: 'bonus_required_tasks', value: requiredTasks },
        { key: 'bonus_required_active_refs', value: requiredRefs },
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
        <Link href="/dashboard/admin" className="text-slate-500 bg-slate-100 p-2 rounded-full active:bg-slate-200">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="font-bold text-slate-900 flex-1">Admin - Bonus</h1>
      </header>

      <div className="p-4 max-w-md mx-auto space-y-4">

        <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl">
          <p className="text-xs text-blue-800 leading-relaxed">
            Configure ici toutes les conditions du parrainage gratuit.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-4">

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Récompense par filleul (FCFA)</label>
            <input type="number" value={reward} onChange={e => setReward(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-sky-500" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Seuil minimum de retrait (FCFA)</label>
            <input type="number" value={minWithdrawal} onChange={e => setMinWithdrawal(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-sky-500" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Frais de retrait (%)</label>
            <input type="number" value={fee} onChange={e => setFee(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-sky-500" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Délai de sécurité (jours)</label>
            <input type="number" value={holdDays} onChange={e => setHoldDays(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-sky-500" />
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-bold text-slate-900 uppercase mb-3">Conditions de retrait</p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Nombre de tâches à accomplir</label>
                <input type="number" value={requiredTasks} onChange={e => setRequiredTasks(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-sky-500" />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Nombre de filleuls actifs requis</label>
                <input type="number" value={requiredRefs} onChange={e => setRequiredRefs(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-sky-500" />
              </div>
            </div>
          </div>

          <button onClick={saveSettings} disabled={saving} className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl shadow-md disabled:opacity-50 active:scale-95 transition">
            {saving ? 'Enregistrement...' : 'Sauvegarder les paramètres'}
          </button>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[300] px-5 py-3 bg-slate-900 text-white text-sm font-bold rounded-full shadow-xl">{toast}</div>
      )}
    </main>
  )
}
