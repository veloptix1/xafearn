'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ModifierMotDePassePage() {
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setToast('Les mots de passe ne correspondent pas.')
      return
    }
    if (newPassword.length < 6) {
      setToast('Le mot de passe doit faire au moins 6 caractères.')
      return
    }
    
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })

    if (error) {
      setToast('Erreur : ' + error.message)
    } else {
      setToast('Mot de passe modifié avec succès !')
      setTimeout(() => router.push('/dashboard/profil'), 1500)
    }
    setSaving(false)
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex items-center gap-4">
        <Link href="/dashboard/profil" className="text-slate-500 hover:text-slate-900 bg-slate-100 p-2 rounded-full">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-lg font-bold text-slate-900">Modifier le mot de passe</h1>
      </header>

      <div className="p-4 md:p-8 max-w-lg mx-auto mt-4">
        <form onSubmit={handleSave} className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nouveau mot de passe</label>
            <input type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Confirmer le mot de passe</label>
            <input type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900" />
          </div>

          {toast && <div className={`text-sm font-medium text-center p-3 rounded-xl ${toast.includes('succès') ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>{toast}</div>}

          <button type="submit" disabled={saving} className="w-full py-4 bg-sky-500 text-white font-bold rounded-xl hover:bg-sky-400 disabled:opacity-50 transition shadow-sm">
            {saving ? 'Enregistrement...' : 'Changer le mot de passe'}
          </button>
        </form>
      </div>
    </main>
  )
}
