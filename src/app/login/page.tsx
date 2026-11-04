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
      <div className="w-full max-w-md">
        <Link href="/" className="block text-center mb-6">
          <img src="/logo.png" alt="XAFEARN" className="h-10 w-auto object-contain mx-auto" />
        </Link>
        
        <div className="bg-white border border-slate-200 p-6 md:p-8 rounded-3xl shadow-sm">
          <h1 className="text-2xl font-black text-slate-900 mb-1 text-center">Bon retour 👋</h1>
          <p className="text-slate-500 text-sm mb-6 text-center">Connecte-toi à ton compte XAFEARN.</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="ton@email.com" className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900" />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold text-slate-600 uppercase">Mot de passe</label>
                <Link href="/forgot-password" className="text-xs text-sky-500 font-medium hover:underline">Oublié ?</Link>
              </div>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900" />
            </div>

            {error && <div className="text-red-500 text-sm text-center bg-red-50 p-2 rounded-lg">{error}</div>}

            <button type="submit" disabled={loading} className="w-full py-4 bg-sky-500 text-white font-bold rounded-xl hover:bg-sky-400 disabled:opacity-50 transition shadow-sm mt-2">
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>
          
          <p className="text-center text-sm text-slate-500 mt-6">
            Pas encore de compte ? <Link href="/signup" className="text-sky-500 font-bold hover:underline">S'inscrire</Link>
          </p>
        </div>
      </div>
    </main>
  )
}
