'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const LOADING_MESSAGES = [
  'Analyse de ton produit...',
  'Rédaction d\'un texte vendeur...',
  'Génération du visuel publicitaire...',
  'Optimisation pour WhatsApp...',
]

const VIEWS_COUNT = 1000
const PRICE_PER_VIEW = 1.92
const BUDGET = VIEWS_COUNT * PRICE_PER_VIEW
const AI_CREDIT_COST = 1

const TEMPLATES = [
  { id: 'elegant', name: 'Élégant', emoji: '✨', premium: false, color: 'from-purple-500 to-pink-500' },
  { id: 'flash', name: 'Flash', emoji: '⚡', premium: false, color: 'from-amber-500 to-orange-500' },
  { id: 'pro', name: 'Pro', emoji: '💼', premium: false, color: 'from-slate-700 to-slate-900' },
  { id: 'luxe', name: 'Luxe', emoji: '👑', premium: true, color: 'from-yellow-500 to-amber-700' },
  { id: 'fun', name: 'Fun', emoji: '🎉', premium: true, color: 'from-pink-500 to-rose-500' },
  { id: 'minimal', name: 'Minimal', emoji: '⚪', premium: true, color: 'from-slate-400 to-slate-600' },
]

export default function StatutIAPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0])
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null)
  
  const [profile, setProfile] = useState<any>(null)
  const [product, setProduct] = useState('')
  const [city, setCity] = useState('')
  const [price, setPrice] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState('elegant')
  const [result, setResult] = useState<{text: string, image: string, id?: string} | null>(null)
  const [history, setHistory] = useState<any[]>([])
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.push('/login')

    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(prof)
    setCity(prof.city || '')

    const { data: hist } = await supabase.from('ai_generations').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20)
    setHistory(hist || [])

    setLoading(false)
  }

  useEffect(() => {
    if (generating) {
      let i = 0
      const interval = setInterval(() => {
        i = (i + 1) % LOADING_MESSAGES.length
        setLoadingMsg(LOADING_MESSAGES[i])
      }, 1500)
      return () => clearInterval(interval)
    }
  }, [generating])

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return

    // Vérifier les crédits IA
    if ((profile.ai_credits || 0) <= 0) {
      return showToast('Plus de crédits IA. Achète un pack pour continuer.', 'error')
    }

    setGenerating(true)
    setResult(null)

    try {
      // Déduire un crédit IA
      const { data: creditData, error: creditError } = await supabase.rpc('use_ai_credit', { p_user_id: profile.id })
      if (creditError) throw creditError
      if (!creditData.success) throw new Error(creditData.error)

      setProfile({ ...profile, ai_credits: creditData.remaining })

      const fakeTrackingLink = `https://xafearn-weld.vercel.app/track/${Math.random().toString(36).substring(2, 10)}`

      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product, city, price, trackingLink: fakeTrackingLink, template: selectedTemplate })
      })
      const data = await res.json()
      
      if (!res.ok) throw new Error(data.error || 'Erreur génération')

      // Sauvegarder dans l'historique
      const { data: savedGen } = await supabase.from('ai_generations').insert({
        user_id: profile.id,
        product,
        city,
        price: parseFloat(price) || 0,
        generated_text: data.text,
        generated_image: data.image
      }).select().single()

      setResult({ text: data.text, image: data.image, id: savedGen?.id })
      showToast('Visuel généré !', 'success')
    } catch (err: any) {
      showToast(err.message, 'error')
    }
    setGenerating(false)
  }

  const copyText = () => {
    if (result) {
      navigator.clipboard.writeText(result.text)
      showToast('Texte copié !', 'success')
    }
  }

  const saveAsCampaign = async () => {
    if (!result || !profile) return

    if ((profile.balance || 0) < BUDGET) {
      return showToast(`Solde insuffisant. Il te faut ${BUDGET.toLocaleString('fr-FR')} FCFA.`, 'error')
    }

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
        country: profile.country || 'CM',
        city: city,
        whatsapp: profile.whatsapp || profile.phone || '',
        sector: 'commerce',
        views_purchased: VIEWS_COUNT,
        budget: BUDGET,
        duration_days: 7,
        status: 'pending'
      })

      if (insertError) throw insertError

      await supabase.from('profiles').update({
        balance: (profile.balance || 0) - BUDGET
      }).eq('id', profile.id)

      // Marquer comme utilisée
      if (result.id) {
        await supabase.from('ai_generations').update({ used_in_campaign: true }).eq('id', result.id)
      }

      setProfile({ ...profile, balance: (profile.balance || 0) - BUDGET })
      showToast('Campagne créée ! En attente de validation.', 'success')
      setTimeout(() => router.push('/dashboard/annonces'), 1500)
    } catch (err: any) {
      showToast('Erreur: ' + err.message, 'error')
    }
    setSaving(false)
  }

  const canAfford = (profile?.balance || 0) >= BUDGET
  const hasCredits = (profile?.ai_credits || 0) > 0

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin"></div>
    </div>
  )

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-xl shadow-xl text-sm font-bold max-w-[90%] ${
          toast.type === 'success' ? 'bg-emerald-500 text-white' : 
          toast.type === 'error' ? 'bg-red-500 text-white' : 
          'bg-sky-500 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 px-5 py-4 sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-slate-500 hover:text-slate-900 bg-slate-100 p-2 rounded-full active:bg-slate-200 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <h1 className="text-lg font-black text-slate-900">Studio IA</h1>
        </div>
        <button onClick={() => setShowHistory(!showHistory)} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Historique
        </button>
      </header>

      <div className="p-4 max-w-lg mx-auto mt-2 space-y-4">
        
        {/* Crédits IA */}
        <div className="grid grid-cols-2 gap-3">
          <div className={`p-4 rounded-2xl text-center border-2 ${hasCredits ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
            <p className="text-[10px] font-bold uppercase text-slate-500">Crédits IA</p>
            <p className={`text-2xl font-black ${hasCredits ? 'text-emerald-600' : 'text-red-600'}`}>{profile?.ai_credits || 0}</p>
          </div>
          <div className={`p-4 rounded-2xl text-center border-2 ${canAfford ? 'bg-sky-50 border-sky-200' : 'bg-red-50 border-red-200'}`}>
            <p className="text-[10px] font-bold uppercase text-slate-500">Solde</p>
            <p className={`text-2xl font-black ${canAfford ? 'text-sky-600' : 'text-red-600'}`}>{(profile?.balance || 0).toLocaleString('fr-FR')} F</p>
          </div>
        </div>

        {/* Si plus de crédits, proposer achat */}
        {!hasCredits && (
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-4 text-white text-center shadow-lg">
            <p className="font-bold text-sm mb-1">🎁 Plus de crédits IA</p>
            <p className="text-xs text-amber-100 mb-3">Achète un pack pour continuer à générer</p>
            <Link href="/dashboard/jetons/acheter" className="inline-block px-4 py-2 bg-white text-amber-600 text-xs font-bold rounded-xl">
              Acheter des crédits
            </Link>
          </div>
        )}

        {/* Historique */}
        {showHistory && history.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <h3 className="font-bold text-sm mb-3">Historique ({history.length})</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {history.map(h => (
                <button 
                  key={h.id}
                  onClick={() => { setResult({ text: h.generated_text, image: h.generated_image, id: h.id }); setShowHistory(false) }}
                  className="w-full flex items-center gap-3 p-2 rounded-xl active:bg-slate-50 text-left"
                >
                  <img src={h.generated_image} className="w-12 h-12 rounded-lg object-cover shrink-0" alt="" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{h.product}</p>
                    <p className="text-[10px] text-slate-500">{new Date(h.created_at).toLocaleDateString('fr-FR')}</p>
                  </div>
                  {h.used_in_campaign && <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">Utilisée</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Formulaire */}
        <div className="relative bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 rounded-3xl p-5 text-white shadow-xl overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-2xl transform translate-x-10 -translate-y-10"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/30">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <div>
                <h2 className="font-black text-lg">Studio de Création</h2>
                <p className="text-indigo-100 text-[10px]">L'IA qui génère tes pubs</p>
              </div>
            </div>

            <form onSubmit={handleGenerate} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-indigo-200 uppercase mb-1">Que vends-tu ?</label>
                <input type="text" required placeholder="Ex: Chaussures en cuir" value={product} onChange={e => setProduct(e.target.value)} className="w-full p-3 bg-black/20 border border-white/20 rounded-xl text-white placeholder-indigo-200 focus:bg-black/40 outline-none text-sm font-medium" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-indigo-200 uppercase mb-1">Ville</label>
                  <input type="text" required placeholder="Ex: Yaoundé" value={city} onChange={e => setCity(e.target.value)} className="w-full p-3 bg-black/20 border border-white/20 rounded-xl text-white placeholder-indigo-200 focus:bg-black/40 outline-none text-sm font-medium" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-indigo-200 uppercase mb-1">Prix (FCFA)</label>
                  <input type="number" placeholder="Ex: 15000" value={price} onChange={e => setPrice(e.target.value)} className="w-full p-3 bg-black/20 border border-white/20 rounded-xl text-white placeholder-indigo-200 focus:bg-black/40 outline-none text-sm font-medium" />
                </div>
              </div>

              {/* Templates */}
              <div>
                <label className="block text-[10px] font-bold text-indigo-200 uppercase mb-2">Style de visuel</label>
                <div className="grid grid-cols-3 gap-2">
                  {TEMPLATES.map(t => (
                    <button 
                      key={t.id} 
                      type="button" 
                      onClick={() => !t.premium && setSelectedTemplate(t.id)}
                      className={`p-2 rounded-lg text-center transition relative ${selectedTemplate === t.id ? 'ring-2 ring-white bg-white/20' : 'bg-black/20'} ${t.premium ? 'opacity-60' : ''}`}
                    >
                      <div className="text-lg mb-0.5">{t.emoji}</div>
                      <p className="text-[9px] font-bold">{t.name}</p>
                      {t.premium && <span className="absolute top-1 right-1 text-[7px] bg-amber-400 text-amber-900 px-1 rounded">PRO</span>}
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" disabled={generating || !hasCredits} className="w-full py-3.5 bg-white text-indigo-700 font-black rounded-xl active:scale-95 transition disabled:opacity-50 flex justify-center items-center gap-2 shadow-lg">
                {generating ? (
                  <><div className="w-4 h-4 border-2 border-indigo-700 border-t-transparent rounded-full animate-spin"></div> {loadingMsg}</>
                ) : (
                  <>✨ Générer (1 crédit)</>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Résultat */}
        {result && (
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200">
            <div className="relative h-56 w-full">
              <img src={result.image} alt="Visuel IA" className="w-full h-full object-cover" />
              <div className="absolute top-3 left-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-md">
                ✨ Généré par IA
              </div>
            </div>
            <div className="p-5">
              <h3 className="font-black text-slate-900 text-base mb-3">Prêt à publier !</h3>
              
              <div className="bg-slate-50 p-3 rounded-xl text-xs text-slate-700 whitespace-pre-wrap font-medium mb-3 border border-slate-200 h-32 overflow-y-auto">
                {result.text}
              </div>

              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl mb-3 text-center">
                <p className="text-[10px] font-bold text-amber-700 uppercase">Coût de la campagne</p>
                <p className="text-lg font-black text-amber-600">{BUDGET.toLocaleString('fr-FR')} FCFA</p>
                <p className="text-[9px] text-amber-600">{VIEWS_COUNT} vues</p>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <button onClick={copyText} className="py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl active:scale-95 transition">
                  Copier
                </button>
                <a href={result.image} target="_blank" download="statut-ia.jpg" className="py-2.5 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl active:scale-95 transition text-center">
                  Télécharger
                </a>
              </div>

              <button 
                onClick={saveAsCampaign} 
                disabled={saving || !canAfford} 
                className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-sm rounded-xl active:scale-95 transition disabled:opacity-50 shadow-md"
              >
                {saving ? 'Création...' : canAfford ? `Payer ${BUDGET.toLocaleString('fr-FR')} F et publier` : 'Solde insuffisant'}
              </button>
            </div>
          </div>
        )}

      </div>
    </main>
  )
}
