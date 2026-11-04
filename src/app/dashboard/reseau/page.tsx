'use client'
import { useState, useEffect } from 'react'
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
  
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' | 'warning' } | null>(null)
  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => setToast({ message, type })

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newText, setNewText] = useState('')
  const [newMedia, setNewMedia] = useState<File | null>(null)
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image')
  const [isUploading, setIsUploading] = useState(false)

  const [activePost, setActivePost] = useState<any>(null)
  const [coinAmount, setCoinAmount] = useState(10)
  const [isSending, setIsSending] = useState(false)

  const [activeCommentPost, setActiveCommentPost] = useState<any>(null)
  const [comments, setComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState('')
  const [isCommenting, setIsCommenting] = useState(false)

  // Modification / Suppression
  const [editingPost, setEditingPost] = useState<any>(null)
  const [editText, setEditText] = useState('')
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

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
    
    if (p && p.length > 0) {
      const postsWithCounts = await Promise.all(p.map(async (post) => {
        const { count } = await supabase
          .from('post_comments')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', post.id)
        return { ...post, comments_count: count || 0 }
      }))
      setPosts(postsWithCounts)
    } else {
      setPosts([])
    }
    setLoading(false)
  }

  // Compression Image
  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = (event) => {
        const img = new Image()
        img.src = event.target?.result as string
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let width = img.width; let height = img.height
          const MAX_SIZE = 800
          if (width > height && width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE }
          else if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE }
          canvas.width = width; canvas.height = height
          const ctx = canvas.getContext('2d')
          ctx?.drawImage(img, 0, 0, width, height)
          canvas.toBlob((blob) => { if (blob) resolve(blob); else reject('Erreur') }, 'image/jpeg', 0.7)
        }
      }
    })
  }

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newText && !newMedia) return showToast('Ajoute du texte ou un média.', 'warning')
    
    // Vérification de la vidéo (25s max)
    if (mediaType === 'video' && newMedia) {
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.onloadedmetadata = async () => {
        window.URL.revokeObjectURL(video.src)
        if (video.duration > 25) {
          return showToast('La vidéo ne doit pas dépasser 25 secondes.', 'error')
        }
        // Si OK, on upload
        await uploadPost()
      }
      video.src = URL.createObjectURL(newMedia)
      return
    }

    await uploadPost()
  }

  const uploadPost = async () => {
    setIsUploading(true)
    try {
      let mediaUrl = null
      if (newMedia) {
        const blob = mediaType === 'image' ? await compressImage(newMedia) : newMedia
        const fileName = `post-${profile.id}-${Date.now()}.${mediaType === 'image' ? 'jpg' : 'mp4'}`
        const { error: uploadError } = await supabase.storage.from('campaign-images').upload(fileName, blob)
        if (uploadError) throw uploadError
        const { data } = supabase.storage.from('campaign-images').getPublicUrl(fileName)
        mediaUrl = data.publicUrl
      }

      await supabase.from('posts').insert({
        user_id: profile.id,
        content_type: newMedia ? mediaType : 'text',
        text_content: newText,
        image_url: mediaUrl // On utilise image_url pour stocker les deux
      })

      showToast('Publication réussie !', 'success')
      setIsCreateOpen(false)
      setNewText(''); setNewMedia(null)
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
      const { error: rpcError } = await supabase.rpc('send_coins', {
        p_sender_id: profile.id, p_receiver_id: activePost.user_id, p_post_id: activePost.id, p_amount: coinAmount
      })
      if (rpcError) throw rpcError
      
      await supabase.from('notifications').insert({
        user_id: activePost.user_id, title: 'Jetons reçus ! 🪙',
        message: `Tu as reçu ${coinAmount} jetons de ${profile.full_name}.`, link: '/dashboard/jetons/retirer'
      })
      
      showToast(`Tu as envoyé ${coinAmount} jetons !`, 'success')
      setActivePost(null)
      loadPosts()
    } catch (err: any) {
      showToast('Erreur: ' + err.message, 'error')
    }
    setIsSending(false)
  }

  const handleDeletePost = async () => {
    try {
      await supabase.from('posts').delete().eq('id', deletingPostId)
      showToast('Publication supprimée.', 'success')
      setDeletingPostId(null)
      loadPosts()
    } catch (err) {
      showToast('Erreur lors de la suppression.', 'error')
    }
  }

  const handleUpdatePost = async () => {
    setIsUpdating(true)
    try {
      await supabase.from('posts').update({ text_content: editText }).eq('id', editingPost.id)
      showToast('Publication modifiée !', 'success')
      setEditingPost(null)
      loadPosts()
    } catch (err) {
      showToast('Erreur lors de la modification.', 'error')
    }
    setIsUpdating(false)
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
      await supabase.from('post_comments').insert({ post_id: activeCommentPost.id, user_id: profile.id, content: newComment.trim() })
      
      if (activeCommentPost.user_id !== profile.id) {
        await supabase.from('notifications').insert({
          user_id: activeCommentPost.user_id, title: 'Nouveau commentaire 💬',
          message: `${profile.full_name} a commenté ta publication : "${newComment.trim().substring(0, 30)}..."`,
          link: '/dashboard/reseau'
        })
      }

      setNewComment('')
      const { data } = await supabase.from('post_comments').select('*, profiles(full_name)').eq('post_id', activeCommentPost.id).order('created_at', { ascending: true })
      setComments(data || [])
      loadPosts()
    } catch (err) { showToast('Erreur commentaire.', 'error') }
    setIsCommenting(false)
  }

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Chargement...</div>

  return (
    <main className="min-h-screen bg-black text-white relative">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <header className="fixed top-0 inset-x-0 z-50 px-4 py-3 bg-black/80 backdrop-blur-md border-b border-white/10 flex justify-between items-center">
        <Link href="/dashboard" className="text-white bg-white/10 p-2 rounded-full">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <div className="flex gap-4 text-sm font-bold">
          <button onClick={() => setActiveTab('pour-toi')} className={activeTab === 'pour-toi' ? 'text-white border-b-2 border-white pb-1' : 'text-white/50'}>Pour toi</button>
          <button onClick={() => setActiveTab('recents')} className={activeTab === 'recents' ? 'text-white border-b-2 border-white pb-1' : 'text-white/50'}>Récents</button>
        </div>
        <Link href="/dashboard/jetons/acheter" className="px-3 py-1.5 bg-amber-500 text-black text-xs font-bold rounded-full">+ Acheter</Link>
      </header>

      <div className="pt-16 pb-20">
        {posts.map(post => (
          <div key={post.id} className="mb-6 px-4">
            <div className="bg-slate-900 rounded-2xl overflow-hidden border border-white/10 shadow-lg">
              
              <div className="flex items-center gap-3 p-3">
                <Link href={`/u/${post.user_id}`} className="flex items-center gap-3 hover:opacity-80">
                  <div className="w-10 h-10 bg-sky-500 rounded-full flex items-center justify-center font-bold text-white">
                    {post.profiles?.full_name?.charAt(0)}
                  </div>
                  <p className="font-bold text-sm">@{post.profiles?.full_name}</p>
                </Link>
              </div>

              {/* Affichage Image OU Vidéo */}
              {post.content_type === 'image' && post.image_url && (
                <img src={post.image_url} className="w-full h-auto max-h-[60vh] object-contain bg-black" />
              )}
              {post.content_type === 'video' && post.image_url && (
                <video src={post.image_url} controls className="w-full h-auto max-h-[60vh] bg-black" />
              )}

              <div className="p-4">
                <p className="text-sm text-slate-200 mb-4 whitespace-pre-wrap">{post.text_content}</p>
                <div className="flex items-center justify-between border-t border-white/10 pt-3">
                  <button onClick={() => openComments(post)} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    <span className="font-bold">{post.comments_count || 0}</span>
                  </button>
                  <button onClick={() => { setActivePost(post); setCoinAmount(10); }} className="flex items-center gap-1.5 bg-amber-500/10 text-amber-400 px-4 py-2 rounded-full font-bold text-sm hover:bg-amber-500/20 border border-amber-500/20">
                    <span>🪙 {post.total_coins_received || 0}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button onClick={() => setIsCreateOpen(true)} className="fixed bottom-24 right-4 z-50 w-14 h-14 bg-sky-500 rounded-full flex items-center justify-center shadow-lg shadow-sky-500/50">
        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
      </button>

      {/* Modal Création (avec choix Image/Vidéo) */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 text-slate-900">
            <h2 className="font-bold text-lg mb-4">Créer une publication</h2>
            <form onSubmit={handleCreatePost} className="space-y-4">
              <textarea placeholder="Quoi de neuf ?" value={newText} onChange={e => setNewText(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none" rows={3} />
              
              <div className="flex gap-2 mb-2">
                <button type="button" onClick={() => setMediaType('image')} className={`flex-1 py-2 rounded-lg font-bold text-sm ${mediaType === 'image' ? 'bg-sky-100 text-sky-700 border-2 border-sky-500' : 'bg-slate-100 text-slate-500'}`}>Image</button>
                <button type="button" onClick={() => setMediaType('video')} className={`flex-1 py-2 rounded-lg font-bold text-sm ${mediaType === 'video' ? 'bg-sky-100 text-sky-700 border-2 border-sky-500' : 'bg-slate-100 text-slate-500'}`}>Vidéo (25s max)</button>
              </div>

              <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center relative">
                <input type="file" accept={mediaType === 'image' ? 'image/*' : 'video/*'} onChange={e => setNewMedia(e.target.files?.[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                {newMedia ? <p className="text-sm text-emerald-600 font-medium">Fichier sélectionné</p> : <p className="text-sm text-slate-500">Ajouter un fichier</p>}
              </div>

              <div className="flex gap-2">
                <button type="button" onClick={() => setIsCreateOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl">Annuler</button>
                <button type="submit" disabled={isUploading} className="flex-1 py-3 bg-sky-500 text-white font-bold rounded-xl disabled:opacity-50">
                  {isUploading ? 'Envoi...' : 'Publier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modals Jetons et Commentaires (Inchangés) */}
      {activePost && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 text-slate-900">
            <h2 className="text-xl font-bold mb-2 text-center">Soutenir @{activePost.profiles?.full_name}</h2>
            <p className="text-sm text-slate-500 text-center mb-6">Solde : <strong className="text-amber-600">{profile?.coins_balance || 0} jetons</strong></p>
            <div className="grid grid-cols-2 gap-2 mb-6">
              {[10, 50, 100, 500].map(amount => (
                <button key={amount} onClick={() => setCoinAmount(amount)} className={`py-3 rounded-xl font-bold border-2 transition ${coinAmount === amount ? 'border-amber-500 bg-amber-50 text-amber-600' : 'border-slate-200 text-slate-600'}`}>
                  🪙 {amount}
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

      {activeCommentPost && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => setActiveCommentPost(null)}>
          <div className="bg-white w-full max-w-md rounded-t-3xl p-4 text-slate-900 max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
              <h3 className="font-bold text-lg">{comments.length} commentaires</h3>
              <button onClick={() => setActiveCommentPost(null)} className="text-slate-400 hover:text-slate-900">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 mb-4">
              {comments.map(c => (
                <div key={c.id} className="flex gap-3">
                  <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">{c.profiles?.full_name?.charAt(0)}</div>
                  <div><p className="text-xs font-bold text-slate-500 mb-0.5">{c.profiles?.full_name}</p><p className="text-sm text-slate-800">{c.content}</p></div>
                </div>
              ))}
            </div>
            <form onSubmit={handleAddComment} className="flex gap-2">
              <input type="text" placeholder="Ajouter un commentaire..." value={newComment} onChange={e => setNewComment(e.target.value)} className="flex-1 p-3 bg-slate-100 rounded-full text-sm outline-none" />
              <button type="submit" disabled={isCommenting || !newComment.trim()} className="px-4 py-2 bg-sky-500 text-white font-bold text-sm rounded-full disabled:opacity-50">Publier</button>
            </form>
          </div>
        </div>
      )}
      {/* Fermer le menu si on clique ailleurs */}
      {openMenuId && (
        <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)}></div>
      )}

      {/* MODAL DE MODIFICATION */}
      {editingPost && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 text-slate-900">
            <h2 className="font-bold text-lg mb-4">Modifier la publication</h2>
            <textarea value={editText} onChange={e => setEditText(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none mb-4" rows={4} />
            <div className="flex gap-2">
              <button onClick={() => setEditingPost(null)} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl">Annuler</button>
              <button onClick={handleUpdatePost} disabled={isUpdating} className="flex-1 py-3 bg-sky-500 text-white font-bold rounded-xl disabled:opacity-50">
                {isUpdating ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE SUPPRESSION */}
      {deletingPostId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 text-center text-slate-900">
            <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </div>
            <h3 className="font-bold text-lg mb-2">Supprimer cette publication ?</h3>
            <p className="text-sm text-slate-500 mb-6">Cette action est irréversible.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeletingPostId(null)} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl">Annuler</button>
              <button onClick={handleDeletePost} className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl">Supprimer</button>
            </div>
          </div>
        </div>
      )}

    </main>
  )
}
