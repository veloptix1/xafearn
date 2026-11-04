'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function StatutIAPage() {
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<{text: string, image: string} | null>(null)
  const [copied, setCopied] = useState(false)

  const generateStatut = () => {
    setGenerating(true)
    // Simulation de l'IA (à remplacer par un appel API OpenAI plus tard)
    setTimeout(() => {
      setResult({
        text: `🔥 ALERTE BON PLAN À DOUALA ! 🔥\n\nDécouvrez notre nouvelle collection exclusive !\n✅ Qualité premium\n✅ Prix imbattables\n\n📲 Cliquez ici pour commander : [TON_LIEN_TRACKING]\n\n⚠️ Ne modifiez pas ce texte pour valider vos gains.`,
        image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=400&q=80'
      })
      setGenerating(false)
    }, 2000)
  }

  const copyText = () => {
    if (result) {
      navigator.clipboard.writeText(result.text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex items-center gap-4">
        <Link href="/dashboard" className="text-slate-500 hover:text-slate-900 bg-slate-100 p-2 rounded-full">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-lg font-bold text-slate-900">Statut Intelligent (IA)</h1>
      </header>

      <div className="p-4 md:p-8 max-w-lg mx-auto mt-4">
        <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-3xl p-6 text-white shadow-lg mb-6">
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <h2 className="text-xl font-bold mb-2">Gagne du temps avec l'IA</h2>
          <p className="text-purple-100 text-sm mb-6">Laisse notre intelligence artificielle créer le statut parfait pour vendre ton produit. Un seul clic suffit.</p>
          <button onClick={generateStatut} disabled={generating} className="w-full py-3 bg-white text-purple-700 font-bold rounded-xl hover:bg-slate-50 transition disabled:opacity-50 flex justify-center items-center gap-2">
            {generating ? (
              <><div className="w-4 h-4 border-2 border-purple-700 border-t-transparent rounded-full animate-spin"></div> Analyse en cours...</>
            ) : (
              '✨ Générer mon statut'
            )}
          </button>
        </div>

        {result && (
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4">
            <div className="h-48 w-full bg-slate-100 relative">
              <img src={result.image} alt="Visuel généré" className="w-full h-full object-cover" />
              <div className="absolute top-2 left-2 bg-purple-500 text-white text-[10px] font-bold px-2 py-1 rounded-md">Généré par l'IA</div>
            </div>
            <div className="p-5">
              <h3 className="font-bold text-slate-900 mb-2">Ton statut est prêt !</h3>
              <div className="bg-slate-50 p-3 rounded-xl text-sm text-slate-700 whitespace-pre-wrap font-mono text-xs mb-4 border border-slate-200">
                {result.text}
              </div>
              <div className="flex gap-2">
                <button onClick={copyText} className="flex-1 py-2.5 bg-sky-500 text-white font-bold text-sm rounded-xl hover:bg-sky-400 transition">
                  {copied ? 'Copié !' : 'Copier le texte'}
                </button>
                <button onClick={() => window.open(result.image, '_blank')} className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-200 transition">
                  Télécharger l'image
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
