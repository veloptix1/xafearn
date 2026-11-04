'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
    }
    setLoading(false)
  }

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
        <div className="text-center bg-white border border-slate-200 p-10 rounded-3xl max-w-md shadow-sm">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
          </div>
          <h2 className="text-2xl font-bold mb-2 text-slate-900">Email envoyé !</h2>
          <p className="text-slate-500 text-sm mb-6">Si un compte existe avec cet email, tu recevras un lien pour réinitialiser ton mot de passe.</p>
          <Link href="/login" className="block w-full py-3 bg-sky-500 text-white font-bold rounded-xl hover:bg-sky-400 transition">Retour à la connexion</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="w-full max-w-md">
        <Link href="/" className="block text-center mb-6">
          <img src="/logo.png" alt="XAFEARN" className="h-10 w-auto object-contain mx-auto" />
        </Link>
        <div className="bg-white border border-slate-200 p-6 md:p-8 rounded-3xl shadow-sm">
          <h1 className="text-2xl font-black text-slate-900 mb-1 text-center">Mot de passe oublié</h1>
          <p className="text-slate-500 text-sm mb-6 text-center">Entre ton email pour recevoir un lien de réinitialisation.</p>
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="ton@email.com" className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900" />
            </div>
            {error && <div className="text-red-500 text-sm text-center bg-red-50 p-2 rounded-lg">{error}</div>}
            <button type="submit" disabled={loading} className="w-full py-4 bg-sky-500 text-white font-bold rounded-xl hover:bg-sky-400 disabled:opacity-50 transition shadow-sm">
              {loading ? 'Envoi...' : 'Envoyer le lien'}
            </button>
          </form>
          <p className="text-center text-sm text-slate-500 mt-6">
            <Link href="/login" className="text-sky-500 font-bold hover:underline">Retour à la connexion</Link>
          </p>
        </div>
      </div>
    </main>
  )
}
