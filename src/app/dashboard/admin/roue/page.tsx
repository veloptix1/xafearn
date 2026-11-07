'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Toast from '@/components/Toast'

export default function AdminWheelPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [settings, setSettings] = useState<any>({})
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => setToast({ message: msg, type })

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')

      const { data: prof } = await supabase.from('profiles').select('role, is_admin').eq('id', user.id).single()
      if (!prof || (prof.role !== 'admin' && !prof.is_admin)) return router.push('/dashboard')
      setIsAdmin(true)

      const { data: s } = await supabase.from('app_settings').select('*').in('key', ['wheel_enabled', 'wheel_free_spins_per_day', 'wheel_cost_per_spin', 'wheel_win_probability'])
      const settingsObj: any = {}
      s?.forEach(item => { settingsObj[item.key] = item.value })
      setSettings(settingsObj)
      setLoading(false)
    }
    load()
  }, [supabase, router])

  const updateSetting = async (key: string, value: string) => {
    try {
      const { error } = await supabase.from('app_settings').upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
      if (error) throw error
      setSettings({ ...settings, [key]: value })
      showToast('Paramètre mis à jour !', 'success')
    } catch (err: any) { showToast(err.message, 'error') }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>
  if (!isAdmin) return null

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex items-center gap-4">
        <Link href="/dashboard/admin" className="text-slate-500 bg-slate-100 p-2 rounded-full">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-lg font-bold text-slate-900">Roue de la Fortune (Admin)</h1>
      </header>

      <div className="p-4 max-w-lg mx-auto mt-4 space-y-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="font-bold text-slate-900">Activer la roue</p>
            <p className="text-xs text-slate-500">Visible par tous les utilisateurs</p>
          </div>
          <button onClick={() => updateSetting('wheel_enabled', settings.wheel_enabled === 'true' ? 'false' : 'true')} className={`w-12 h-6 rounded-full transition-colors relative ${settings.wheel_enabled === 'true' ? 'bg-emerald-500' : 'bg-slate-300'}`}>
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${settings.wheel_enabled === 'true' ? 'translate-x-6' : 'translate-x-0'}`}></span>
          </button>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <label className="block font-bold text-slate-900 mb-1">Tours gratuits par jour</label>
          <input type="number" value={settings.wheel_free_spins_per_day || '1'} onChange={e => updateSetting('wheel_free_spins_per_day', e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl mt-2" />
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <label className="block font-bold text-slate-900 mb-1">Prix du tour (jetons)</label>
          <input type="number" value={settings.wheel_cost_per_spin || '5'} onChange={e => updateSetting('wheel_cost_per_spin', e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl mt-2" />
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <label className="block font-bold text-slate-900 mb-1">Taux de réussite (%)</label>
          <input type="number" min="0" max="100" value={settings.wheel_win_probability || '40'} onChange={e => updateSetting('wheel_win_probability', e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl mt-2" />
        </div>

        <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl">
          <p className="text-xs text-blue-800 leading-relaxed">💡 Si tu désactives la roue, les utilisateurs verront un message d'indisponibilité.</p>
        </div>
      </div>
    </main>
  )
}
