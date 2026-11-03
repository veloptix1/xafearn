'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="w-full max-w-md bg-white border border-slate-200 p-8 rounded-3xl shadow-sm">
        <Link href="/" className="block text-center mb-8">
          <img src="/logo.png" alt="XAFERAN" className="h-10 w-auto object-contain mx-auto" />
        </Link>
        
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <input type="email" required placeholder="Adresse email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none transition text-slate-900 placeholder-slate-400" />
          </div>
          <div>
            <input type="password" required placeholder="Mot de passe" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none transition text-slate-900 placeholder-slate-400" />
          </div>

          {error && <div className="text-red-500 text-sm text-center bg-red-50 border border-red-100 py-2 rounded-lg">{error}</div>}

          <button type="submit" disabled={loading} className="w-full py-4 bg-sky-500 text-white font-bold rounded-xl hover:bg-sky-400 disabled:opacity-50 transition shadow-sm">
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
        
        <p className="text-center text-sm text-slate-500 mt-8">
          Pas de compte ? <Link href="/signup" className="text-sky-500 font-medium hover:underline">S'inscrire</Link>
        </p>
      </div>
    </main>
  )
}
