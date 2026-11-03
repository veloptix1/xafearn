'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const paysAfrique = [
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
  const [country, setCountry] = useState('CM')
  const [city, setCity] = useState('')
  const [neighborhood, setNeighborhood] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [views, setViews] = useState('1000')
  const [duration, setDuration] = useState('7')
  const [acceptTerms, setAcceptTerms] = useState(false)

  // Calcul du budget (1,92 F par vue)
  const budget = parseFloat(views) * 1.92 || 0

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)

    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random()}.${fileExt}`
    
    const { error: uploadError, data } = await supabase.storage
      .from('campaign-images')
      .upload(fileName, file)

    if (uploadError) {
      setError('Erreur lors de l\'upload de l\'image.')
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('campaign-images')
      .getPublicUrl(fileName)

    setImageUrl(publicUrl)
    setImageFile(file)
    setUploading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!acceptTerms) {
      setError('Tu dois accepter les conditions de publicité.')
      return
    }
    if (!imageUrl) {
      setError('Veuillez ajouter une image pour votre annonce.')
      return
    }

    setLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { error: insertError } = await supabase
      .from('campaigns')
      .insert({
        user_id: user.id,
        title,
        description,
        image_url: imageUrl,
        price: parseFloat(price) || 0,
        activity_sector: sector,
        target_country: country,
        target_city: city,
        target_neighborhood: neighborhood,
        whatsapp_number: whatsapp,
        views_purchased: parseInt(views),
        budget: budget,
        duration_days: parseInt(duration),
        status: 'pending' // En attente de validation
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
          <h2 className="text-2xl font-bold mb-2 text-slate-900">Annonce soumise !</h2>
          <p className="text-slate-500 text-sm">Votre campagne est en attente de validation. Vous serez notifié dès qu'elle sera approuvée.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex items-center gap-4">
        <Link href="/dashboard/annonces" className="text-slate-500 hover:text-slate-900">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-lg font-bold text-slate-900">Créer une campagne</h1>
      </header>

      <div className="p-4 md:p-8 max-w-3xl mx-auto mt-4">
        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Section 1 : Contenu Visuel */}
          <section className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center text-xs">1</span>
              Contenu de l'annonce
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Titre de l'annonce</label>
                <input type="text" required value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Soldes exceptionnelles chez Élégance" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900 placeholder-slate-400" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea required rows={4} value={description} onChange={e => setDescription(e.target.value)} placeholder="Décrivez votre produit ou service en détail..." className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900 placeholder-slate-400 resize-none" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Image de l'annonce</label>
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:bg-slate-50 transition relative">
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  {imageUrl ? (
                    <div className="relative">
                      <img src={imageUrl} alt="Aperçu" className="max-h-48 mx-auto rounded-lg object-cover" />
                      <p className="text-xs text-emerald-600 font-medium mt-2">Image téléchargée avec succès</p>
                    </div>
                  ) : (
                    <div>
                      <svg className="w-10 h-10 text-slate-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      <p className="text-sm text-slate-500 font-medium">Cliquez pour ajouter une image</p>
                      <p className="text-xs text-slate-400 mt-1">JPG, PNG (max 5MB)</p>
                    </div>
                  )}
                </div>
                {uploading && <p className="text-sm text-sky-500 mt-2">Téléchargement en cours...</p>}
              </div>
            </div>
          </section>

          {/* Section 2 : Détails commerciaux */}
          <section className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center text-xs">2</span>
              Détails de l'offre
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Prix (FCFA)</label>
                <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="Ex: 15000" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900 placeholder-slate-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Secteur d'activité</label>
                <select required value={sector} onChange={e => setSector(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900">
                  <option value="" disabled>Sélectionner</option>
                  <option value="commerce">Commerce / Boutique</option>
                  <option value="restauration">Restauration</option>
                  <option value="mode">Mode / Beauté</option>
                  <option value="tech">Tech / Services</option>
                  <option value="immobilier">Immobilier</option>
                  <option value="sante">Santé</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Numéro WhatsApp (pour être contacté)</label>
                <input type="tel" required value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="Ex: +237 690 00 00 00" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900 placeholder-slate-400" />
              </div>
            </div>
          </section>

          {/* Section 3 : Ciblage */}
          <section className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center text-xs">3</span>
              Ciblage géographique
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Pays</label>
                <select value={country} onChange={e => setCountry(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900">
                  {paysAfrique.map(p => (
                    <option key={p.code} value={p.code}>{p.nom}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ville</label>
                <input type="text" required value={city} onChange={e => setCity(e.target.value)} placeholder="Ex: Douala" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900 placeholder-slate-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Quartier (optionnel)</label>
                <input type="text" value={neighborhood} onChange={e => setNeighborhood(e.target.value)} placeholder="Ex: Bonapriso" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900 placeholder-slate-400" />
              </div>
            </div>
          </section>

          {/* Section 4 : Budget et Durée */}
          <section className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center text-xs">4</span>
              Paramètres de la campagne
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre de vues souhaitées</label>
                <select value={views} onChange={e => setViews(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900">
                  <option value="1000">1 000 vues</option>
                  <option value="5000">5 000 vues</option>
                  <option value="10000">10 000 vues</option>
                  <option value="50000">50 000 vues</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Durée de la campagne</label>
                <select value={duration} onChange={e => setDuration(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900">
                  <option value="7">7 jours</option>
                  <option value="14">14 jours</option>
                  <option value="30">30 jours</option>
                </select>
              </div>
            </div>
            
            <div className="bg-sky-50 border border-sky-100 rounded-xl p-4 flex justify-between items-center">
              <div>
                <p className="text-xs text-sky-700 font-medium uppercase tracking-wider">Budget total estimé</p>
                <p className="text-xs text-slate-500">1,92 F / vue</p>
              </div>
              <p className="text-2xl font-black text-sky-600">{budget.toLocaleString('fr-FR')} FCFA</p>
            </div>
          </section>

          {/* Validation */}
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={acceptTerms} onChange={e => setAcceptTerms(e.target.checked)} className="mt-1 w-5 h-5 accent-sky-500 rounded border-slate-300" />
              <span className="text-sm text-slate-600 leading-relaxed">
                J'accepte les <Link href="/conditions" className="text-sky-500 hover:underline">conditions de publicité</Link> de XAFERAN. Je certifie que mon contenu est légal et conforme aux règles. Ma campagne sera soumise à validation avant publication.
              </span>
            </label>
          </div>

          {error && <div className="text-red-500 text-sm text-center bg-red-50 border border-red-100 py-3 rounded-xl font-medium">{error}</div>}

          <button type="submit" disabled={loading || uploading} className="w-full py-4 bg-sky-500 text-white font-bold rounded-xl hover:bg-sky-400 disabled:opacity-50 transition shadow-md text-lg">
            {loading ? 'Envoi en cours...' : 'Soumettre la campagne'}
          </button>
        </form>
      </div>
    </main>
  )
}
