'use client'
import { useState, useRef } from 'react'
import Link from 'next/link'

export default function FlyersPage() {
  const [text, setText] = useState('')
  const [subtext, setSubtext] = useState('')
  const [template, setTemplate] = useState('modern')
  const [generated, setGenerated] = useState(false)
  const [loading, setLoading] = useState(false)
  const flyerRef = useRef<HTMLDivElement>(null)

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      setGenerated(true)
      setLoading(false)
    }, 1500)
  }

  const bgStyles: Record<string, string> = {
    modern: 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900',
    vibrant: 'bg-gradient-to-br from-orange-500 via-rose-500 to-pink-500',
    fresh: 'bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500',
    luxury: 'bg-gradient-to-br from-amber-900 via-yellow-800 to-amber-900',
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex items-center gap-4">
        <Link href="/dashboard" className="text-slate-500 hover:text-slate-900 bg-slate-100 p-2 rounded-full">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-lg font-bold text-slate-900">Créateur de Flyers</h1>
      </header>

      <div className="p-4 md:p-8 max-w-lg mx-auto mt-4">
        <form onSubmit={handleGenerate} className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm mb-6">
          <h2 className="font-bold text-slate-900 mb-4">Crée ton affiche pro</h2>
          
          <div className="space-y-3 mb-4">
            <input type="text" required placeholder="Titre principal (ex: SOLDES -50%)" value={text} onChange={e => setText(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-none text-slate-900" />
            <input type="text" placeholder="Sous-titre (ex: Offre valable jusqu'à dimanche)" value={subtext} onChange={e => setSubtext(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-none text-slate-900" />
            
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase mb-2">Style</p>
              <div className="grid grid-cols-4 gap-2">
                {Object.keys(bgStyles).map(style => (
                  <button key={style} type="button" onClick={() => setTemplate(style)} className={`h-12 rounded-lg border-2 transition ${template === style ? 'border-cyan-500 ring-2 ring-cyan-200' : 'border-transparent'} ${bgStyles[style]}`}></button>
                ))}
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full py-3 bg-cyan-500 text-white font-bold rounded-xl hover:bg-cyan-400 transition disabled:opacity-50">
            {loading ? 'Création...' : 'Générer mon affiche'}
          </button>
        </form>

        {generated && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <div ref={flyerRef} className={`aspect-square w-full rounded-3xl p-8 flex flex-col justify-center items-center text-center shadow-2xl relative overflow-hidden ${bgStyles[template]}`}>
              <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, white 2px, transparent 2px)', backgroundSize: '30px 30px' }}></div>
              
              <h1 className="text-4xl font-black text-white leading-tight mb-4 relative z-10">{text || 'Ton Titre'}</h1>
              {subtext && <p className="text-lg font-medium text-white/90 relative z-10">{subtext}</p>}
              
              <div className="mt-8 bg-white text-slate-900 px-6 py-2 rounded-full font-bold text-sm relative z-10 shadow-lg">
                Contacte-nous sur WhatsApp
              </div>
            </div>

            <div className="mt-4 text-center">
              <p className="text-sm text-slate-500 mb-2">Fais une capture d'écran de l'affiche pour l'enregistrer !</p>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
