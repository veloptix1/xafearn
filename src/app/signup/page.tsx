'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const paysAfrique = [
  { code: 'DZ', nom: 'Algérie', indicatif: '+213' },
  { code: 'AO', nom: 'Angola', indicatif: '+244' },
  { code: 'BJ', nom: 'Bénin', indicatif: '+229' },
  { code: 'BW', nom: 'Botswana', indicatif: '+267' },
  { code: 'BF', nom: 'Burkina Faso', indicatif: '+226' },
  { code: 'BI', nom: 'Burundi', indicatif: '+257' },
  { code: 'CM', nom: 'Cameroun', indicatif: '+237' },
  { code: 'CV', nom: 'Cap-Vert', indicatif: '+238' },
  { code: 'KM', nom: 'Comores', indicatif: '+269' },
  { code: 'CI', nom: "Côte d'Ivoire", indicatif: '+225' },
  { code: 'DJ', nom: 'Djibouti', indicatif: '+253' },
  { code: 'EG', nom: 'Égypte', indicatif: '+20' },
  { code: 'ER', nom: 'Érythrée', indicatif: '+291' },
  { code: 'SZ', nom: 'Eswatini', indicatif: '+268' },
  { code: 'ET', nom: 'Éthiopie', indicatif: '+251' },
  { code: 'GA', nom: 'Gabon', indicatif: '+241' },
  { code: 'GM', nom: 'Gambie', indicatif: '+220' },
  { code: 'GH', nom: 'Ghana', indicatif: '+233' },
  { code: 'GN', nom: 'Guinée', indicatif: '+224' },
  { code: 'GQ', nom: 'Guinée équatoriale', indicatif: '+240' },
  { code: 'GW', nom: 'Guinée-Bissau', indicatif: '+245' },
  { code: 'KE', nom: 'Kenya', indicatif: '+254' },
  { code: 'LS', nom: 'Lesotho', indicatif: '+266' },
  { code: 'LR', nom: 'Liberia', indicatif: '+231' },
  { code: 'LY', nom: 'Libye', indicatif: '+218' },
  { code: 'MG', nom: 'Madagascar', indicatif: '+261' },
  { code: 'MW', nom: 'Malawi', indicatif: '+265' },
  { code: 'ML', nom: 'Mali', indicatif: '+223' },
  { code: 'MA', nom: 'Maroc', indicatif: '+212' },
  { code: 'MU', nom: 'Maurice', indicatif: '+230' },
  { code: 'MR', nom: 'Mauritanie', indicatif: '+222' },
  { code: 'MZ', nom: 'Mozambique', indicatif: '+258' },
  { code: 'NA', nom: 'Namibie', indicatif: '+264' },
  { code: 'NE', nom: 'Niger', indicatif: '+227' },
  { code: 'NG', nom: 'Nigeria', indicatif: '+234' },
  { code: 'UG', nom: 'Ouganda', indicatif: '+256' },
  { code: 'CF', nom: 'République centrafricaine', indicatif: '+236' },
  { code: 'CD', nom: 'République démocratique du Congo', indicatif: '+243' },
  { code: 'CG', nom: 'République du Congo', indicatif: '+242' },
  { code: 'RW', nom: 'Rwanda', indicatif: '+250' },
  { code: 'ST', nom: 'Sao Tomé-et-Principe', indicatif: '+239' },
  { code: 'SN', nom: 'Sénégal', indicatif: '+221' },
  { code: 'SC', nom: 'Seychelles', indicatif: '+248' },
  { code: 'SL', nom: 'Sierra Leone', indicatif: '+232' },
  { code: 'SO', nom: 'Somalie', indicatif: '+252' },
  { code: 'ZA', nom: 'Afrique du Sud', indicatif: '+27' },
  { code: 'SS', nom: 'Soudan du Sud', indicatif: '+211' },
  { code: 'SD', nom: 'Soudan', indicatif: '+249' },
  { code: 'TZ', nom: 'Tanzanie', indicatif: '+255' },
  { code: 'TD', nom: 'Tchad', indicatif: '+235' },
  { code: 'TG', nom: 'Togo', indicatif: '+228' },
  { code: 'TN', nom: 'Tunisie', indicatif: '+216' },
  { code: 'ZM', nom: 'Zambie', indicatif: '+260' },
  { code: 'ZW', nom: 'Zimbabwe', indicatif: '+263' },
]

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [selectedCountry, setSelectedCountry] = useState(paysAfrique.find(p => p.code === 'CM')!)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!acceptTerms) {
      setError('Tu dois accepter les conditions et politiques.')
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
        
        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <input type="text" required placeholder="Nom complet" value={fullName} onChange={e => setFullName(e.target.value)} className="w-full p-4 bg-slate-950 border border-white/5 rounded-xl focus:border-cyan-500 outline-none transition text-white placeholder-slate-500" />
          </div>
          <div>
            <input type="email" required placeholder="Adresse email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-4 bg-slate-950 border border-white/5 rounded-xl focus:border-cyan-500 outline-none transition text-white placeholder-slate-500" />
          </div>

          <div className="flex gap-2">
            <select
              value={selectedCountry.code}
              onChange={(e) => {
                const country = paysAfrique.find(p => p.code === e.target.value)
                if (country) setSelectedCountry(country)
              }}
              className="w-32 p-4 bg-slate-950 border border-white/5 rounded-xl focus:border-cyan-500 outline-none transition text-white text-sm"
            >
              {paysAfrique.map(p => (
                <option key={p.code} value={p.code}>{p.nom} ({p.indicatif})</option>
              ))}
            </select>
            <input
              type="tel"
              required
              placeholder="Numéro de téléphone"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="flex-1 p-4 bg-slate-950 border border-white/5 rounded-xl focus:border-cyan-500 outline-none transition text-white placeholder-slate-500"
            />
          </div>
          <p className="text-xs text-slate-500 px-1 -mt-2">Indicatif : {selectedCountry.indicatif}</p>

          <div>
            <input type="password" required placeholder="Mot de passe" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 bg-slate-950 border border-white/5 rounded-xl focus:border-cyan-500 outline-none transition text-white placeholder-slate-500" />
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={e => setAcceptTerms(e.target.checked)}
              className="mt-1 w-4 h-4 accent-cyan-500"
            />
            <span className="text-sm text-slate-400">
              J'accepte les <Link href="/conditions" className="text-cyan-400 hover:underline">conditions d'utilisation</Link> et la <Link href="/confidentialite" className="text-cyan-400 hover:underline">politique de confidentialité</Link>.
            </span>
          </label>

          {error && <div className="text-red-400 text-sm text-center bg-red-400/10 py-2 rounded-lg">{error}</div>}

          <button type="submit" disabled={loading} className="w-full py-4 bg-cyan-500 text-white font-bold rounded-xl hover:bg-cyan-400 disabled:opacity-50 transition">
            {loading ? 'Création...' : "S'inscrire"}
          </button>
        </form>
        
        <p className="text-center text-sm text-slate-400 mt-6">
          Déjà un compte ? <Link href="/login" className="text-cyan-400 font-medium hover:underline">Se connecter</Link>
        </p>
      </div>
    </main>
  )
}
