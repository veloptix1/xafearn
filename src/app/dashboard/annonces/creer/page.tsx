'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const paysAfrique = [
  { code: '', nom: 'Tous les pays (Mondial)' },
  { code: 'CM', nom: 'Cameroun' }, { code: 'CI', nom: "Côte d'Ivoire" }, { code: 'SN', nom: 'Sénégal' },
  { code: 'GA', nom: 'Gabon' }, { code: 'CG', nom: 'Congo' }, { code: 'CD', nom: 'RD Congo' },
  { code: 'BJ', nom: 'Bénin' }, { code: 'BF', nom: 'Burkina Faso' }, { code: 'ML', nom: 'Mali' },
  { code: 'TG', nom: 'Togo' }, { code: 'NE', nom: 'Niger' }, { code: 'TD', nom: 'Tchad' },
]

export default function CreerAnnoncePage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [sector, setSector] = useState('')
  const [country, setCountry] = useState('') // Par défaut : Mondial (vide)
  const [city, setCity] = useState('')
  const [neighborhood, setNeighborhood] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [views, setViews] = useState('1000')
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [isFlash, setIsFlash] = useState(false)

  // Durée fixée à 7 jours par défaut, non modifiable
  const duration = 7
  const budget = (parseInt(views) || 0) * 1.92

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random()}.${fileExt}`
    
    const { error: uploadError } = await supabase.storage.from('campaign-images').upload(fileName, file)
    if (uploadError) {
      setError('Erreur lors de l\'upload de l\'image.')
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('campaign-images').getPublicUrl(fileName)
    setImageUrl(publicUrl)
    setUploading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!acceptTerms) return setError('Tu dois accepter les conditions.')
    if (!imageUrl) return setError('Veuillez ajouter une image.')
    if (parseInt(views) < 300) return setError('Le nombre de vues minimum est de 300.')

    setLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.push('/login')

    const { error: insertError } = await supabase.from('campaigns').insert({
      user_id: user.id,
      title, description, image_url: imageUrl,
      price: parseFloat(price) || 0,
      activity_sector: sector,
      target_country: country,
      target_city: city,
      target_neighborhood: neighborhood,
      whatsapp_number: whatsapp,
      views_purchased: parseInt(views),
      budget: budget,
      duration_days: duration,
      status: 'pending',
      is_flash: isFlash,
      expires_at: isFlash ? new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() : null
    })

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setTimeout(() => router.push('/dashboard/annonces'), 3000)
  }

  if (success) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center bg-white border border-slate-200 p-10 rounded-3xl max-w-md shadow-sm">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className="text-2xl font-bold mb-2 text-slate-900">Campagne soumise !</h2>
          <p className="text-slate-500 text-sm">Elle est en attente de validation par l'administration.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex items-center gap-4">
        <Link href="/dashboard/annonces" className="text-slate-500 hover:text-slate-900 bg-slate-100 p-2 rounded-full">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-lg font-bold text-slate-900">Créer une campagne</h1>
      </header>

      <div className="p-4 md:p-8 max-w-2xl mx-auto mt-4">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* SECTION 1 : CONTENU */}
          <section className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center text-xs">1</span>
              Contenu
            </h2>
            <div className="space-y-4">
              <input type="text" required placeholder="Titre de l'annonce" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900" />
              <textarea required rows={3} placeholder="Description détaillée..." value={description} onChange={e => setDescription(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900 resize-none" />
              
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:bg-slate-50 transition relative">
                <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                {imageUrl ? (
                  <img src={imageUrl} alt="Aperçu" className="max-h-40 mx-auto rounded-lg object-contain" />
                ) : (
                  <div className="py-4">
                    <svg className="w-8 h-8 text-slate-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <p className="text-sm text-slate-500 font-medium">Ajouter une image</p>
                  </div>
                )}
              </div>
              {uploading && <p className="text-sm text-sky-500">Upload en cours...</p>}
            </div>
          </section>

          {/* SECTION 2 : DÉTAILS */}
          <section className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center text-xs">2</span>
              Détails de l'offre
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <input type="number" placeholder="Prix (FCFA)" value={price} onChange={e => setPrice(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900" />
              <select required value={sector} onChange={e => setSector(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900">
                <option value="" disabled>Secteur d'activité</option>
                <option value="commerce">Commerce</option>
                <option value="restauration">Restauration</option>
                <option value="mode">Mode</option>
                <option value="tech">Tech</option>
                <option value="sante">Santé</option>
              </select>
              <div className="col-span-2">
                <input type="tel" required placeholder="Numéro WhatsApp" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900" />
              </div>
            </div>
          </section>

          {/* SECTION 3 : CIBLAGE */}
          <section className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center text-xs">3</span>
              Ciblage géographique
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <select value={country} onChange={e => setCountry(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900">
                {paysAfrique.map(p => <option key={p.code} value={p.code}>{p.nom}</option>)}
              </select>
              <input type="text" placeholder="Ville (optionnel)" value={city} onChange={e => setCity(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900" />
              <input type="text" placeholder="Quartier (optionnel)" value={neighborhood} onChange={e => setNeighborhood(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900" />
            </div>
            <p className="text-xs text-slate-500 mt-2">Laissez "Tous les pays" pour cibler le monde entier.</p>
          </section>

          {/* SECTION 4 : BUDGET */}
          <section className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center text-xs">4</span>
              Paramètres de la campagne
            </h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre de vues souhaitées (min. 300)</label>
              <input 
                type="number" 
                min="300" 
                required 
                value={views} 
                onChange={e => setViews(e.target.value)} 
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900 font-bold" 
              />
            </div>
            
            <label className="flex items-start gap-3 cursor-pointer p-3 border border-rose-200 bg-rose-50 rounded-xl mt-4 mb-4">
              <input type="checkbox" checked={isFlash} onChange={e => setIsFlash(e.target.checked)} className="mt-1 w-4 h-4 accent-rose-500 rounded" />
              <div>
                <p className="text-sm font-bold text-rose-700 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  Mode Flash (Urgence)
                </p>
                <p className="text-xs text-rose-600 mt-0.5">L'annonce expirera dans 2 heures. Les diffuseurs gagnent un bonus x2 pour la rapidité.</p>
              </div>
            </label>

            <div className="bg-sky-50 border border-sky-100 rounded-xl p-4 flex justify-between items-center">
              <div>
                <p className="text-xs text-sky-700 font-medium uppercase tracking-wider">Budget total estimé</p>
                <p className="text-xs text-slate-500">1,92 F / vue • Durée fixe : {isFlash ? '2 heures' : '7 jours'}</p>
              </div>
              <p className="text-2xl font-black text-sky-600">{budget.toLocaleString('fr-FR')} F</p>
            </div>
          </section>

          {/* VALIDATION */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={acceptTerms} onChange={e => setAcceptTerms(e.target.checked)} className="mt-1 w-5 h-5 accent-sky-500 rounded border-slate-300" />
              <span className="text-sm text-slate-600 leading-relaxed">
                J'accepte les <Link href="/conditions" className="text-sky-500 hover:underline">conditions de publicité</Link>. Ma campagne sera soumise à validation.
              </span>
            </label>
          </div>

          {error && <div className="text-red-500 text-sm text-center bg-red-50 border border-red-100 py-3 rounded-xl font-medium">{error}</div>}

          <button type="submit" disabled={loading || uploading} className="w-full py-4 bg-sky-500 text-white font-bold rounded-xl hover:bg-sky-400 disabled:opacity-50 transition shadow-md text-lg">
            {loading ? 'Envoi...' : 'Soumettre la campagne'}
          </button>
        </form>
      </div>
    </main>
  )
}
