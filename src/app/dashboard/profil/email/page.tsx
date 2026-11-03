'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ModifierEmailPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [newEmail, setNewEmail] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')
      setEmail(user.email || '')
      setLoading(false)
    }
    load()
  }, [router, supabase])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ email: newEmail })

    if (error) {
      setToast('Erreur : ' + error.message)
    } else {
      setToast('Un email de confirmation a été envoyé à ta nouvelle adresse.')
      // Mettre à jour aussi la table profiles
      const { data: { user } } = await supabase.auth.getUser()
      if (user) await supabase.from('profiles').update({ email: newEmail }).eq('id', user.id)
    }
    setSaving(false)
  }

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">Chargement...</div>

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex items-center gap-4">
        <Link href="/dashboard/profil" className="text-slate-500 hover:text-slate-900 bg-slate-100 p-2 rounded-full">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-lg font-bold text-slate-900">Modifier l'email</h1>
      </header>

      <div className="p-4 md:p-8 max-w-lg mx-auto mt-4">
        <form onSubmit={handleSave} className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email actuel</label>
            <input type="email" disabled value={email} className="w-full p-4 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nouvel email</label>
            <input type="email" required value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="nouveau@email.com" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900" />
          </div>

          {toast && <div className="text-sky-600 text-sm font-medium text-center bg-sky-50 p-3 rounded-xl">{toast}</div>}

          <button type="submit" disabled={saving} className="w-full py-4 bg-sky-500 text-white font-bold rounded-xl hover:bg-sky-400 disabled:opacity-50 transition shadow-sm">
            {saving ? 'Envoi...' : 'Mettre à jour l\'email'}
          </button>
        </form>
      </div>
    </main>
  )
}
