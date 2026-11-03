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
    <main className="min-h-screen flex items-center justify-center p-6 bg-slate-950">
      <div className="w-full max-w-md bg-slate-900 border border-white/5 p-8 rounded-3xl">
        <Link href="/" className="block text-center text-2xl font-black mb-8 text-white">
          XAF<span className="text-cyan-400">ERAN</span>
        </Link>
        
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <input type="email" required placeholder="Adresse email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-4 bg-slate-950 border border-white/5 rounded-xl focus:border-cyan-500 outline-none transition text-white placeholder-slate-500" />
          </div>
          <div>
            <input type="password" required placeholder="Mot de passe" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 bg-slate-950 border border-white/5 rounded-xl focus:border-cyan-500 outline-none transition text-white placeholder-slate-500" />
          </div>

          {error && <div className="text-red-400 text-sm text-center bg-red-400/10 py-2 rounded-lg">{error}</div>}

          <button type="submit" disabled={loading} className="w-full py-4 bg-cyan-500 text-white font-bold rounded-xl hover:bg-cyan-400 disabled:opacity-50 transition">
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
        
        <p className="text-center text-sm text-slate-400 mt-8">
          Pas de compte ? <Link href="/signup" className="text-cyan-400 font-medium hover:underline">S'inscrire</Link>
        </p>
      </div>
    </main>
  )
}
