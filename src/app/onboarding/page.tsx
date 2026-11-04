'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [role, setRole] = useState<'diffuseur' | 'annonceur'>('diffuseur')
  const [city, setCity] = useState('')
  const [neighborhood, setNeighborhood] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [activitySector, setActivitySector] = useState('')
  const [businessName, setBusinessName] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        role,
        city,
        neighborhood,
        whatsapp,
        activity_sector: activitySector,
        business_name: businessName,
        is_onboarded: true,
      })
      .eq('id', user.id)

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg bg-white border border-slate-200 p-8 rounded-3xl shadow-sm">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="XAFEARN" className="h-10 w-auto object-contain mx-auto mb-4" />
          <h1 className="text-2xl font-black text-slate-900 mb-2">Finalise ton profil</h1>
          <p className="text-slate-500 text-sm">Ces informations nous aident à personnaliser ton expérience.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Je suis ici pour...</label>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button type="button" onClick={() => setRole('diffuseur')} className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition ${role === 'diffuseur' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500'}`}>Gagner de l'argent</button>
              <button type="button" onClick={() => setRole('annonceur')} className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition ${role === 'annonceur' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500'}`}>Lancer des pubs</button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Ville</label>
              <input type="text" required value={city} onChange={e => setCity(e.target.value)} placeholder="Ex: Douala" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900 placeholder-slate-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Quartier</label>
              <input type="text" required value={neighborhood} onChange={e => setNeighborhood(e.target.value)} placeholder="Ex: Bonapriso" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900 placeholder-slate-400" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Numéro WhatsApp</label>
            <input type="tel" required value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="Ex: 6 90 00 00 00" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900 placeholder-slate-400" />
          </div>

          {role === 'annonceur' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Nom de ton business</label>
                <input type="text" required value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="Ex: Boutique Élégance" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900 placeholder-slate-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Secteur d'activité</label>
                <select required value={activitySector} onChange={e => setActivitySector(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900">
                  <option value="" disabled>Sélectionne un secteur</option>
                  <option value="commerce">Commerce / Boutique</option>
                  <option value="restauration">Restauration / Alimentaire</option>
                  <option value="mode">Mode / Beauté</option>
                  <option value="tech">Technologie / Services</option>
                  <option value="immobilier">Immobilier</option>
                  <option value="education">Éducation / Formation</option>
                  <option value="sante">Santé / Bien-être</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
            </>
          )}

          {error && <div className="text-red-500 text-sm text-center bg-red-50 border border-red-100 py-2 rounded-lg">{error}</div>}

          <button type="submit" disabled={loading} className="w-full py-4 bg-sky-500 text-white font-bold rounded-xl hover:bg-sky-400 disabled:opacity-50 transition shadow-sm">
            {loading ? 'Enregistrement...' : 'Terminer'}
          </button>
        </form>
      </div>
    </main>
  )
}
