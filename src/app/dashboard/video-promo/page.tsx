'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function VideoPromoPage() {
  const [product, setProduct] = useState('')
  const [price, setPrice] = useState('')
  const [generated, setGenerated] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      setGenerated(true)
      setLoading(false)
    }, 2000)
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex items-center gap-4">
        <Link href="/dashboard" className="text-slate-500 hover:text-slate-900 bg-slate-100 p-2 rounded-full">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-lg font-bold text-slate-900">Vidéo Promo</h1>
      </header>

      <div className="p-4 md:p-8 max-w-lg mx-auto mt-4">
        <div className="bg-gradient-to-br from-fuchsia-600 to-purple-700 rounded-3xl p-6 text-white shadow-lg mb-6">
          <h2 className="text-xl font-bold mb-2">Anime tes statuts</h2>
          <p className="text-fuchsia-100 text-sm mb-4">Génère un visuel animé captivant. Enregistre ton écran et publie-le en story WhatsApp !</p>
          
          <form onSubmit={handleGenerate} className="space-y-3">
            <input type="text" required placeholder="Nom du produit (ex: iPhone 15 Pro)" value={product} onChange={e => setProduct(e.target.value)} className="w-full p-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-fuchsia-200 focus:bg-white/20 outline-none transition" />
            <input type="number" placeholder="Prix (ex: 450000)" value={price} onChange={e => setPrice(e.target.value)} className="w-full p-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-fuchsia-200 focus:bg-white/20 outline-none transition" />
            <button type="submit" disabled={loading} className="w-full py-3 bg-white text-purple-700 font-bold rounded-xl hover:bg-slate-50 transition disabled:opacity-50">
              {loading ? 'Génération...' : 'Générer le visuel animé'}
            </button>
          </form>
        </div>

        {generated && (
          <div className="animate-in fade-in zoom-in-95">
            <div className="aspect-[9/16] w-full max-h-[500px] mx-auto rounded-3xl bg-slate-900 shadow-2xl relative overflow-hidden flex flex-col justify-center items-center text-center p-6">
              {/* Animation de fond (pulse) */}
              <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-600 via-purple-600 to-indigo-600 animate-pulse opacity-80"></div>
              <div className="absolute inset-0 bg-black/20"></div>

              <div className="relative z-10">
                <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <p className="text-white/80 font-bold uppercase tracking-widest text-xs mb-2">Offre Spéciale</p>
                <h1 className="text-4xl font-black text-white leading-tight mb-4">{product || 'Ton Produit'}</h1>
                {price && <p className="text-3xl font-black text-yellow-400 mb-6">{parseInt(price).toLocaleString('fr-FR')} FCFA</p>}
                <div className="bg-white text-purple-700 px-8 py-3 rounded-full font-black text-sm inline-block shadow-lg">
                  Commande maintenant !
                </div>
              </div>
            </div>
            <div className="mt-4 bg-amber-50 border border-amber-200 p-4 rounded-2xl text-center">
              <p className="text-sm text-amber-800 font-bold mb-1">📱 Comment l'utiliser ?</p>
              <p className="text-xs text-amber-700">Active l'enregistreur d'écran de ton téléphone, filme ce visuel animé pendant 5 secondes, et publie la vidéo sur ton statut WhatsApp !</p>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
