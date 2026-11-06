'use client'

import { useState, useEffect } from 'react'
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
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  
  // 🎨 TOAST
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'warning' | 'info' } | null>(null)
  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  // Formulaire
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [sector, setSector] = useState('')
  const [country, setCountry] = useState('')
  const [city, setCity] = useState('')
  const [neighborhood, setNeighborhood] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [views, setViews] = useState('1000')
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [isFlash, setIsFlash] = useState(false)

  const budget = (parseInt(views) || 0) * 1.92

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')

      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data)
      setWhatsapp(data?.whatsapp || '')
      setCountry(data?.country || 'CM')
      setLoading(false)
    }
    load()
  }, [router, supabase])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) return showToast('L\'image ne doit pas dépasser 5 Mo.', 'error')
    
    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `campaign-${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage.from('campaign-images').upload(fileName, file)
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('campaign-images').getPublicUrl(fileName)
      setImageUrl(publicUrl)
      showToast('Image uploadée !', 'success')
    } catch (err: any) {
      showToast('Erreur upload image : ' + err.message, 'error')
    }
    setUploading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 🛡️ VALIDATIONS
    if (!title.trim() || title.trim().length < 3) return showToast('Le titre doit faire au moins 3 caractères.', 'error')
    if (!description.trim() || description.trim().length < 10) return showToast('La description doit être plus détaillée.', 'error')
    if (!imageUrl) return showToast('Veuillez ajouter une image.', 'error')
    if (parseInt(views) < 300) return showToast('Le nombre de vues minimum est de 300.', 'error')
    if (!whatsapp || !/^[0-9+]{8,15}$/.test(whatsapp.replace(/\s/g, ''))) return showToast('Numéro WhatsApp invalide.', 'error')
    if (!acceptTerms) return showToast('Tu dois accepter les conditions.', 'error')
    
    // 🛡️ VÉRIFICATION DU SOLDE
    if ((profile?.balance || 0) < budget) {
      return showToast(`Solde insuffisant. Il te faut ${budget.toLocaleString('fr-FR')} FCFA, tu as ${(profile?.balance || 0).toLocaleString('fr-FR')} FCFA.`, 'error')
    }

    setSubmitting(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Non connecté')

      // 1. Création de la campagne
      const { error: campaignError } = await supabase.from('campaigns').insert({
        user_id: user.id,
        title: title.trim(),
        description: description.trim(),
        image_url: imageUrl,
        price: parseFloat(price) || 0,
        sector,
        country,
        city,
        neighborhood,
        whatsapp: whatsapp.replace(/\s/g, ''),
        views_purchased: parseInt(views),
        budget: budget,
        is_flash: isFlash,
        status: 'pending',
        expires_at: isFlash ? new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() : null,
      })

      if (campaignError) throw campaignError

      // 2. Déduction du solde
      const { error: balanceError } = await supabase.from('profiles').update({
        balance: (profile.balance || 0) - budget
      }).eq('id', user.id)

      if (balanceError) throw balanceError

      // 3. Notification
      await supabase.from('notifications').insert({
        user_id: user.id,
        title: 'Campagne créée 📢',
        message: `Ta campagne "${title}" est en attente de validation.`,
        link: '/dashboard/annonces'
      })

      showToast('Campagne créée avec succès !', 'success')
      setTimeout(() => router.push('/dashboard/annonces'), 1500)
    } catch (err: any) {
      showToast('Erreur : ' + err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
      <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin mb-4"></div>
      <p className="text-slate-500 font-medium text-sm">Chargement...</p>
    </div>
  )

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      {/* 🎨 TOAST */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[200] px-4 py-3 rounded-xl shadow-lg text-white text-sm font-bold flex items-center gap-2 w-[90%] max-w-sm animate-in slide-in-from-top duration-300 ${
          toast.type === 'success' ? 'bg-gradient-to-r from-emerald-500 to-green-500' : 
          toast.type === 'error' ? 'bg-gradient-to-r from-red-500 to-rose-500' : 
          toast.type === 'warning' ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 
          'bg-gradient-to-r from-slate-800 to-slate-900'
        }`}>
          {toast.type === 'success' && <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>}
          {toast.type === 'error' && <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          {toast.type === 'warning' && <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
          {toast.type === 'info' && <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          <span className="flex-1 leading-tight">{toast.message}</span>
        </div>
      )}

      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 px-5 py-4 sticky top-0 z-50 flex items-center gap-3">
        <Link href="/dashboard/annonces" className="text-slate-500 hover:text-slate-900 bg-slate-100 p-2 rounded-full active:bg-slate-200 transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-lg font-black text-slate-900">Créer une campagne</h1>
      </header>

      <div className="p-4 max-w-lg mx-auto mt-2">
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* SECTION 1 : CONTENU */}
          <section className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm">
            <h2 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center text-[10px]">1</span>
              Contenu
            </h2>
            <div className="space-y-3">
              <input type="text" required placeholder="Titre de l'annonce" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900 text-sm" />
              <textarea required rows={3} placeholder="Description détaillée..." value={description} onChange={e => setDescription(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900 resize-none text-sm" />
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center relative">
                <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                {imageUrl ? (
                  <img src={imageUrl} alt="Aperçu" className="max-h-40 mx-auto rounded-lg object-contain" />
                ) : (
                  <div className="py-2">
                    <svg className="w-8 h-8 text-slate-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <p className="text-xs text-slate-500 font-medium">{uploading ? 'Envoi...' : 'Ajouter une image (max 5 Mo)'}</p>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* SECTION 2 : DÉTAILS */}
          <section className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm">
            <h2 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center text-[10px]">2</span>
              Détails
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <input type="number" placeholder="Prix (FCFA)" value={price} onChange={e => setPrice(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900 text-sm" />
              <select required value={sector} onChange={e => setSector(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900 text-sm">
                <option value="" disabled>Secteur</option>
                <option value="commerce">Commerce</option>
                <option value="restauration">Restauration</option>
                <option value="mode">Mode</option>
                <option value="tech">Tech</option>
                <option value="sante">Santé</option>
              </select>
              <div className="col-span-2">
                <input type="tel" required placeholder="Numéro WhatsApp" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900 text-sm" />
              </div>
            </div>
          </section>

          {/* SECTION 3 : CIBLAGE */}
          <section className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm">
            <h2 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center text-[10px]">3</span>
              Ciblage
            </h2>
            <div className="space-y-3">
              <select value={country} onChange={e => setCountry(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900 text-sm">
                {paysAfrique.map(p => <option key={p.code} value={p.code}>{p.nom}</option>)}
              </select>
              <input type="text" placeholder="Ville (optionnel)" value={city} onChange={e => setCity(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900 text-sm" />
              <input type="text" placeholder="Quartier (optionnel)" value={neighborhood} onChange={e => setNeighborhood(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900 text-sm" />
            </div>
          </section>

          {/* SECTION 4 : BUDGET */}
          <section className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm">
            <h2 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center text-[10px]">4</span>
              Paramètres
            </h2>
            <div className="mb-3">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Vues souhaitées (min. 300)</label>
              <input type="number" min="300" required value={views} onChange={e => setViews(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900 font-bold text-sm" />
            </div>

            <label className="flex items-start gap-3 cursor-pointer p-3 border border-rose-200 bg-rose-50 rounded-xl mb-3">
              <input type="checkbox" checked={isFlash} onChange={e => setIsFlash(e.target.checked)} className="mt-0.5 w-4 h-4 accent-rose-500 rounded" />
              <div>
                <p className="text-xs font-bold text-rose-700 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  Mode Flash
                </p>
                <p className="text-[10px] text-rose-600 mt-0.5">Expire dans 2 heures.</p>
              </div>
            </label>

            <div className="bg-sky-50 border border-sky-100 rounded-xl p-4 flex justify-between items-center">
              <div>
                <p className="text-[10px] text-sky-700 font-bold uppercase tracking-wider">Budget total</p>
                <p className="text-[10px] text-slate-500">1,92 F / vue</p>
              </div>
              <p className="text-xl font-black text-sky-600">{budget.toLocaleString('fr-FR')} F</p>
            </div>

            <div className="mt-3 text-[10px] text-slate-500 flex justify-between">
              <span>Ton solde :</span>
              <span className="font-bold text-slate-700">{(profile?.balance || 0).toLocaleString('fr-FR')} F</span>
            </div>
          </section>

          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={acceptTerms} onChange={e => setAcceptTerms(e.target.checked)} className="mt-0.5 w-5 h-5 accent-sky-500 rounded border-slate-300" />
              <span className="text-xs text-slate-600 leading-relaxed">
                J'accepte les <Link href="/conditions" className="text-sky-500 font-bold">conditions</Link>.
              </span>
            </label>
          </div>

          <button type="submit" disabled={uploading || submitting} className="w-full py-4 bg-sky-500 text-white font-bold rounded-2xl active:scale-95 disabled:opacity-50 transition shadow-lg shadow-sky-500/30">
            {submitting ? 'Création en cours...' : `Payer ${budget.toLocaleString('fr-FR')} F et créer`}
          </button>
        </form>
      </div>
    </main>
  )
}
