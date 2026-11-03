'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
  { code: 'CF', nom: 'Centrafrique', indicatif: '+236' },
  { code: 'GN', nom: 'Guinée', indicatif: '+224' },
  { code: 'MA', nom: 'Maroc', indicatif: '+212' },
  { code: 'DZ', nom: 'Algérie', indicatif: '+213' },
  { code: 'TN', nom: 'Tunisie', indicatif: '+216' },
  { code: 'NG', nom: 'Nigeria', indicatif: '+234' },
  { code: 'GH', nom: 'Ghana', indicatif: '+233' },
  { code: 'ZA', nom: 'Afrique du Sud', indicatif: '+27' },
]

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [selectedCountry, setSelectedCountry] = useState(paysAfrique[0])
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!acceptTerms) {
      setError('Tu dois accepter les conditions.')
      return
    }
    setLoading(true)
    setError(null)

    const fullPhone = `${selectedCountry.indicatif}${phone.replace(/\s/g, '')}`

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: fullPhone,
          country: selectedCountry.code,
          role: 'diffuseur',
        }
      }
    })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
    }
    setSuccess(true)
    setLoading(false)
    setTimeout(() => router.push('/login'), 3000)
  }

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
        <div className="text-center bg-white border border-slate-200 p-10 rounded-3xl max-w-md shadow-sm">
          <h2 className="text-2xl font-bold mb-4 text-emerald-500">Vérifie tes emails</h2>
          <p className="text-slate-500">Un lien de confirmation a été envoyé à <span className="text-slate-900 font-medium">{email}</span>.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="w-full max-w-md bg-white border border-slate-200 p-8 rounded-3xl shadow-sm">
        <Link href="/" className="block text-center mb-8">
          <img src="/logo.png" alt="XAFERAN" className="h-10 w-auto object-contain mx-auto" />
        </Link>
        
        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <input type="text" required placeholder="Nom complet" value={fullName} onChange={e => setFullName(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none transition text-slate-900 placeholder-slate-400" />
          </div>
          <div>
            <input type="email" required placeholder="Adresse email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none transition text-slate-900 placeholder-slate-400" />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex gap-2">
              <select
                value={selectedCountry.code}
                onChange={(e) => {
                  const country = paysAfrique.find(p => p.code === e.target.value)
                  if (country) setSelectedCountry(country)
                }}
                className="w-1/3 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none transition text-slate-900 text-sm appearance-none"
              >
                {paysAfrique.map(p => (
                  <option key={p.code} value={p.code}>{p.indicatif}</option>
                ))}
              </select>
              <input
                type="tel"
                required
                placeholder="Numéro de téléphone"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-2/3 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none transition text-slate-900 placeholder-slate-400"
              />
            </div>
            <p className="text-xs text-slate-500 pl-1">Pays : {selectedCountry.nom}</p>
          </div>

          <div>
            <input type="password" required placeholder="Mot de passe" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none transition text-slate-900 placeholder-slate-400" />
          </div>

          <label className="flex items-start gap-3 cursor-pointer pt-2">
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={e => setAcceptTerms(e.target.checked)}
              className="mt-1 w-4 h-4 accent-sky-500 rounded border-slate-300"
            />
            <span className="text-sm text-slate-600">
              J'accepte les <Link href="/conditions" className="text-sky-500 hover:underline">conditions</Link> et la <Link href="/confidentialite" className="text-sky-500 hover:underline">politique de confidentialité</Link>.
            </span>
          </label>

          {error && <div className="text-red-500 text-sm text-center bg-red-50 border border-red-100 py-2 rounded-lg">{error}</div>}

          <button type="submit" disabled={loading} className="w-full py-4 bg-sky-500 text-white font-bold rounded-xl hover:bg-sky-400 disabled:opacity-50 transition shadow-sm mt-2">
            {loading ? 'Création...' : "S'inscrire"}
          </button>
        </form>
        
        <p className="text-center text-sm text-slate-500 mt-6">
          Déjà un compte ? <Link href="/login" className="text-sky-500 font-medium hover:underline">Se connecter</Link>
        </p>
      </div>
    </main>
  )
}
