'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function NotificationsSettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  
  const [prefs, setPrefs] = useState({
    email_on_new_campaign: true,
    email_on_validation: true,
    email_on_rejection: true,
    email_on_payment: true,
    email_on_newsletter: false,
  })

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')
      
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) {
        setPrefs({
          email_on_new_campaign: data.email_on_new_campaign ?? true,
          email_on_validation: data.email_on_validation ?? true,
          email_on_rejection: data.email_on_rejection ?? true,
          email_on_payment: data.email_on_payment ?? true,
          email_on_newsletter: data.email_on_newsletter ?? false,
        })
      }
      setLoading(false)
    }
    load()
  }, [router, supabase])

  const toggle = (key: keyof typeof prefs) => {
    setPrefs(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSave = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('profiles').update(prefs).eq('id', user.id)
    if (error) setToast('Erreur : ' + error.message)
    else {
      setToast('Préférences enregistrées !')
      setTimeout(() => router.push('/dashboard/profil'), 1500)
    }
    setSaving(false)
  }

  const options = [
    { key: 'email_on_new_campaign', title: 'Nouvelles campagnes', desc: 'Recevoir un email quand une nouvelle annonce est disponible.' },
    { key: 'email_on_validation', title: 'Validation de diffusion', desc: 'Recevoir un email quand vos gains sont validés.' },
    { key: 'email_on_rejection', title: 'Rejet de preuve', desc: 'Recevoir un email si votre preuve est rejetée.' },
    { key: 'email_on_payment', title: 'Paiements & Retraits', desc: 'Recevoir un email à chaque demande de retrait.' },
    { key: 'email_on_newsletter', title: 'Newsletter XAFEARN', desc: 'Conseils, astuces et actualités de la plateforme.' },
  ]

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">Chargement...</div>

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex items-center gap-4">
        <Link href="/dashboard/profil" className="text-slate-500 hover:text-slate-900 bg-slate-100 p-2 rounded-full">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-lg font-bold text-slate-900">Notifications</h1>
      </header>

      <div className="p-4 md:p-8 max-w-lg mx-auto mt-4">
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden mb-6">
          {options.map((opt, idx) => (
            <div key={opt.key} className={`p-4 flex items-center justify-between ${idx !== options.length - 1 ? 'border-b border-slate-100' : ''}`}>
              <div className="pr-4">
                <p className="font-bold text-slate-900 text-sm">{opt.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
              </div>
              <button 
                onClick={() => toggle(opt.key as keyof typeof prefs)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${prefs[opt.key as keyof typeof prefs] ? 'bg-sky-500' : 'bg-slate-200'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${prefs[opt.key as keyof typeof prefs] ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          ))}
        </div>

        {toast && <div className="text-emerald-600 text-sm font-medium text-center mb-4">{toast}</div>}

        <button onClick={handleSave} disabled={saving} className="w-full py-4 bg-sky-500 text-white font-bold rounded-xl hover:bg-sky-400 disabled:opacity-50 transition shadow-sm">
          {saving ? 'Enregistrement...' : 'Enregistrer mes préférences'}
        </button>
      </div>
    </main>
  )
}
