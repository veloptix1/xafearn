'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function StatutIAPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
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

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setToast(null)
    setResult(null)

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product, city, price })
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
      setToast('Texte copié !')
      setTimeout(() => setToast(null), 2000)
    }
  }

  const saveAsCampaign = async () => {
    if (!result || !profile) return
    setSaving(true)

    try {
      // 1. Uploader l'image générée sur Supabase
      const imageRes = await fetch(result.image)
      const blob = await imageRes.blob()
      const fileName = `ai-${Date.now()}.jpg`
      
      const { error: uploadError } = await supabase.storage.from('campaign-images').upload(fileName, blob)
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('campaign-images').getPublicUrl(fileName)

      // 2. Créer la campagne
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

      setToast('Campagne créée avec succès ! En attente de validation.')
    } catch (err: any) {
      setToast('Erreur: ' + err.message)
    }
    setSaving(false)
    setTimeout(() => setToast(null), 4000)
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex items-center gap-4">
        <Link href="/dashboard" className="text-slate-500 hover:text-slate-900 bg-slate-100 p-2 rounded-full">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-lg font-bold text-slate-900">Générateur de Statut IA</h1>
      </header>

      <div className="p-4 md:p-8 max-w-lg mx-auto mt-4">
        {toast && (
          <div className={`fixed top-20 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-2xl text-sm font-bold z-50 ${toast.includes('Erreur') ? 'bg-red-500 text-white' : 'bg-slate-900 text-white'}`}>
            {toast}
          </div>
        )}

        {/* Formulaire */}
        <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-3xl p-6 text-white shadow-lg mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <div>
              <h2 className="font-bold text-lg">L'IA qui vend pour toi</h2>
              <p className="text-purple-200 text-xs">Décris ton produit, l'IA fait le reste.</p>
            </div>
          </div>

          <form onSubmit={handleGenerate} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-purple-200 uppercase mb-1">Que vends-tu ?</label>
              <input type="text" required placeholder="Ex: Sneakers Nike Air Max" value={product} onChange={e => setProduct(e.target.value)} className="w-full p-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300 focus:bg-white/20 outline-none transition" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-purple-200 uppercase mb-1">Ville</label>
                <input type="text" required placeholder="Ex: Douala" value={city} onChange={e => setCity(e.target.value)} className="w-full p-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300 focus:bg-white/20 outline-none transition" />
              </div>
              <div>
                <label className="block text-xs font-bold text-purple-200 uppercase mb-1">Prix (FCFA)</label>
                <input type="number" placeholder="Ex: 15000" value={price} onChange={e => setPrice(e.target.value)} className="w-full p-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300 focus:bg-white/20 outline-none transition" />
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full py-3 bg-white text-purple-700 font-bold rounded-xl hover:bg-slate-50 transition disabled:opacity-50 flex justify-center items-center gap-2 mt-2">
              {loading ? (
                <><div className="w-4 h-4 border-2 border-purple-700 border-t-transparent rounded-full animate-spin"></div> L'IA réfléchit...</>
              ) : (
                '✨ Générer mon statut'
              )}
            </button>
          </form>
        </div>

        {/* Résultat */}
        {result && (
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="h-56 w-full bg-slate-100 relative">
              <img src={result.image} alt="Visuel IA" className="w-full h-full object-cover" />
              <div className="absolute top-3 left-3 bg-purple-500 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-md flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                Généré par IA
              </div>
            </div>
            <div className="p-5">
              <h3 className="font-bold text-slate-900 mb-2">Ton statut est prêt !</h3>
              <div className="bg-slate-50 p-4 rounded-xl text-sm text-slate-700 whitespace-pre-wrap text-xs mb-4 border border-slate-200 h-32 overflow-y-auto">
                {result.text}
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <button onClick={copyText} className="py-2.5 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-slate-800 transition">
                  Copier le texte
                </button>
                <a href={result.image} target="_blank" download="statut-ia.jpg" className="py-2.5 bg-slate-100 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-200 transition text-center">
                  Télécharger l'image
                </a>
              </div>
              <button onClick={saveAsCampaign} disabled={saving} className="w-full py-3 bg-purple-600 text-white font-bold text-sm rounded-xl hover:bg-purple-500 transition disabled:opacity-50 mt-2">
                {saving ? 'Création...' : '🚀 Utiliser pour créer une campagne'}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
