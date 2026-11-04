'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'

export default function VideoPromoPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [product, setProduct] = useState('iPhone 15 Pro')
  const [price, setPrice] = useState('450000')
  const [isPlaying, setIsPlaying] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  
  // On utilise une image de démo générique ou celle du produit
  const [imageUrl, setImageUrl] = useState('https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=800&q=80')
  
  const animationRef = useRef<number>(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  // Animation Canvas (Ken Burns Effect)
  useEffect(() => {
    if (!isPlaying || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = imageUrl

    let startTime = performance.now()
    
    const draw = (time: number) => {
      const elapsed = (time - startTime) / 1000
      // L'animation dure 10 secondes en boucle
      const progress = (elapsed % 10) / 10 
      
      // Effet de zoom (de 1.0 à 1.3)
      const scale = 1 + (progress * 0.3)
      
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      // Dessiner l'image avec zoom
      ctx.save()
      ctx.translate(canvas.width / 2, canvas.height / 2)
      ctx.scale(scale, scale)
      ctx.drawImage(img, -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height)
      ctx.restore()

      // Overlay sombre en bas pour le texte
      const gradient = ctx.createLinearGradient(0, canvas.height * 0.5, 0, canvas.height)
      gradient.addColorStop(0, 'rgba(0,0,0,0)')
      gradient.addColorStop(1, 'rgba(0,0,0,0.9)')
      ctx.fillStyle = gradient
      ctx.fillRect(0, canvas.height * 0.5, canvas.width, canvas.height * 0.5)

      // Texte : Prix
      ctx.fillStyle = '#fbbf24'
      ctx.font = 'bold 40px Arial'
      ctx.textAlign = 'center'
      ctx.fillText(`${parseInt(price || '0').toLocaleString('fr-FR')} FCFA`, canvas.width / 2, canvas.height - 120)

      // Texte : Nom du produit
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 32px Arial'
      ctx.fillText(product, canvas.width / 2, canvas.height - 60)

      // Bouton "Commander"
      ctx.fillStyle = '#10b981'
      ctx.beginPath()
      ctx.roundRect(canvas.width / 2 - 100, canvas.height - 40, 200, 30, 15)
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 16px Arial'
      ctx.fillText('Commander maintenant', canvas.width / 2, canvas.height - 19)

      animationRef.current = requestAnimationFrame(draw)
    }

    img.onload = () => {
      animationRef.current = requestAnimationFrame(draw)
    }

    return () => cancelAnimationFrame(animationRef.current)
  }, [isPlaying, imageUrl, product, price])

  // Enregistrement vidéo via MediaRecorder
  const startRecording = () => {
    if (!canvasRef.current) return
    const stream = canvasRef.current.captureStream(30)
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' })
    mediaRecorderRef.current = recorder
    chunksRef.current = []

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `promo-${Date.now()}.webm`
      a.click()
      setIsRecording(false)
      setIsPlaying(false)
    }

    setIsPlaying(true)
    recorder.start()
    setIsRecording(true)

    // On enregistre 6 secondes
    setTimeout(() => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop()
      }
    }, 6000)
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
        
        {/* Zone Canvas (Le rendu) */}
        <div className="bg-slate-900 rounded-3xl overflow-hidden shadow-2xl mb-6 relative aspect-[9/16] max-h-[500px] mx-auto flex justify-center">
          <canvas 
            ref={canvasRef} 
            width={450} 
            height={800} 
            className="w-full h-full object-cover"
          />
          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <button onClick={() => setIsPlaying(true)} className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition">
                <svg className="w-8 h-8 text-slate-900 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
              </button>
            </div>
          )}
        </div>

        {/* Formulaire */}
        <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm mb-6">
          <h2 className="font-bold text-slate-900 mb-4">Paramètres de la vidéo</h2>
          
          <div className="space-y-3 mb-4">
            <input type="text" placeholder="Nom du produit" value={product} onChange={e => setProduct(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-fuchsia-500 outline-none text-slate-900" />
            <input type="number" placeholder="Prix (FCFA)" value={price} onChange={e => setPrice(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-fuchsia-500 outline-none text-slate-900" />
          </div>

          <button 
            onClick={startRecording} 
            disabled={isRecording}
            className={`w-full py-4 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-md ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-fuchsia-600 hover:bg-fuchsia-500'}`}
          >
            {isRecording ? (
              <>
                <div className="w-3 h-3 bg-white rounded-full animate-ping"></div>
                Enregistrement (6s)...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                Générer et télécharger la vidéo (MP4)
              </>
            )}
          </button>
        </div>

        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-sm text-amber-800">
          <p className="font-bold mb-1">💡 Conseil :</p>
          <p>La vidéo générée est au format WebM (lisible sur WhatsApp). La génération prend 6 secondes, ne quitte pas la page.</p>
        </div>

      </div>
    </main>
  )
}
