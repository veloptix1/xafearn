'use client'
import { useState, useRef } from 'react'
import Link from 'next/link'
import { toPng } from 'html-to-image'
import { createClient } from '@/lib/supabase/client'
import { Rnd } from 'react-rnd'

type TextItem = {
  id: string
  text: string
  x: number
  y: number
  width: number
  height: number
  fontSize: number
  color: string
  fontWeight: string
}

export default function FlyersPage() {
  const canvasRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  const [bgColor, setBgColor] = useState('#0f172a')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [items, setItems] = useState<TextItem[]>([
    { id: '1', text: 'SOLDES EXCEPTIONNELLES', x: 50, y: 50, width: 300, height: 60, fontSize: 32, color: '#ffffff', fontWeight: '900' },
    { id: '2', text: '-50% sur tout le magasin', x: 50, y: 120, width: 250, height: 40, fontSize: 18, color: '#fbbf24', fontWeight: '700' },
  ])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [uploading, setUploading] = useState(false)

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const fileName = `flyer-bg-${Date.now()}.jpg`
    const { error } = await supabase.storage.from('campaign-images').upload(fileName, file)
    if (!error) {
      const { data } = supabase.storage.from('campaign-images').getPublicUrl(fileName)
      setImageUrl(data.publicUrl)
    }
    setUploading(false)
  }

  const addText = () => {
    const newItem: TextItem = {
      id: Date.now().toString(),
      text: 'Nouveau texte',
      x: 100,
      y: 100,
      width: 200,
      height: 40,
      fontSize: 20,
      color: '#ffffff',
      fontWeight: '700',
    }
    setItems([...items, newItem])
    setSelectedId(newItem.id)
  }

  const updateItem = (id: string, updates: Partial<TextItem>) => {
    setItems(items.map(item => item.id === id ? { ...item, ...updates } : item))
  }

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  const handleDownload = async () => {
    if (!canvasRef.current) return
    setDownloading(true)
    setSelectedId(null)
    try {
      await new Promise(r => setTimeout(r, 100))
      const dataUrl = await toPng(canvasRef.current, { quality: 1, pixelRatio: 3 })
      const link = document.createElement('a')
      link.download = `flyer-${Date.now()}.png`
      link.href = dataUrl
      link.click()
    } catch (err) {
      alert('Erreur lors du téléchargement')
    }
    setDownloading(false)
  }

  const selectedItem = items.find(i => i.id === selectedId)

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-slate-500 hover:text-slate-900 bg-slate-100 p-2 rounded-full">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <h1 className="text-lg font-bold text-slate-900">Studio Flyers</h1>
        </div>
        <button onClick={handleDownload} disabled={downloading} className="px-4 py-2 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 transition">
          {downloading ? '...' : 'Télécharger'}
        </button>
      </header>

      <div className="p-4 md:p-8 max-w-4xl mx-auto mt-2 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Zone de dessin (Canevas) */}
        <div className="lg:col-span-2 flex justify-center">
          <div 
            ref={canvasRef} 
            className="relative w-full aspect-square rounded-2xl overflow-hidden shadow-2xl bg-white border border-slate-300"
            style={{ maxWidth: '450px', backgroundColor: bgColor }}
            onClick={() => setSelectedId(null)}
          >
            {imageUrl && (
              <img src={imageUrl} alt="Fond" className="absolute inset-0 w-full h-full object-cover opacity-80 pointer-events-none" />
            )}
            
            {items.map((item) => (
              <Rnd
                key={item.id}
                size={{ width: item.width, height: item.height }}
                position={{ x: item.x, y: item.y }}
                onDragStop={(e, d) => updateItem(item.id, { x: d.x, y: d.y })}
                onResizeStop={(e, direction, ref, delta, position) => {
                  updateItem(item.id, {
                    width: parseInt(ref.style.width),
                    height: parseInt(ref.style.height),
                    ...position
                  })
                }}
                bounds="parent"
                onClick={(e: React.MouseEvent) => { e.stopPropagation(); setSelectedId(item.id) }}
                className={`flex items-center justify-center ${selectedId === item.id ? 'border-2 border-dashed border-sky-500 bg-sky-500/10' : ''}`}
              >
                <textarea
                  value={item.text}
                  onChange={(e) => updateItem(item.id, { text: e.target.value })}
                  className="w-full h-full bg-transparent resize-none outline-none text-center overflow-hidden leading-tight"
                  style={{ 
                    fontSize: `${item.fontSize}px`, 
                    color: item.color, 
                    fontWeight: item.fontWeight,
                    textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                  }}
                />
              </Rnd>
            ))}
          </div>
        </div>

        {/* Panneau de contrôle */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
            <h2 className="font-bold text-slate-900 mb-3 text-sm">Fond</h2>
            <label className="block w-full cursor-pointer bg-slate-50 border border-slate-200 hover:border-sky-500 rounded-lg p-2 text-center text-xs font-bold text-slate-600 transition mb-2">
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              {uploading ? 'Upload...' : imageUrl ? 'Changer l\'image' : 'Ajouter une image'}
            </label>
            {imageUrl && (
              <button onClick={() => setImageUrl(null)} className="w-full py-1.5 text-xs font-bold text-red-500 bg-red-50 rounded-lg mb-2">Retirer l'image</button>
            )}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Couleur :</span>
              <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
            </div>
          </div>

          <button onClick={addText} className="w-full py-3 bg-sky-500 text-white font-bold rounded-xl hover:bg-sky-400 transition text-sm flex justify-center items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
            Ajouter du texte
          </button>

          {selectedItem && (
            <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm space-y-3 animate-in fade-in">
              <div className="flex justify-between items-center">
                <h2 className="font-bold text-slate-900 text-sm">Éditer le texte</h2>
                <button onClick={() => removeItem(selectedItem.id)} className="text-xs font-bold text-red-500">Supprimer</button>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Taille ({selectedItem.fontSize}px)</label>
                <input type="range" min="10" max="80" value={selectedItem.fontSize} onChange={e => updateItem(selectedItem.id, { fontSize: parseInt(e.target.value) })} className="w-full" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Couleur</label>
                <input type="color" value={selectedItem.color} onChange={e => updateItem(selectedItem.id, { color: e.target.value })} className="w-full h-8 rounded cursor-pointer" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Graisse</label>
                <select value={selectedItem.fontWeight} onChange={e => updateItem(selectedItem.id, { fontWeight: e.target.value })} className="w-full p-2 border border-slate-200 rounded-lg text-sm">
                  <option value="400">Normal</option>
                  <option value="700">Gras</option>
                  <option value="900">Très gras</option>
                </select>
              </div>
            </div>
          )}
        </div>

      </div>
    </main>
  )
}
