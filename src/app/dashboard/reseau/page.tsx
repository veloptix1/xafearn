'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Toast from '@/components/Toast'

export default function ReseauPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [posts, setPosts] = useState<any[]>([])
  
  // Système de toast
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' | 'warning' } | null>(null)
  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => setToast({ message, type })

  // Modal de création de post
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newText, setNewText] = useState('')
  const [newImage, setNewImage] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Modal d'envoi de jetons
  const [activePost, setActivePost] = useState<any>(null)
  const [coinAmount, setCoinAmount] = useState(10)
  const [isSending, setIsSending] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)

      const { data: p } = await supabase
        .from('posts')
        .select('*, profiles(full_name)')
        .order('created_at', { ascending: false })
      
      setPosts(p || [])
      setLoading(false)
    }
    load()
  }, [router, supabase])

  // --- COMPRESSION D'IMAGE AVANT UPLOAD ---
  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = (event) => {
        const img = new Image()
        img.src = event.target?.result as string
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height
          
          // On réduit la taille max à 800px pour économiser l'espace
          const MAX_SIZE = 800
          if (width > height && width > MAX_SIZE) {
            height *= MAX_SIZE / width
            width = MAX_SIZE
          } else if (height > MAX_SIZE) {
            width *= MAX_SIZE / height
            height = MAX_SIZE
          }
          
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          ctx?.drawImage(img, 0, 0, width, height)
          
          // Compression en JPEG qualité 0.7 (très léger)
          canvas.toBlob((blob) => {
            if (blob) resolve(blob)
            else reject(new Error('Erreur compression'))
          }, 'image/jpeg', 0.7)
        }
      }
      reader.onerror = (error) => reject(error)
    })
  }

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newText && !newImage) return showToast('Ajoute du texte ou une image.', 'warning')
    setIsUploading(true)

    try {
      let imageUrl = null

      if (newImage) {
        const compressedBlob = await compressImage(newImage)
        const fileName = `post-${profile.id}-${Date.now()}.jpg`
        
        const { error: uploadError } = await supabase.storage.from('campaign-images').upload(fileName, compressedBlob)
        if (uploadError) throw uploadError
        
        const { data } = supabase.storage.from('campaign-images').getPublicUrl(fileName)
        imageUrl = data.publicUrl
      }

      await supabase.from('posts').insert({
        user_id: profile.id,
        content_type: newImage ? 'image' : 'text',
        text_content: newText,
        image_url: imageUrl
      })

      showToast('Publication réussie !', 'success')
      setIsCreateOpen(false)
      setNewText(''); setNewImage(null)
      window.location.reload()
    } catch (err: any) {
      showToast('Erreur lors de la publication.', 'error')
    }
    setIsUploading(false)
  }

  const handleSendCoins = async () => {
    if (!activePost) return
    if ((profile.coins_balance || 0) < coinAmount) return showToast('Solde de jetons insuffisant.', 'error')
    
    setIsSending(true)
    const fcfcValue = coinAmount // 1 jeton = 1 FCFA

    try {
      // 1. Enregistrer la transaction
      await supabase.from('coin_transactions').insert({
        sender_id: profile.id,
        receiver_id: activePost.user_id,
        post_id: activePost.id,
        coins_amount: coinAmount,
        fcfc_value: fcfcValue
      })

      // 2. Déduire les jetons de l'expéditeur
      await supabase.from('profiles').update({ coins_balance: profile.coins_balance - coinAmount }).eq('id', profile.id)
      setProfile({ ...profile, coins_balance: profile.coins_balance - coinAmount })

      // 3. Mettre à jour le compteur du post
      await supabase.from('posts').update({ total_coins_received: (activePost.total_coins_received || 0) + coinAmount }).eq('id', activePost.id)

      // 4. Notification pour le créateur (la plateforme garde 40% au moment du retrait)
      await supabase.from('notifications').insert({
        user_id: activePost.user_id,
        title: 'Jetons reçus ! 🪙',
        message: `Tu as reçu ${coinAmount} jetons de ${profile.full_name}. Tu peux les convertir en argent réel depuis ton tableau de bord.`,
        link: '/dashboard/jetons/retirer'
      })

      showToast(`Tu as envoyé ${coinAmount} jetons !`, 'success')
      setActivePost(null)
      window.location.reload()
    } catch (err) {
      showToast('Erreur lors de l\'envoi.', 'error')
    }
    setIsSending(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center">
      <div className="w-10 h-10 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin mb-4"></div>
      <p className="text-slate-500 font-medium">Chargement du réseau...</p>
    </div>
  )

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-slate-500 hover:text-slate-900 bg-slate-100 p-2 rounded-full">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <h1 className="text-lg font-bold text-slate-900">XAFEARN Network</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/jetons/acheter" className="px-3 py-1.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-full border border-amber-200">
            + Acheter
          </Link>
          <Link href="/dashboard/jetons/retirer" className="px-3 py-1.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200">
            Convertir
          </Link>
          <div className="flex items-center gap-1 bg-slate-900 text-white px-3 py-1.5 rounded-full">
            <span className="font-black text-xs">🪙 {profile?.coins_balance || 0}</span>
          </div>
        </div>
      </header>

      <div className="p-4 md:p-8 max-w-lg mx-auto mt-4">
        
        {/* Bouton de création de post */}
        <button onClick={() => setIsCreateOpen(true)} className="w-full py-3 bg-sky-500 text-white font-bold rounded-xl mb-6 shadow-sm hover:bg-sky-400 transition flex justify-center items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
          Publier sur le réseau
        </button>

        {/* Feed */}
        <div className="space-y-4">
          {posts.length === 0 ? (
            <div className="bg-white border border-slate-200 p-8 rounded-3xl text-center">
              <p className="text-slate-500">Aucun post pour le moment. Sois le premier à publier !</p>
            </div>
          ) : (
            posts.map(post => (
              <div key={post.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-4 flex items-center gap-3 border-b border-slate-100">
                  <div className="w-10 h-10 bg-sky-100 rounded-full flex items-center justify-center font-bold text-sky-600">
                    {post.profiles?.full_name?.charAt(0)}
                  </div>
                  <p className="font-bold text-slate-900">{post.profiles?.full_name}</p>
                </div>
                
                {post.content_type === 'image' && post.image_url && (
                  <img src={post.image_url} className="w-full max-h-96 object-cover" />
                )}
                
                <div className="p-4">
                  <p className="text-slate-700 text-sm whitespace-pre-wrap">{post.text_content}</p>
                  
                  <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-100">
                    <span className="text-xs font-bold text-amber-600 flex items-center gap-1">
                      🪙 {post.total_coins_received || 0} jetons reçus
                    </span>
                    <button onClick={() => { setActivePost(post); setCoinAmount(10); }} className="px-4 py-2 bg-amber-50 text-amber-600 font-bold text-sm rounded-lg hover:bg-amber-100 transition flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                      Soutenir
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* MODAL DE CRÉATION DE POST */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6">
            <h2 className="font-bold text-lg mb-4">Créer une publication</h2>
            <form onSubmit={handleCreatePost} className="space-y-4">
              <textarea placeholder="Quoi de neuf ?" value={newText} onChange={e => setNewText(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none" rows={4} />
              
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center relative">
                <input type="file" accept="image/*" onChange={e => setNewImage(e.target.files?.[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" ref={fileInputRef} />
                {newImage ? (
                  <p className="text-sm text-emerald-600 font-medium">Image sélectionnée (sera compressée)</p>
                ) : (
                  <p className="text-sm text-slate-500">Ajouter une image (optionnel)</p>
                )}
              </div>

              <div className="flex gap-2">
                <button type="button" onClick={() => setIsCreateOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl">Annuler</button>
                <button type="submit" disabled={isUploading} className="flex-1 py-3 bg-sky-500 text-white font-bold rounded-xl disabled:opacity-50">
                  {isUploading ? 'Publication...' : 'Publier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL D'ENVOI DE JETONS */}
      {activePost && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-6">
            <h2 className="text-xl font-bold mb-2 text-center">Soutenir {activePost.profiles?.full_name}</h2>
            <p className="text-sm text-slate-500 text-center mb-6">Solde : <strong className="text-amber-600">{profile?.coins_balance || 0} jetons</strong></p>

            <div className="space-y-3 mb-6">
              {[10, 50, 100, 500].map(amount => (
                <button 
                  key={amount} 
                  onClick={() => setCoinAmount(amount)}
                  className={`w-full py-3 rounded-xl font-bold border-2 transition flex items-center justify-center gap-2 ${coinAmount === amount ? 'border-amber-500 bg-amber-50 text-amber-600' : 'border-slate-200 text-slate-600'}`}
                >
                  🪙 {amount} Jetons
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button onClick={() => setActivePost(null)} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl">Annuler</button>
              <button onClick={handleSendCoins} disabled={isSending} className="flex-1 py-3 bg-amber-500 text-white font-bold rounded-xl disabled:opacity-50">
                {isSending ? 'Envoi...' : 'Envoyer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
