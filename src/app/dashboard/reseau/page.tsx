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
  const [loadingMore, setLoadingMore] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [posts, setPosts] = useState<any[]>([])
  const [trending, setTrending] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'pour-toi' | 'recents' | 'abonnements'>('pour-toi')
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const POSTS_PER_PAGE = 10
  
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

  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [editingPost, setEditingPost] = useState<any>(null)
  const [editText, setEditText] = useState('')
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    loadInitialData()
  }, [activeTab])

  async function loadInitialData() {
    setLoading(true)
    setPage(0)
    setHasMore(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.push('/login')

    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(prof)

    const { data: topPosts } = await supabase.from('posts').select('user_id, total_coins_received, profiles(full_name)').order('total_coins_received', { ascending: false }).limit(20)
    const uniqueCreators = new Map()
    topPosts?.forEach(p => {
      if (!uniqueCreators.has(p.user_id) && (p.profiles as any)?.full_name) {
        uniqueCreators.set(p.user_id, { id: p.user_id, name: (p.profiles as any).full_name, coins: p.total_coins_received })
      }
    })
    setTrending(Array.from(uniqueCreators.values()).slice(0, 5))

    await fetchPosts(prof, 0)
    setLoading(false)
  }

  async function fetchPosts(prof: any, pageNumber: number) {
    const from = pageNumber * POSTS_PER_PAGE
    const to = from + POSTS_PER_PAGE - 1
    let query = supabase.from('posts').select('*, profiles(full_name)')

    if (activeTab === 'recents') {
      query = query.order('created_at', { ascending: false })
    } else if (activeTab === 'abonnements') {
      const { data: follows } = await supabase.from('follows').select('following_id').eq('follower_id', prof.id)
      const followingIds = follows?.map(f => f.following_id) || []
      if (followingIds.length === 0) {
        setPosts([]); setHasMore(false); return
      }
      query = query.in('user_id', followingIds).order('created_at', { ascending: false })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    query = query.range(from, to)
    const { data: p } = await query
    
    if (p && p.length > 0) {
      const postsWithCounts = await Promise.all(p.map(async (post) => {
        const { count } = await supabase.from('post_comments').select('*', { count: 'exact', head: true }).eq('post_id', post.id)
        return { ...post, comments_count: count || 0 }
      }))
      
      if (activeTab === 'pour-toi') {
        postsWithCounts.sort((a, b) => {
          const scoreA = (a.total_coins_received || 0) * 3 + (a.comments_count || 0) * 2
          const scoreB = (b.total_coins_received || 0) * 3 + (b.comments_count || 0) * 2
          return scoreB - scoreA
        })
      }
      
      if (pageNumber === 0) setPosts(postsWithCounts)
      else setPosts(prev => [...prev, ...postsWithCounts])
      
      setHasMore(p.length === POSTS_PER_PAGE)
    } else {
      if (pageNumber === 0) setPosts([])
      setHasMore(false)
    }
  }

  const loadMore = async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    const nextPage = page + 1
    setPage(nextPage)
    await fetchPosts(profile, nextPage)
    setLoadingMore(false)
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
    
    if (mediaType === 'video' && newMedia) {
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.onloadedmetadata = async () => {
        window.URL.revokeObjectURL(video.src)
        if (video.duration > 25) return showToast('La vidéo ne doit pas dépasser 25 secondes.', 'error')
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
        const { data } = await supabase.storage.from('campaign-images').getPublicUrl(fileName)
        mediaUrl = data.publicUrl
      }

      await supabase.from('posts').insert({
        user_id: profile.id,
        content_type: newMedia ? mediaType : 'text',
        text_content: newText,
        image_url: mediaUrl
      })

      showToast('Publication réussie !', 'success')
      setIsCreateOpen(false)
      setNewText(''); setNewMedia(null)
      loadInitialData()
    } catch (err) {
      showToast('Erreur lors de la publication.', 'error')
    }
    setIsUploading(false)
  }

  const handleSendCoins = async () => {
    if (!activePost) return
    if ((profile.coins_balance || 0) < coinAmount) return showToast('Solde insuffisant.', 'error')
    setIsSending(true)
    try {
      const { error } = await supabase.rpc('send_coins', {
        p_sender_id: profile.id, p_receiver_id: activePost.user_id, p_post_id: activePost.id, p_amount: coinAmount
      })
      if (error) throw error
      
      await supabase.from('notifications').insert({
        user_id: activePost.user_id, title: 'Jetons reçus ! 🪙',
        message: `Tu as reçu ${coinAmount} jetons de ${profile.full_name}.`, link: '/dashboard/jetons/retirer'
      })
      
      showToast(`Tu as envoyé ${coinAmount} jetons !`, 'success')
      setActivePost(null)
      setPosts(posts.map(p => p.id === activePost.id ? { ...p, total_coins_received: (p.total_coins_received || 0) + coinAmount } : p))
      setProfile({ ...profile, coins_balance: profile.coins_balance - coinAmount })
    } catch (err: any) {
      showToast('Erreur: ' + err.message, 'error')
    }
    setIsSending(false)
  }

  const handleDownloadWithLogo = async (post: any) => {
    if (!post.image_url) return showToast("Pas d'image à télécharger.", 'warning')
    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.src = post.image_url
      await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject })

      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      canvas.width = img.width
      canvas.height = img.height + 80
      ctx.drawImage(img, 0, 0)

      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, img.height, canvas.width, 80)

      ctx.fillStyle = '#0f172a'
      ctx.font = 'bold 36px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('XAFEARN', canvas.width / 2, img.height + 50)

      ctx.fillStyle = '#0ea5e9'
      ctx.font = 'bold 18px Arial'
      ctx.fillText('Statut • Partage • Gagne', canvas.width / 2, img.height + 70)

      const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
      const link = document.createElement('a')
      link.download = `xafearn-${post.id}.jpg`
      link.href = dataUrl
      link.click()
      showToast('Image téléchargée avec le logo XAFEARN !', 'success')
    } catch (err) {
      showToast('Erreur lors du téléchargement.', 'error')
    }
  }

  const handleShare = async (post: any) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.profiles?.full_name + ' sur XAFEARN',
          text: post.text_content || 'Découvre cette publication sur XAFEARN !',
          url: window.location.origin + '/u/' + post.user_id,
        })
      } catch (err) {}
    } else {
      await navigator.clipboard.writeText(window.location.origin + '/u/' + post.user_id)
      showToast('Lien copié dans le presse-papiers !', 'success')
    }
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
          message: `${profile.full_name} a commenté ta publication.`, link: '/dashboard/reseau'
        })
      }

      setNewComment('')
      const { data } = await supabase.from('post_comments').select('*, profiles(full_name)').eq('post_id', activeCommentPost.id).order('created_at', { ascending: true })
      setComments(data || [])
      setPosts(posts.map(p => p.id === activeCommentPost.id ? { ...p, comments_count: (p.comments_count || 0) + 1 } : p))
    } catch (err) { showToast('Erreur commentaire.', 'error') }
    setIsCommenting(false)
  }

  const handleDeletePost = async () => {
    if (!deletingPostId) return
    try {
      const { error } = await supabase.from('posts').delete().eq('id', deletingPostId)
      if (error) throw error
      setPosts(posts.filter(p => p.id !== deletingPostId))
      showToast('Publication supprimée.', 'success')
      setDeletingPostId(null)
    } catch (err) { showToast('Erreur suppression.', 'error') }
  }

  const handleUpdatePost = async () => {
    if (!editingPost || !editText.trim()) return
    setIsUpdating(true)
    try {
      const { error } = await supabase.from('posts').update({ text_content: editText }).eq('id', editingPost.id)
      if (error) throw error
      setPosts(posts.map(p => p.id === editingPost.id ? { ...p, text_content: editText } : p))
      showToast('Publication modifiée !', 'success')
      setEditingPost(null)
    } catch (err) { showToast('Erreur modification.', 'error') }
    setIsUpdating(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-purple-50 flex flex-col items-center justify-center">
      <div className="w-12 h-12 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin mb-4"></div>
      <p className="text-slate-500 font-bold">Chargement magique...</p>
    </div>
  )

  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-purple-50 relative pb-20">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <header className="sticky top-0 z-50 px-4 py-3 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm flex justify-between items-center">
        <Link href="/dashboard" className="text-slate-500 hover:text-slate-900 bg-slate-100 p-2 rounded-full">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <div className="flex gap-2 text-xs font-bold bg-slate-100 p-1 rounded-full">
          <button onClick={() => setActiveTab('pour-toi')} className={`px-3 py-1.5 rounded-full transition ${activeTab === 'pour-toi' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500'}`}>Pour toi</button>
          <button onClick={() => setActiveTab('recents')} className={`px-3 py-1.5 rounded-full transition ${activeTab === 'recents' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500'}`}>Récents</button>
          <button onClick={() => setActiveTab('abonnements')} className={`px-3 py-1.5 rounded-full transition ${activeTab === 'abonnements' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500'}`}>Abos</button>
        </div>
        <Link href="/dashboard/jetons/acheter" className="px-3 py-1.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold rounded-full shadow-md">+ Jetons</Link>
      </header>

      <div className="pt-4">
        {trending.length > 0 && (
          <div className="px-4 py-3 mb-2 overflow-x-auto no-scrollbar">
            <div className="flex gap-4">
              {trending.map((creator) => (
                <Link key={creator.id} href={`/u/${creator.id}`} className="flex flex-col items-center gap-1 shrink-0 group">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-400 via-blue-500 to-purple-500 p-0.5 shadow-lg group-hover:scale-105 transition">
                    <div className="w-full h-full bg-white rounded-full flex items-center justify-center font-black text-xl text-slate-800">
                      {creator.name.charAt(0)}
                    </div>
                  </div>
                  <p className="text-[10px] font-bold text-slate-700 w-16 truncate text-center">{creator.name}</p>
                  <div className="bg-amber-100 text-amber-700 text-[8px] font-bold px-1.5 py-0.5 rounded-full -mt-1 border border-amber-200">
                    🪙 {creator.coins}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {posts.length === 0 && !loading ? (
          <div className="h-[60vh] flex flex-col items-center justify-center text-center px-6">
            <div className="w-20 h-20 bg-gradient-to-br from-sky-100 to-purple-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            </div>
            <h3 className="font-black text-lg mb-1 text-slate-800">Aucun post à afficher</h3>
            <p className="text-slate-500 text-sm">{activeTab === 'abonnements' ? "Abonne-toi à des créateurs pour voir leurs publications ici." : "Sois le premier à publier !"}</p>
          </div>
        ) : (
          posts.map(post => (
            <div key={post.id} className="mb-6 px-4">
              <div className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-lg relative">
                
                <div className="flex items-center justify-between p-3">
                  <Link href={`/u/${post.user_id}`} className="flex items-center gap-3 hover:opacity-80">
                    <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center font-bold text-white shadow-sm">
                      {post.profiles?.full_name?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-900">@{post.profiles?.full_name}</p>
                      <p className="text-[10px] text-slate-400">Publication</p>
                    </div>
                  </Link>

                  {post.user_id === profile?.id && (
                    <div className="relative">
                      <button onClick={() => setOpenMenuId(openMenuId === post.id ? null : post.id)} className="p-2 text-slate-400 hover:text-slate-900">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
                      </button>
                      {openMenuId === post.id && (
                        <div className="absolute right-0 top-full mt-1 w-32 bg-white border border-slate-200 rounded-xl shadow-xl z-20">
                          <button onClick={() => { setEditingPost(post); setEditText(post.text_content); setOpenMenuId(null); }} className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 rounded-t-xl border-b border-slate-100">Modifier</button>
                          <button onClick={() => { setDeletingPostId(post.id); setOpenMenuId(null); }} className="w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-slate-50 rounded-b-xl">Supprimer</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {post.content_type === 'image' && post.image_url && (
                  <div className="relative w-full bg-slate-100 flex justify-center">
                    <div className="absolute inset-0 bg-cover bg-center blur-xl opacity-50" style={{ backgroundImage: `url(${post.image_url})` }}></div>
                    <img src={post.image_url} className="relative z-10 w-full h-auto max-h-[60vh] object-contain" />
                  </div>
                )}
                {post.content_type === 'video' && post.image_url && (
                  <video src={post.image_url} controls className="w-full h-auto max-h-[60vh] bg-black" />
                )}

                <div className="p-4">
                  <p className="text-sm text-slate-700 mb-4 whitespace-pre-wrap">{post.text_content}</p>
                  <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                    <div className="flex gap-4">
                      <button onClick={() => openComments(post)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-sky-500 transition">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                        <span className="font-bold">{post.comments_count || 0}</span>
                      </button>
                      
                      {post.image_url && (
                        <button onClick={() => handleDownloadWithLogo(post)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-emerald-500 transition">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        </button>
                      )}

                      <button onClick={() => handleShare(post)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-purple-500 transition">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                      </button>
                    </div>
                    
                    <button onClick={() => { setActivePost(post); setCoinAmount(10); }} className="flex items-center gap-1.5 bg-amber-50 text-amber-600 px-4 py-2 rounded-full font-bold text-sm hover:bg-amber-100 border border-amber-200 active:scale-95 transition">
                      <span>🪙 {post.total_coins_received || 0}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}

        {hasMore && posts.length > 0 && (
          <div className="flex justify-center py-6">
            <button onClick={loadMore} disabled={loadingMore} className="px-6 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-bold rounded-full hover:bg-slate-50 shadow-sm transition disabled:opacity-50">
              {loadingMore ? 'Chargement...' : 'Charger plus'}
            </button>
          </div>
        )}
      </div>

      <button onClick={() => setIsCreateOpen(true)} className="fixed bottom-24 right-4 z-50 w-14 h-14 bg-gradient-to-tr from-sky-400 to-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/50 active:scale-90 transition">
        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
      </button>

      {isCreateOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 text-slate-900 shadow-2xl">
            <h2 className="font-black text-lg mb-4">Créer une publication</h2>
            <form onSubmit={handleCreatePost} className="space-y-4">
              <textarea placeholder="Quoi de neuf ?" value={newText} onChange={e => setNewText(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none focus:border-sky-400 outline-none" rows={3} />
              <div className="flex gap-2 mb-2">
                <button type="button" onClick={() => setMediaType('image')} className={`flex-1 py-2 rounded-lg font-bold text-sm transition ${mediaType === 'image' ? 'bg-sky-50 text-sky-600 border-2 border-sky-400' : 'bg-slate-100 text-slate-500'}`}>Image</button>
                <button type="button" onClick={() => setMediaType('video')} className={`flex-1 py-2 rounded-lg font-bold text-sm transition ${mediaType === 'video' ? 'bg-sky-50 text-sky-600 border-2 border-sky-400' : 'bg-slate-100 text-slate-500'}`}>Vidéo (25s)</button>
              </div>
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center relative hover:bg-slate-50 transition">
                <input type="file" accept={mediaType === 'image' ? 'image/*' : 'video/*'} onChange={e => setNewMedia(e.target.files?.[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                {newMedia ? <p className="text-sm text-emerald-600 font-bold">Fichier prêt</p> : <p className="text-sm text-slate-500">Ajouter un fichier</p>}
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setIsCreateOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl">Annuler</button>
                <button type="submit" disabled={isUploading} className="flex-1 py-3 bg-gradient-to-r from-sky-400 to-blue-600 text-white font-bold rounded-xl disabled:opacity-50 shadow-md">
                  {isUploading ? 'Envoi...' : 'Publier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingPost && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 text-slate-900 shadow-2xl">
            <h2 className="font-black text-lg mb-4">Modifier la publication</h2>
            <textarea value={editText} onChange={e => setEditText(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none mb-4 focus:border-sky-400 outline-none" rows={4} />
            <div className="flex gap-2">
              <button onClick={() => setEditingPost(null)} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl">Annuler</button>
              <button onClick={handleUpdatePost} disabled={isUpdating} className="flex-1 py-3 bg-sky-500 text-white font-bold rounded-xl disabled:opacity-50">
                {isUpdating ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deletingPostId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 text-center text-slate-900 shadow-2xl">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </div>
            <h3 className="font-black text-lg mb-2">Supprimer cette publication ?</h3>
            <p className="text-sm text-slate-500 mb-6">Cette action est irréversible.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeletingPostId(null)} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl">Annuler</button>
              <button onClick={handleDeletePost} className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl shadow-md">Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {activePost && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 text-slate-900 shadow-2xl">
            <h2 className="text-xl font-black mb-2 text-center text-slate-900">Soutenir @{activePost.profiles?.full_name}</h2>
            <p className="text-sm text-slate-500 text-center mb-6">Solde : <strong className="text-amber-500">{profile?.coins_balance || 0} jetons</strong></p>
            <div className="grid grid-cols-2 gap-2 mb-6">
              {[10, 50, 100, 500].map(amount => (
                <button key={amount} onClick={() => setCoinAmount(amount)} className={`py-3 rounded-xl font-bold border-2 transition ${coinAmount === amount ? 'border-amber-400 bg-amber-50 text-amber-600' : 'border-slate-200 text-slate-600 hover:border-amber-200'}`}>
                  🪙 {amount}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setActivePost(null)} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl">Annuler</button>
              <button onClick={handleSendCoins} disabled={isSending} className="flex-1 py-3 bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold rounded-xl disabled:opacity-50 shadow-md">
                {isSending ? 'Envoi...' : 'Envoyer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeCommentPost && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-900/40 backdrop-blur-sm" onClick={() => setActiveCommentPost(null)}>
          <div className="bg-white w-full max-w-md rounded-t-3xl p-4 text-slate-900 max-h-[70vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
              <h3 className="font-black text-lg">{comments.length} commentaires</h3>
              <button onClick={() => setActiveCommentPost(null)} className="text-slate-400 hover:text-slate-900">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 mb-4">
              {comments.map(c => (
                <div key={c.id} className="flex gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-sky-100 to-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-sky-600 shrink-0">{c.profiles?.full_name?.charAt(0)}</div>
                  <div className="bg-slate-50 p-2.5 rounded-2xl rounded-tl-none flex-1">
                    <p className="text-xs font-bold text-slate-700 mb-0.5">{c.profiles?.full_name}</p>
                    <p className="text-sm text-slate-800">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={handleAddComment} className="flex gap-2">
              <input type="text" placeholder="Ajouter un commentaire..." value={newComment} onChange={e => setNewComment(e.target.value)} className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-full text-sm outline-none focus:border-sky-400" />
              <button type="submit" disabled={isCommenting || !newComment.trim()} className="px-4 py-2 bg-sky-500 text-white font-bold text-sm rounded-full disabled:opacity-50">Publier</button>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
