'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { onUserSignup } from './actions'

const paysAfrique = [
  { code: 'CM', nom: 'Cameroun', indicatif: '+237' },
  { code: 'CI', nom: "Côte d'Ivoire", indicatif: '+225' },
  { code: 'SN', nom: 'Sénégal', indicatif: '+221' },
  { code: 'BF', nom: 'Burkina Faso', indicatif: '+226' },
  { code: 'ML', nom: 'Mali', indicatif: '+223' },
  { code: 'BJ', nom: 'Bénin', indicatif: '+229' },
  { code: 'TG', nom: 'Togo', indicatif: '+228' },
  { code: 'NE', nom: 'Niger', indicatif: '+227' },
  { code: 'TD', nom: 'Tchad', indicatif: '+235' },
  { code: 'GA', nom: 'Gabon', indicatif: '+241' },
  { code: 'CG', nom: 'Congo', indicatif: '+242' },
  { code: 'CD', nom: 'RD Congo', indicatif: '+243' },
  { code: 'GN', nom: 'Guinée', indicatif: '+224' },
]

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()
  const searchParams = useSearchParams()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<'diffuseur' | 'annonceur'>('diffuseur')
  const [selectedCountry, setSelectedCountry] = useState(paysAfrique[0])
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [refCode, setRefCode] = useState<string | null>(null)

  useEffect(() => {
    // Récupérer le code de parrainage depuis l'URL
    const ref = searchParams.get('ref')
    if (ref) setRefCode(ref)
  }, [searchParams])

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!acceptTerms) {
      setError('Tu dois accepter les conditions.')
      return
    }
    setLoading(true)
    setError(null)

    const fullPhone = `${selectedCountry.indicatif}${phone.replace(/\s/g, '')}`

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: fullPhone,
          country: selectedCountry.code,
          role: role,
          referral_code: refCode || null // 🔥 On passe le code parrain ici
        }
      }
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    if (data.user) {
      try {
        await onUserSignup(data.user.id, email, fullName)
        fetch('/api/send-welcome', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, name: fullName })
        }).catch(console.error)
      } catch (err) {
        console.log('Erreur:', err)
      }
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
        <div className="text-center bg-white border border-slate-200 p-10 rounded-3xl max-w-md shadow-sm">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
          </div>
          <h2 className="text-2xl font-bold mb-2 text-slate-900">Vérifie tes emails</h2>
          <p className="text-slate-500 text-sm mb-6">Un lien de confirmation a été envoyé à <strong className="text-slate-900">{email}</strong>. Clique dessus pour activer ton compte.</p>
          <Link href="/login" className="block w-full py-3 bg-sky-500 text-white font-bold rounded-xl hover:bg-sky-400 transition">
            Aller à la connexion
          </Link>
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
          <h1 className="text-2xl font-black text-slate-900 mb-1 text-center">Créer un compte</h1>
          <p className="text-slate-500 text-sm mb-6 text-center">Rejoins XAFEARN et commence à gagner.</p>

          {/* Bannière si un parrain est détecté */}
          {refCode && (
            <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              <p className="text-xs text-emerald-800 font-medium">Tu as été invité par un ami (Code: <strong>{refCode}</strong>).</p>
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button type="button" onClick={() => setRole('diffuseur')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${role === 'diffuseur' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500'}`}>Diffuseur</button>
              <button type="button" onClick={() => setRole('annonceur')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${role === 'annonceur' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500'}`}>Annonceur</button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Nom complet</label>
              <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Jean Dupont" className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900" />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="ton@email.com" className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900" />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Téléphone</label>
              <div className="flex gap-2">
                <select value={selectedCountry.code} onChange={(e) => {
                  const c = paysAfrique.find(p => p.code === e.target.value)
                  if (c) setSelectedCountry(c)
                }} className="w-1/3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900 text-sm">
                  {paysAfrique.map(p => <option key={p.code} value={p.code}>{p.indicatif}</option>)}
                </select>
                <input type="tel" required value={phone} onChange={e => setPhone(e.target.value)} placeholder="6 90 00 00 00" className="w-2/3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Mot de passe</label>
              <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900" />
            </div>

            <label className="flex items-start gap-3 cursor-pointer pt-2">
              <input type="checkbox" checked={acceptTerms} onChange={e => setAcceptTerms(e.target.checked)} className="mt-1 w-4 h-4 accent-sky-500 rounded" />
              <span className="text-xs text-slate-600 leading-relaxed">
                J'accepte les <Link href="/conditions" className="text-sky-500 hover:underline">conditions</Link> et la <Link href="/confidentialite" className="text-sky-500 hover:underline">politique de confidentialité</Link>.
              </span>
            </label>

            {error && <div className="text-red-500 text-sm text-center bg-red-50 p-2 rounded-lg">{error}</div>}

            <button type="submit" disabled={loading} className="w-full py-4 bg-sky-500 text-white font-bold rounded-xl hover:bg-sky-400 disabled:opacity-50 transition shadow-sm">
              {loading ? 'Création...' : "S'inscrire"}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Déjà un compte ? <Link href="/login" className="text-sky-500 font-bold hover:underline">Se connecter</Link>
          </p>
        </div>
      </div>
    </main>
  )
}
