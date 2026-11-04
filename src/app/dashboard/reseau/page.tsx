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
  const [activeTab, setActiveTab] = useState<'pour-toi' | 'recents' | 'top'>('pour-toi')
  
  // Toast
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' | 'warning' } | null>(null)
  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => setToast({ message, type })

  // Création de post
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newText, setNewText] = useState('')
  const [newImage, setNewImage] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  // Envoi de jetons
  const [activePost, setActivePost] = useState<any>(null)
  const [coinAmount, setCoinAmount] = useState(10)
  const [isSending, setIsSending] = useState(false)
  const [floatingCoins, setFloatingCoins] = useState<{id: number, x: number}[]>([])

  // Commentaires
  const [activeCommentPost, setActiveCommentPost] = useState<any>(null)
  const [comments, setComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState('')
  const [isCommenting, setIsCommenting] = useState(false)

  useEffect(() => {
    loadPosts()
  }, [activeTab])

  async function loadPosts() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.push('/login')

    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(prof)

    let query = supabase.from('posts').select('*, profiles(full_name)')
    
    if (activeTab === 'recents') {
      query = query.order('created_at', { ascending: false })
    } else if (activeTab === 'top') {
      query = query.order('total_coins_received', { ascending: false })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    const { data: p } = await query
    setPosts(p || [])
    setLoading(false)
  }

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
          const MAX_SIZE = 800
          if (width > height && width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE }
          else if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE }
          canvas.width = width; canvas.height = height
          const ctx = canvas.getContext('2d')
          ctx?.drawImage(img, 0, 0, width, height)
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
      loadPosts()
    } catch (err) {
      showToast('Erreur lors de la publication.', 'error')
    }
    setIsUploading(false)
  }

  const handleSendCoins = async () => {
    if (!activePost) return
    if ((profile.coins_balance || 0) < coinAmount) return showToast('Solde de jetons insuffisant.', 'error')
    
    setIsSending(true)
    try {
      // Animation des pièces
      const newCoin = { id: Date.now(), x: Math.random() * 100 - 50 }
      setFloatingCoins(prev => [...prev, newCoin])
      setTimeout(() => setFloatingCoins(prev => prev.filter(c => c.id !== newCoin.id)), 1000)

      await supabase.from('coin_transactions').insert({
        sender_id: profile.id, receiver_id: activePost.user_id, post_id: activePost.id,
        coins_amount: coinAmount, fcfc_value: coinAmount
      })
      await supabase.from('profiles').update({ coins_balance: profile.coins_balance - coinAmount }).eq('id', profile.id)
      setProfile({ ...profile, coins_balance: profile.coins_balance - coinAmount })
      await supabase.from('posts').update({ total_coins_received: (activePost.total_coins_received || 0) + coinAmount }).eq('id', activePost.id)
      await supabase.from('notifications').insert({
        user_id: activePost.user_id, title: 'Jetons reçus ! 🪙',
        message: `Tu as reçu ${coinAmount} jetons de ${profile.full_name}.`, link: '/dashboard/jetons/retirer'
      })
      
      setActivePost(null)
      loadPosts()
    } catch (err) {
      showToast('Erreur lors de l\'envoi.', 'error')
    }
    setIsSending(false)
  }

  const openComments = async (post: any) => {
    setActiveCommentPost(post)
    const { data } = await supabase.from('post_comments').select('*, profiles(full_name)').eq('post_id', post.id).order('created_at', { ascending: true })
    setComments(data || [])
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return
    setIsCommenting(true)
    try {
      await supabase.from('post_comments').insert({
        post_id: activeCommentPost.id, user_id: profile.id, content: newComment.trim()
      })
      setNewComment('')
      const { data } = await supabase.from('post_comments').select('*, profiles(full_name)').eq('post_id', activeCommentPost.id).order('created_at', { ascending: true })
      setComments(data || [])
    } catch (err) {
      showToast('Erreur lors du commentaire.', 'error')
    }
    setIsCommenting(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center">
      <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-white font-medium">Chargement...</p>
    </div>
  )

  return (
    <main className="min-h-screen bg-black text-white relative overflow-hidden">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* HEADER TRANSPARENT (TikTok Style) */}
      <header className="absolute top-0 inset-x-0 z-50 px-4 py-3 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
        <Link href="/dashboard" className="text-white bg-white/20 p-2 rounded-full backdrop-blur-md">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        
        <div className="flex gap-4 text-sm font-bold">
          <button onClick={() => setActiveTab('pour-toi')} className={`transition ${activeTab === 'pour-toi' ? 'text-white border-b-2 border-white pb-1' : 'text-white/50'}`}>Pour toi</button>
          <button onClick={() => setActiveTab('recents')} className={`transition ${activeTab === 'recents' ? 'text-white border-b-2 border-white pb-1' : 'text-white/50'}`}>Récents</button>
          <button onClick={() => setActiveTab('top')} className={`transition ${activeTab === 'top' ? 'text-white border-b-2 border-white pb-1' : 'text-white/50'}`}>Top</button>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/dashboard/jetons/acheter" className="px-3 py-1.5 bg-amber-500 text-black text-xs font-bold rounded-full shadow-lg">+ Acheter</Link>
          <div className="bg-white/20 px-2 py-1.5 rounded-full text-xs font-bold backdrop-blur-md">🪙 {profile?.coins_balance || 0}</div>
        </div>
      </header>

      {/* BOUTON PUBLIER FLOTTANT */}
      <button onClick={() => setIsCreateOpen(true)} className="absolute bottom-24 right-4 z-50 w-12 h-12 bg-sky-500 rounded-full flex items-center justify-center shadow-lg shadow-sky-500/50 hover:scale-110 transition">
        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
      </button>

      {/* FEED VERTICAL PLEIN ÉCRAN */}
      <div className="h-screen overflow-y-scroll snap-y snap-mandatory hide-scrollbar">
        {posts.length === 0 ? (
          <div className="h-screen flex flex-col items-center justify-center text-center p-6">
            <h2 className="text-xl font-bold mb-2">Aucun contenu</h2>
            <p className="text-slate-400 text-sm">Sois le premier à publier !</p>
          </div>
        ) : (
          posts.map(post => (
            <div key={post.id} className="h-screen w-full snap-start relative flex items-center justify-center bg-slate-900">
              
              {/* Image ou Texte */}
              {post.content_type === 'image' && post.image_url ? (
                <div className="relative w-full h-full flex items-center justify-center bg-black">
                  {/* Fond flou pour combler les vides */}
                  <img src={post.image_url} className="absolute inset-0 w-full h-full object-cover blur-xl opacity-50" />
                  {/* Image principale adaptée à l'écran */}
                  <img src={post.image_url} className="relative z-10 w-full h-full object-contain" />
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center p-8 bg-gradient-to-br from-slate-800 to-slate-900">
                  <p className="text-2xl font-bold text-center leading-relaxed">{post.text_content}</p>
                </div>
              )}

              {/* Overlay dégradé pour lisibilité */}
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black via-black/60 to-transparent pointer-events-none"></div>

              {/* Infos Créateur (En bas à gauche) */}
              <div className="absolute bottom-6 left-4 right-20 z-10">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-xs font-bold backdrop-blur-md">
                    {post.profiles?.full_name?.charAt(0)}
                  </div>
                  <p className="font-bold text-md">@{post.profiles?.full_name}</p>
                </div>
                <p className="text-sm text-slate-200 mb-3 line-clamp-2">{post.text_content}</p>
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full w-max backdrop-blur-sm border border-amber-400/20">
                  🪙 {post.total_coins_received || 0} jetons reçus
                </div>
              </div>

              {/* Boutons d'action (À droite) */}
              <div className="absolute bottom-6 right-4 z-10 flex flex-col items-center gap-6">
                {/* Bouton Cadeau */}
                <button onClick={() => { setActivePost(post); setCoinAmount(10); }} className="flex flex-col items-center">
                  <div className="w-11 h-11 bg-amber-500 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/40 hover:scale-110 transition mb-1 relative">
                    <svg className="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                  </div>
                  <span className="text-[10px] font-bold">Soutenir</span>
                </button>

                {/* Bouton Commentaires */}
                <button onClick={() => openComments(post)} className="flex flex-col items-center">
                  <div className="w-11 h-11 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-white/30 transition mb-1">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                  </div>
                  <span className="text-[10px] font-bold">Commenter</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL DE CRÉATION DE POST */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 text-slate-900 animate-in zoom-in-95">
            <h2 className="font-bold text-lg mb-4">Créer une publication</h2>
            <form onSubmit={handleCreatePost} className="space-y-4">
              <textarea placeholder="Quoi de neuf ?" value={newText} onChange={e => setNewText(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none" rows={4} />
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center relative">
                <input type="file" accept="image/*" onChange={e => setNewImage(e.target.files?.[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                {newImage ? <p className="text-sm text-emerald-600 font-medium">Image sélectionnée (compressée)</p> : <p className="text-sm text-slate-500">Ajouter une image</p>}
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

      {/* MODAL DE JETONS */}
      {activePost && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 text-slate-900 animate-in slide-in-from-bottom-10 relative overflow-hidden">
            
            {/* Animation de pièces volantes */}
            {floatingCoins.map(coin => (
              <div key={coin.id} className="absolute bottom-10 left-1/2 text-4xl animate-float-up pointer-events-none" style={{ transform: `translateX(${coin.x}px)` }}>
                🪙
              </div>
            ))}

            <h2 className="text-xl font-bold mb-2 text-center">Soutenir @{activePost.profiles?.full_name}</h2>
            <p className="text-sm text-slate-500 text-center mb-6">Solde : <strong className="text-amber-600">{profile?.coins_balance || 0} jetons</strong></p>
            <div className="space-y-3 mb-6">
              {[10, 50, 100, 500].map(amount => (
                <button key={amount} onClick={() => setCoinAmount(amount)} className={`w-full py-3 rounded-xl font-bold border-2 transition flex items-center justify-center gap-2 ${coinAmount === amount ? 'border-amber-500 bg-amber-50 text-amber-600' : 'border-slate-200 text-slate-600'}`}>
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

      {/* PANNEAU DE COMMENTAIRES */}
      {activeCommentPost && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => setActiveCommentPost(null)}>
          <div className="bg-white w-full max-w-md rounded-t-3xl p-4 text-slate-900 max-h-[70vh] flex flex-col animate-in slide-in-from-bottom" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
              <h3 className="font-bold text-lg">{comments.length} commentaires</h3>
              <button onClick={() => setActiveCommentPost(null)} className="text-slate-400 hover:text-slate-900">✕</button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-4 mb-4">
              {comments.length === 0 ? (
                <p className="text-center text-slate-500 text-sm py-8">Sois le premier à commenter !</p>
              ) : (
                comments.map(c => (
                  <div key={c.id} className="flex gap-3">
                    <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                      {c.profiles?.full_name?.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-500 mb-0.5">{c.profiles?.full_name}</p>
                      <p className="text-sm text-slate-800">{c.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleAddComment} className="flex gap-2">
              <input type="text" placeholder="Ajouter un commentaire..." value={newComment} onChange={e => setNewComment(e.target.value)} className="flex-1 p-3 bg-slate-100 rounded-full text-sm outline-none" />
              <button type="submit" disabled={isCommenting || !newComment.trim()} className="px-4 py-2 bg-sky-500 text-white font-bold text-sm rounded-full disabled:opacity-50">Publier</button>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
