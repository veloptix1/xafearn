'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function PreuvePinPage() {
  const [pin, setPin] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const generatePin = () => {
    setLoading(true)
    setTimeout(() => {
      const randomPin = Math.floor(100000 + Math.random() * 900000).toString()
      setPin(randomPin)
      setLoading(false)
    }, 1000)
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex items-center gap-4">
        <Link href="/dashboard" className="text-slate-500 hover:text-slate-900 bg-slate-100 p-2 rounded-full">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-lg font-bold text-slate-900">Preuve par Code PIN</h1>
      </header>

      <div className="p-4 md:p-8 max-w-lg mx-auto mt-4">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm mb-6 text-center">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Méthode ultra-rapide</h2>
          <p className="text-sm text-slate-500 mb-6">Plus besoin de vidéo. Génère un code PIN unique et envoie-le à notre robot WhatsApp pour valider instantanément.</p>
          
          {!pin ? (
            <button onClick={generatePin} disabled={loading} className="w-full py-4 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-400 transition shadow-md">
              {loading ? 'Génération...' : 'Générer mon Code PIN'}
            </button>
          ) : (
            <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-2xl">
              <p className="text-xs text-emerald-700 font-bold uppercase tracking-wider mb-2">Ton code secret</p>
              <p className="text-4xl font-black text-emerald-600 tracking-widest mb-4">{pin}</p>
              <a href={`https://wa.me/237600000000?text=VALIDATION%20${pin}`} target="_blank" rel="noopener noreferrer" className="inline-block w-full py-3 bg-[#25D366] text-white font-bold rounded-xl hover:bg-[#128C7E] transition shadow-sm">
                Envoyer au robot WhatsApp
              </a>
              <p className="text-xs text-slate-500 mt-3">Clique sur le bouton vert, ça ouvrira WhatsApp avec le code pré-rempli.</p>
            </div>
          )}
        </div>

        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex gap-3">
          <div className="text-amber-500 shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div>
            <h3 className="font-bold text-amber-800 text-sm">Comment ça marche ?</h3>
            <p className="text-amber-700 text-xs mt-1">Notre robot vérifie que tu as bien publié le statut et valide tes gains automatiquement en quelques secondes.</p>
          </div>
        </div>
      </div>
    </main>
  )
}
