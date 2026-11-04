'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const LOADING_MESSAGES = [
  'Analyse de ton produit...',
  'Rédaction d\'un texte vendeur...',
  'Génération du visuel publicitaire...',
  'Optimisation pour WhatsApp...',
]

export default function StatutIAPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0])
  const [toast, setToast] = useState<string | null>(null)
  
  const [profile, setProfile] = useState<any>(null)
  const [product, setProduct] = useState('')
  const [city, setCity] = useState('')
  const [price, setPrice] = useState('')
  const [result, setResult] = useState<{text: string, image: string} | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        setProfile(data)
        setCity(data.city || '')
      }
    }
    load()
  }, [supabase])

  // Animation des messages de chargement
  useEffect(() => {
    if (loading) {
      let i = 0
      const interval = setInterval(() => {
        i = (i + 1) % LOADING_MESSAGES.length
        setLoadingMsg(LOADING_MESSAGES[i])
      }, 1500)
      return () => clearInterval(interval)
    }
  }, [loading])

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setToast(null)
    setResult(null)

    // Générer un faux lien de tracking pour l'exemple (à remplacer par le vrai plus tard)
    const fakeTrackingLink = `https://xafearn-weld.vercel.app/track/${Math.random().toString(36).substring(2, 10)}`

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product, city, price, trackingLink: fakeTrackingLink })
      })
      const data = await res.json()
      
      if (res.ok) {
        setResult({ text: data.text, image: data.image })
      } else {
        setToast(data.error || 'Erreur lors de la génération')
      }
    } catch (err) {
      setToast('Erreur réseau')
    }
    setLoading(false)
  }

  const copyText = () => {
    if (result) {
      navigator.clipboard.writeText(result.text)
      setToast('Texte copié avec succès !')
      setTimeout(() => setToast(null), 2500)
    }
  }

  const saveAsCampaign = async () => {
    if (!result || !profile) return
    setSaving(true)

    try {
      const imageRes = await fetch(result.image)
      const blob = await imageRes.blob()
      const fileName = `ai-${Date.now()}.jpg`
      
      const { error: uploadError } = await supabase.storage.from('campaign-images').upload(fileName, blob)
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('campaign-images').getPublicUrl(fileName)

      const { error: insertError } = await supabase.from('campaigns').insert({
        user_id: profile.id,
        title: product,
        description: result.text,
        image_url: publicUrl,
        price: parseFloat(price) || 0,
        target_country: profile.country || 'CM',
        target_city: city,
        whatsapp_number: profile.whatsapp || profile.phone || '',
        views_purchased: 1000,
        budget: 1920,
        duration_days: 7,
        status: 'pending'
      })

      if (insertError) throw insertError

      setToast('Campagne créée avec succès !')
    } catch (err: any) {
      setToast('Erreur: ' + err.message)
    }
    setSaving(false)
    setTimeout(() => setToast(null), 4000)
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex items-center gap-4">
        <Link href="/dashboard" className="text-slate-500 hover:text-slate-900 bg-slate-100 p-2 rounded-full">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-lg font-black text-slate-900">Studio IA</h1>
      </header>

      <div className="p-4 md:p-8 max-w-lg mx-auto mt-2">
        {toast && (
          <div className={`fixed top-20 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-2xl text-sm font-bold z-[100] animate-in slide-in-from-top-2 ${toast.includes('Erreur') ? 'bg-red-500 text-white' : 'bg-slate-900 text-white'}`}>
            {toast}
          </div>
        )}

        {/* Formulaire */}
        <div className="relative bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 rounded-3xl p-6 text-white shadow-xl overflow-hidden mb-6">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-2xl transform translate-x-10 -translate-y-10"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <div>
                <h2 className="font-black text-xl tracking-tight">Studio de Création</h2>
                <p className="text-indigo-100 text-xs font-medium">L'IA qui génère tes pubs.</p>
              </div>
            </div>

            <form onSubmit={handleGenerate} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-indigo-200 uppercase tracking-wider mb-1">Que vends-tu ?</label>
                <input type="text" required placeholder="Ex: Chaussures en cuir" value={product} onChange={e => setProduct(e.target.value)} className="w-full p-3.5 bg-black/20 border border-white/20 rounded-xl text-white placeholder-indigo-200 focus:bg-black/40 outline-none transition font-medium" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-indigo-200 uppercase tracking-wider mb-1">Ville</label>
                  <input type="text" required placeholder="Ex: Yaoundé" value={city} onChange={e => setCity(e.target.value)} className="w-full p-3.5 bg-black/20 border border-white/20 rounded-xl text-white placeholder-indigo-200 focus:bg-black/40 outline-none transition font-medium" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-indigo-200 uppercase tracking-wider mb-1">Prix (FCFA)</label>
                  <input type="number" placeholder="Ex: 15000" value={price} onChange={e => setPrice(e.target.value)} className="w-full p-3.5 bg-black/20 border border-white/20 rounded-xl text-white placeholder-indigo-200 focus:bg-black/40 outline-none transition font-medium" />
                </div>
              </div>
              <button type="submit" disabled={loading} className="w-full py-4 bg-white text-indigo-700 font-black rounded-xl hover:bg-slate-50 transition disabled:opacity-50 flex justify-center items-center gap-2 mt-2 shadow-lg">
                {loading ? (
                  <><div className="w-4 h-4 border-2 border-indigo-700 border-t-transparent rounded-full animate-spin"></div> {loadingMsg}</>
                ) : (
                  '✨ Générer mon visuel'
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Résultat */}
        {result && (
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-500">
            <div className="relative h-64 w-full group">
              <img src={result.image} alt="Visuel IA" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition"></div>
              <div className="absolute top-3 left-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-md flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                Généré par IA
              </div>
            </div>
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-black text-slate-900 text-lg">Prêt à publier !</h3>
                <button onClick={handleGenerate} disabled={loading} className="text-xs font-bold text-sky-500 hover:text-sky-700 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  Régénérer
                </button>
              </div>
              
              <div className="bg-slate-50 p-4 rounded-xl text-sm text-slate-700 whitespace-pre-wrap font-medium mb-4 border border-slate-200 h-36 overflow-y-auto">
                {result.text}
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <button onClick={copyText} className="py-3 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-slate-800 transition flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  Copier
                </button>
                <a href={result.image} target="_blank" download="statut-ia.jpg" className="py-3 bg-slate-100 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-200 transition flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Image
                </a>
              </div>

              <button onClick={saveAsCampaign} disabled={saving} className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-sm rounded-xl hover:from-emerald-400 hover:to-teal-400 transition disabled:opacity-50 shadow-md flex items-center justify-center gap-2">
                {saving ? 'Création...' : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    Utiliser pour une campagne
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
