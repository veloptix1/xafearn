'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('diffuseur')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role: role } }
    })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    setSuccess(true)
    setLoading(false)
    setTimeout(() => router.push('/login'), 3000)
  }

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-slate-950">
        <div className="text-center bg-slate-900 border border-white/5 p-10 rounded-3xl max-w-md">
          <h2 className="text-2xl font-bold mb-4 text-cyan-400">Vérifie tes emails</h2>
          <p className="text-slate-400">Un lien de confirmation a été envoyé à <span className="text-white font-medium">{email}</span>.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-slate-950">
      <div className="w-full max-w-md bg-slate-900 border border-white/5 p-8 rounded-3xl">
        <Link href="/" className="block text-center text-2xl font-black mb-8 text-white">
          XAF<span className="text-cyan-400">ERAN</span>
        </Link>
        
        <form onSubmit={handleSignup} className="space-y-5">
          <div className="flex bg-slate-950 p-1 rounded-full border border-white/5">
            <button type="button" onClick={() => setRole('diffuseur')} className={`flex-1 py-2.5 rounded-full text-sm font-semibold transition ${role === 'diffuseur' ? 'bg-cyan-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Diffuseur</button>
            <button type="button" onClick={() => setRole('annonceur')} className={`flex-1 py-2.5 rounded-full text-sm font-semibold transition ${role === 'annonceur' ? 'bg-cyan-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Annonceur</button>
          </div>

          <div>
            <input type="text" required placeholder="Nom complet" value={fullName} onChange={e => setFullName(e.target.value)} className="w-full p-4 bg-slate-950 border border-white/5 rounded-xl focus:border-cyan-500 outline-none transition text-white placeholder-slate-500" />
          </div>
          <div>
            <input type="email" required placeholder="Adresse email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-4 bg-slate-950 border border-white/5 rounded-xl focus:border-cyan-500 outline-none transition text-white placeholder-slate-500" />
          </div>
          <div>
            <input type="password" required placeholder="Mot de passe" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 bg-slate-950 border border-white/5 rounded-xl focus:border-cyan-500 outline-none transition text-white placeholder-slate-500" />
          </div>

          {error && <div className="text-red-400 text-sm text-center bg-red-400/10 py-2 rounded-lg">{error}</div>}

          <button type="submit" disabled={loading} className="w-full py-4 bg-cyan-500 text-white font-bold rounded-xl hover:bg-cyan-400 disabled:opacity-50 transition">
            {loading ? 'Création...' : "S'inscrire"}
          </button>
        </form>
        
        <p className="text-center text-sm text-slate-400 mt-8">
          Déjà un compte ? <Link href="/login" className="text-cyan-400 font-medium hover:underline">Se connecter</Link>
        </p>
      </div>
    </main>
  )
}
