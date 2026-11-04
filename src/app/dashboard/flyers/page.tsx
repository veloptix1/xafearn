'use client'
import { useState, useRef } from 'react'
import Link from 'next/link'
import { toPng } from 'html-to-image'

const STYLES = {
  modern: { bg: 'from-slate-900 via-slate-800 to-slate-900', accent: 'text-cyan-400', btn: 'bg-cyan-400 text-slate-900' },
  vibrant: { bg: 'from-orange-500 via-rose-500 to-pink-500', accent: 'text-yellow-300', btn: 'bg-white text-rose-600' },
  fresh: { bg: 'from-emerald-500 via-teal-500 to-cyan-500', accent: 'text-white', btn: 'bg-white text-emerald-700' },
  luxury: { bg: 'from-amber-900 via-yellow-800 to-amber-900', accent: 'text-amber-300', btn: 'bg-amber-300 text-amber-950' },
}

export default function FlyersPage() {
  const flyerRef = useRef<HTMLDivElement>(null)
  const [title, setTitle] = useState('SOLDES EXCEPTIONNELLES')
  const [subtitle, setSubtitle] = useState('-50% sur tout le magasin')
  const [contact, setContact] = useState('WhatsApp: +237 690 00 00 00')
  const [style, setStyle] = useState<keyof typeof STYLES>('modern')
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    if (!flyerRef.current) return
    setDownloading(true)
    try {
      const dataUrl = await toPng(flyerRef.current, { quality: 1, pixelRatio: 3 })
      const link = document.createElement('a')
      link.download = `flyer-xafearn-${Date.now()}.png`
      link.href = dataUrl
      link.click()
    } catch (err) {
      alert('Erreur lors du téléchargement')
    }
    setDownloading(false)
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex items-center gap-4">
        <Link href="/dashboard" className="text-slate-500 hover:text-slate-900 bg-slate-100 p-2 rounded-full">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-lg font-bold text-slate-900">Créateur de Flyers</h1>
      </header>

      <div className="p-4 md:p-8 max-w-lg mx-auto mt-4 space-y-6">
        
        {/* L'affiche (Rendu final) */}
        <div className="flex justify-center">
          <div 
            ref={flyerRef} 
            className={`w-full aspect-square rounded-3xl p-8 flex flex-col justify-between text-center shadow-2xl relative overflow-hidden bg-gradient-to-br ${STYLES[style].bg}`}
            style={{ maxWidth: '400px' }}
          >
            {/* Motif de fond */}
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 2px, transparent 2px)', backgroundSize: '20px 20px' }}></div>
            
            <div className="relative z-10 mt-4">
              <div className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 ${STYLES[style].btn}`}>
                Offre Spéciale
              </div>
              <h1 className="text-4xl font-black text-white leading-tight mb-3 drop-shadow-md">{title}</h1>
              <p className={`text-lg font-bold ${STYLES[style].accent}`}>{subtitle}</p>
            </div>

            <div className="relative z-10 mb-4">
              <div className="bg-white/10 backdrop-blur-md border border-white/20 p-3 rounded-2xl">
                <p className="text-white font-bold text-sm">{contact}</p>
              </div>
              <p className="text-[10px] text-white/50 mt-2 font-medium">Propulsé par XAFERAN</p>
            </div>
          </div>
        </div>

        {/* Formulaire de personnalisation */}
        <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm">
          <h2 className="font-bold text-slate-900 mb-4">Personnalise ton affiche</h2>
          
          <div className="space-y-3 mb-4">
            <input type="text" placeholder="Titre principal" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-none text-slate-900 text-sm font-bold" />
            <input type="text" placeholder="Sous-titre / Réduction" value={subtitle} onChange={e => setSubtitle(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-none text-slate-900 text-sm" />
            <input type="text" placeholder="Contact (WhatsApp/Tel)" value={contact} onChange={e => setContact(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-none text-slate-900 text-sm" />
          </div>

          <div className="mb-5">
            <p className="text-xs font-bold text-slate-500 uppercase mb-2">Couleur de fond</p>
            <div className="grid grid-cols-4 gap-2">
              {(Object.keys(STYLES) as Array<keyof typeof STYLES>).map(s => (
                <button key={s} onClick={() => setStyle(s)} className={`h-12 rounded-xl border-2 transition bg-gradient-to-br ${STYLES[s].bg} ${style === s ? 'border-slate-900 ring-2 ring-offset-2 ring-slate-400' : 'border-transparent'}`}></button>
              ))}
            </div>
          </div>

          <button onClick={handleDownload} disabled={downloading} className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition disabled:opacity-50 flex justify-center items-center gap-2 shadow-md">
            {downloading ? 'Téléchargement...' : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Télécharger en HD
              </>
            )}
          </button>
        </div>

      </div>
    </main>
  )
}
