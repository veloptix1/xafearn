'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const PAGE_SIZE = 50
const EMOJIS = ['❤️', '👍', '😂', '😮', '😢', '🙏']

function Toast({ message, onClose }: { message: string, onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 2500); return () => clearTimeout(t) }, [onClose])
  return <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[300] px-5 py-3 bg-slate-900 text-white text-sm font-medium rounded-full shadow-xl animate-in fade-in slide-in-from-bottom-4">{message}</div>
}

export default function ChatPage() {
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const conversationId = params.id as string

  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  const typingTimeout = useRef<NodeJS.Timeout | null>(null)
  const channelRef = useRef<any>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null)

  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [otherUser, setOtherUser] = useState<any>(null)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [isOtherOnline, setIsOtherOnline] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [longPressMessage, setLongPressMessage] = useState<any>(null)
  const [isScrolledUp, setIsScrolledUp] = useState(false)
  const [isOtherTyping, setIsOtherTyping] = useState(false)
  const [replyTo, setReplyTo] = useState<any>(null)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [showAttachMenu, setShowAttachMenu] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordTime, setRecordTime] = useState(0)
  const [toast, setToast] = useState<string | null>(null)
  
  // 🔍 Recherche
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  
  // 📖 "Vu à" — stocker les dates de lecture des messages
  const [readTimestamps, setReadTimestamps] = useState<Record<string, string>>({})

  const profileRef = useRef<any>(null)
  const otherUserRef = useRef<any>(null)
  const isScrolledUpRef = useRef(false)

  useEffect(() => { profileRef.current = profile }, [profile])
  useEffect(() => { otherUserRef.current = otherUser }, [otherUser])
  useEffect(() => { isScrolledUpRef.current = isScrolledUp }, [isScrolledUp])

  const loadMessages = useCallback(async (beforeId?: string) => {
    let query = supabase.from('messages').select('*, sender:sender_id(full_name)').eq('conversation_id', conversationId).order('created_at', { ascending: false }).limit(PAGE_SIZE)
    if (beforeId) {
      const { data: oldest } = await supabase.from('messages').select('created_at').eq('id', beforeId).single()
      if (oldest) query = query.lt('created_at', oldest.created_at)
    }
    const { data } = await query
    if (data) {
      const sorted = [...data].reverse()
      if (beforeId) setMessages(prev => [...sorted, ...prev])
      else setMessages(sorted)
      setHasMore(data.length === PAGE_SIZE)
    }
  }, [supabase, conversationId])

  useEffect(() => {
    let isMounted = true
    let presenceChannel: any = null
    let presenceInterval: NodeJS.Timeout | null = null

    async function init() {
      await new Promise(r => setTimeout(r, 100))
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { if (isMounted) router.replace('/login'); return }

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      if (!prof || !isMounted) return
      setProfile(prof); profileRef.current = prof

      const { data: conv } = await supabase.from('conversations').select('*, user1:user1_id(*), user2:user2_id(*)').eq('id', conversationId).single()
      if (!conv || !isMounted) { router.replace('/dashboard/messages'); return }
      const other = conv.user1_id === session.user.id ? conv.user2 : conv.user1
      setOtherUser(other); otherUserRef.current = other

      await loadMessages()
      if (isMounted) setLoading(false)
      await supabase.rpc('mark_messages_read', { p_conversation_id: conversationId, p_user_id: session.user.id })

      channelRef.current = supabase.channel(`chat-${conversationId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, async (payload: any) => {
          if (!isMounted) return
          setMessages(prev => prev.some(m => m.id === payload.new.id) ? prev : [...prev, payload.new])
          if (!isScrolledUpRef.current) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
          await supabase.rpc('mark_messages_read', { p_conversation_id: conversationId, p_user_id: session.user.id })
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, (payload: any) => {
          if (!isMounted) return
          setMessages(prev => prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m))
          // Si un message reçu devient lu, on enregistre l'heure
          if (payload.new.is_read && payload.new.sender_id === session.user.id) {
            setReadTimestamps(prev => ({ ...prev, [payload.new.id]: new Date().toISOString() }))
          }
        })
        .on('broadcast', { event: 'typing' }, (payload: any) => {
          if (!isMounted || !otherUserRef.current) return
          if (payload.payload?.user_id === otherUserRef.current.id) {
            setIsOtherTyping(payload.payload.is_typing)
            if (typingTimeout.current) clearTimeout(typingTimeout.current)
            if (payload.payload.is_typing) typingTimeout.current = setTimeout(() => setIsOtherTyping(false), 3000)
          }
        })
        .subscribe()

      presenceChannel = supabase.channel(`presence-${conversationId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'user_presence' }, (payload: any) => {
          if (!isMounted || !payload.new || !otherUserRef.current) return
          if (payload.new.user_id === otherUserRef.current.id) setIsOtherOnline(Date.now() - new Date(payload.new.last_seen).getTime() < 60000)
        })
        .subscribe()

      await supabase.from('user_presence').upsert({ user_id: session.user.id, last_seen: new Date().toISOString() })
      presenceInterval = setInterval(async () => {
        if (!isMounted) return
        await supabase.from('user_presence').upsert({ user_id: session.user.id, last_seen: new Date().toISOString() })
      }, 30000)
    }
    init()
    return () => {
      isMounted = false
      if (presenceInterval) clearInterval(presenceInterval)
      if (typingTimeout.current) clearTimeout(typingTimeout.current)
      if (recordTimerRef.current) clearInterval(recordTimerRef.current)
      if (channelRef.current) supabase.removeChannel(channelRef.current)
      if (presenceChannel) supabase.removeChannel(presenceChannel)
    }
  }, [conversationId, supabase, router, loadMessages])

  useEffect(() => {
    if (!loading && messages.length > 0 && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    }
  }, [loading])

  const handleScroll = async () => {
    const container = messagesContainerRef.current
    if (!container) return
    setIsScrolledUp(container.scrollHeight - container.scrollTop - container.clientHeight > 100)
    if (container.scrollTop < 50 && hasMore && !loadingMore && messages.length > 0) {
      setLoadingMore(true)
      const previousScrollHeight = container.scrollHeight
      await loadMessages(messages[0].id)
      setTimeout(() => { container.scrollTop = container.scrollHeight - previousScrollHeight; setLoadingMore(false) }, 50)
    }
  }

  const handleTyping = (value: string) => {
    setNewMessage(value)
    if (!profile || !channelRef.current) return
    channelRef.current.send({ type: 'broadcast', event: 'typing', payload: { user_id: profile.id, is_typing: true } })
    if (typingTimeout.current) clearTimeout(typingTimeout.current)
    typingTimeout.current = setTimeout(() => { channelRef.current?.send({ type: 'broadcast', event: 'typing', payload: { user_id: profile.id, is_typing: false } }) }, 2000)
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !profile) return
    const content = newMessage.trim()
    const replyId = replyTo?.id
    setNewMessage(''); setReplyTo(null)
    const tempId = `temp-${Date.now()}`
    setMessages(prev => [...prev, { id: tempId, conversation_id: conversationId, sender_id: profile.id, content, message_type: 'text', created_at: new Date().toISOString(), is_read: false, isTemp: true, reply_to_id: replyId }])
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    setSending(true)
    try {
      const { data: insertedMsg, error } = await supabase.from('messages').insert({ conversation_id: conversationId, sender_id: profile.id, content, message_type: 'text', reply_to_id: replyId || null }).select().single()
      if (error) throw error
      setMessages(prev => prev.map(m => m.id === tempId ? { ...insertedMsg, sender: profile } : m))
      await supabase.from('conversations').update({ last_message: content, last_message_at: new Date().toISOString(), last_message_sender_id: profile.id }).eq('id', conversationId)
      channelRef.current?.send({ type: 'broadcast', event: 'typing', payload: { user_id: profile.id, is_typing: false } })
    } catch (err: any) { setMessages(prev => prev.filter(m => m.id !== tempId)); setToast('Erreur: ' + err.message) }
    setSending(false)
  }

  // 😀 Réagir à un message
  const reactToMessage = async (msg: any, emoji: string) => {
    if (!profile) return
    try {
      const currentReactions = msg.reactions || {}
      const users = currentReactions[emoji] || []
      let newUsers: string[]
      if (users.includes(profile.id)) newUsers = users.filter((id: string) => id !== profile.id)
      else newUsers = [...users, profile.id]
      
      const newReactions = { ...currentReactions, [emoji]: newUsers }
      if (newUsers.length === 0) delete newReactions[emoji]
      
      await supabase.from('messages').update({ reactions: newReactions }).eq('id', msg.id)
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, reactions: newReactions } : m))
      setLongPressMessage(null)
    } catch (err: any) { setToast('Erreur réaction: ' + err.message) }
  }

  const uploadAndSend = async (file: File, type: 'image' | 'file' | 'audio') => {
    if (!profile) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop() || (type === 'audio' ? 'webm' : 'bin')
      const fileName = `chat-${profile.id}-${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('campaign-images').upload(fileName, file)
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('campaign-images').getPublicUrl(fileName)
      const label = type === 'image' ? '📷 Image' : type === 'audio' ? '🎤 Vocal' : `📎 ${file.name}`
      const { data: inserted, error: insErr } = await supabase.from('messages').insert({ conversation_id: conversationId, sender_id: profile.id, content: label, message_type: type, media_url: publicUrl }).select().single()
      if (insErr) throw insErr
      setMessages(prev => [...prev, inserted])
      await supabase.from('conversations').update({ last_message: label, last_message_at: new Date().toISOString(), last_message_sender_id: profile.id }).eq('id', conversationId)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    } catch (err: any) { setToast('Erreur: ' + err.message) }
    setUploading(false); setShowAttachMenu(false)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) return setToast('Max 10 Mo')
    uploadAndSend(file, file.type.startsWith('image/') ? 'image' : 'file')
    e.target.value = ''
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []
      mediaRecorder.ondataavailable = (ev) => { if (ev.data.size > 0) audioChunksRef.current.push(ev.data) }
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const file = new File([audioBlob], `vocal-${Date.now()}.webm`, { type: 'audio/webm' })
        stream.getTracks().forEach(t => t.stop())
        await uploadAndSend(file, 'audio')
      }
      mediaRecorder.start()
      setIsRecording(true); setRecordTime(0)
      recordTimerRef.current = setInterval(() => setRecordTime(t => t + 1), 1000)
    } catch (err: any) { setToast('Micro non autorisé') }
  }

  const stopRecording = () => {
    if (recordTimerRef.current) { clearInterval(recordTimerRef.current); recordTimerRef.current = null }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop()
    setIsRecording(false); setRecordTime(0)
  }

  const cancelRecording = () => {
    if (recordTimerRef.current) { clearInterval(recordTimerRef.current); recordTimerRef.current = null }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') { mediaRecorderRef.current.onstop = null; mediaRecorderRef.current.stop() }
    setIsRecording(false); setRecordTime(0)
  }

  const deleteMessage = async (msg: any) => {
    if (!profile || msg.sender_id !== profile.id) { setToast("Tu ne peux supprimer que tes propres messages."); setLongPressMessage(null); return }
    if (!confirm('Supprimer ce message ?')) return
    await supabase.from('messages').delete().eq('id', msg.id)
    setMessages(prev => prev.filter(m => m.id !== msg.id))
    setLongPressMessage(null); setToast('Message supprimé')
  }

  const copyMessage = async (msg: any) => {
    try { await navigator.clipboard.writeText(msg.content || ''); setToast('📋 Copié !') } catch { setToast('Erreur') }
    setLongPressMessage(null)
  }

  const handleTouchStart = (msg: any) => { longPressTimer.current = setTimeout(() => setLongPressMessage(msg), 500) }
  const handleTouchEnd = () => { if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null } }
  const handleContextMenu = (e: React.MouseEvent, msg: any) => { e.preventDefault(); setLongPressMessage(msg) }

  // 🔍 Filtrer les messages pour la recherche
  const isSearching = isSearchOpen && searchQuery.trim().length > 0
  const highlightText = (text: string, query: string) => {
    if (!query.trim() || !text) return text
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'))
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() 
        ? <mark key={i} className="bg-yellow-300 text-slate-900 rounded px-0.5">{part}</mark> 
        : part
    )
  }

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin"></div></div>

  const getReplyMessage = (replyId: string) => messages.find(m => m.id === replyId)
  const lastMyMessage = [...messages].reverse().find(m => m.sender_id === profile?.id && !m.isTemp)

  const groupedMessages: Record<string, any[]> = {}
  messages.forEach(m => {
    if (isSearching && !m.content?.toLowerCase().includes(searchQuery.toLowerCase())) return
    const date = new Date(m.created_at).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    if (!groupedMessages[date]) groupedMessages[date] = []
    groupedMessages[date].push(m)
  })

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-50 flex items-center gap-3 shrink-0">
        <button onClick={() => router.push('/dashboard/messages')} className="text-slate-500 bg-slate-100 p-2 rounded-full shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </button>
        
        {isSearchOpen ? (
          <div className="flex-1 flex items-center gap-2">
            <input autoFocus type="text" placeholder="Rechercher dans la conversation..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-sky-400" />
            <button onClick={() => { setIsSearchOpen(false); setSearchQuery('') }} className="text-slate-500 text-sm font-bold px-2">Annuler</button>
          </div>
        ) : (
          <>
            <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-blue-500 rounded-full flex items-center justify-center font-bold text-white shrink-0">{otherUser?.full_name?.charAt(0) || '?'}</div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-900 text-sm truncate">{otherUser?.full_name}</p>
              <p className={`text-[10px] font-bold ${isOtherTyping ? 'text-sky-500' : isOtherOnline ? 'text-emerald-500' : 'text-slate-400'}`}>{isOtherTyping ? "En train d'écrire..." : isOtherOnline ? 'En ligne' : 'Hors ligne'}</p>
            </div>
            <button onClick={() => setIsSearchOpen(true)} className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </button>
          </>
        )}
      </header>

      <div ref={messagesContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 space-y-3 pb-4">
        {loadingMore && <div className="text-center text-xs text-slate-400 py-2">Chargement...</div>}
        {!hasMore && messages.length > 0 && !isSearching && <div className="text-center text-xs text-slate-400 py-2">Début de la conversation</div>}
        {isSearching && Object.keys(groupedMessages).length === 0 && <div className="text-center text-sm text-slate-400 py-10">Aucun message trouvé</div>}

        {Object.entries(groupedMessages).map(([date, msgs]) => (
          <div key={date}>
            <div className="flex justify-center my-4"><span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-3 py-1 rounded-full">{date}</span></div>
            <div className="space-y-2">
              {msgs.map((m: any) => {
                const isMe = m.sender_id === profile?.id
                const replyMsg = m.reply_to_id ? getReplyMessage(m.reply_to_id) : null
                const isLastMine = lastMyMessage?.id === m.id
                const reactionEntries = Object.entries(m.reactions || {}).filter(([_, users]: any) => users.length > 0)
                
                return (
                  <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div
                      onTouchStart={() => handleTouchStart(m)}
                      onTouchEnd={handleTouchEnd}
                      onContextMenu={(e) => handleContextMenu(e, m)}
                      className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm shadow-sm ${isMe ? 'bg-sky-500 text-white rounded-br-none' : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'} ${m.isTemp ? 'opacity-70' : ''}`}
                    >
                      {replyMsg && (
                        <div className={`mb-1 px-2 py-1 rounded-lg border-l-2 text-[10px] ${isMe ? 'bg-sky-600/30 border-white/50 text-sky-100' : 'bg-slate-100 border-sky-400 text-slate-600'}`}>
                          <p className="font-bold truncate">{replyMsg.sender?.full_name || (replyMsg.sender_id === profile?.id ? 'Vous' : 'Utilisateur')}</p>
                          <p className="truncate">{replyMsg.content}</p>
                        </div>
                      )}
                      {m.message_type === 'image' && m.media_url ? (
                        <img src={m.media_url} alt="Chat" className="rounded-lg max-h-64 w-auto" />
                      ) : m.message_type === 'audio' && m.media_url ? (
                        <audio controls src={m.media_url} className="max-w-full mt-1" style={{ height: 40 }} />
                      ) : m.message_type === 'file' && m.media_url ? (
                        <a href={m.media_url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 underline ${isMe ? 'text-white' : 'text-sky-600'}`}>
                          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                          <span className="text-xs truncate">{m.content.replace('📎 ', '')}</span>
                        </a>
                      ) : (
                        <p className="whitespace-pre-wrap">{highlightText(m.content, isSearching ? searchQuery : '')}</p>
                      )}
                      <div className={`flex items-center justify-end gap-1 mt-1 ${isMe ? 'text-sky-100' : 'text-slate-400'}`}>
                        <p className="text-[9px]">{new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                        {isMe && (m.isTemp
                          ? <svg className="w-3 h-3 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          : m.is_read ? <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /><path d="M13 16.17L8.83 12l-1.42 1.41L13 19 21 7l-1.41-1.41z" /></svg>
                            : <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                        )}
                      </div>
                    </div>
                    
                    {/* 😀 Réactions affichées */}
                    {reactionEntries.length > 0 && (
                      <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                        {reactionEntries.map(([emoji, users]: any) => (
                          <button key={emoji} onClick={() => reactToMessage(m, emoji)} className={`px-1.5 py-0.5 rounded-full text-[10px] flex items-center gap-0.5 ${users.includes(profile?.id) ? 'bg-sky-100 border border-sky-300' : 'bg-slate-100 border border-slate-200'}`}>
                            <span>{emoji}</span><span className="font-bold text-slate-600">{users.length}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {/* 👁️ "Vu à" sous le dernier message envoyé */}
                    {isMe && isLastMine && m.is_read && readTimestamps[m.id] && (
                      <p className="text-[9px] text-slate-400 mt-0.5">Vu à {new Date(readTimestamps[m.id]).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {replyTo && (
        <div className="bg-slate-100 border-t border-slate-200 px-4 py-2 flex items-center gap-2 shrink-0">
          <div className="flex-1 min-w-0 border-l-2 border-sky-500 pl-2">
            <p className="text-[10px] font-bold text-sky-600">{replyTo.sender_id === profile?.id ? 'Vous' : otherUser?.full_name}</p>
            <p className="text-xs text-slate-600 truncate">{replyTo.content}</p>
          </div>
          <button onClick={() => setReplyTo(null)} className="text-slate-400 text-xl px-2">×</button>
        </div>
      )}

      {isRecording && (
        <div className="fixed inset-0 z-[180] bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center text-white p-6">
          <div className="w-24 h-24 rounded-full bg-red-500 flex items-center justify-center animate-pulse mb-6">
            <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14a3 3 0 003-3V5a3 3 0 00-6 0v6a3 3 0 003 3zm5-3a5 5 0 01-10 0H5a7 7 0 006 6.92V21h2v-3.08A7 7 0 0019 11h-2z" /></svg>
          </div>
          <p className="text-2xl font-black mb-2">{Math.floor(recordTime / 60)}:{String(recordTime % 60).padStart(2, '0')}</p>
          <p className="text-sm text-slate-300 mb-8">Enregistrement...</p>
          <div className="flex gap-4">
            <button onClick={cancelRecording} className="px-6 py-3 bg-slate-700 rounded-xl font-bold">Annuler</button>
            <button onClick={stopRecording} className="px-6 py-3 bg-sky-500 rounded-xl font-bold">Envoyer</button>
          </div>
        </div>
      )}

      {showAttachMenu && !isRecording && (
        <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={() => setShowAttachMenu(false)}>
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto mb-4"></div>
            <p className="text-sm font-bold text-slate-900 mb-4 text-center">Envoyer</p>
            <button onClick={() => { fileInputRef.current?.setAttribute('accept', 'image/*'); fileInputRef.current?.click(); setShowAttachMenu(false) }} className="w-full py-3 bg-sky-50 text-sky-600 font-bold rounded-xl text-sm mb-2">📷 Photo</button>
            <button onClick={() => { fileInputRef.current?.setAttribute('accept', '*/*'); fileInputRef.current?.click(); setShowAttachMenu(false) }} className="w-full py-3 bg-slate-50 text-slate-700 font-bold rounded-xl text-sm mb-2">📎 Document / Fichier</button>
            <button onClick={() => setShowAttachMenu(false)} className="w-full py-3 bg-slate-100 text-slate-700 font-bold rounded-xl text-sm">Annuler</button>
          </div>
        </div>
      )}

      <div className="bg-white border-t border-slate-200 p-2 pb-3 w-full max-w-lg mx-auto z-50 shrink-0">
        <form onSubmit={sendMessage} className="flex gap-2 items-center w-full">
          <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
          <button type="button" onClick={() => setShowAttachMenu(true)} disabled={uploading || isRecording} className="w-10 h-10 shrink-0 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center disabled:opacity-50">
            {uploading ? <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>}
          </button>
          <input type="text" value={newMessage} onChange={e => handleTyping(e.target.value)} placeholder="Écris un message..." className="flex-1 min-w-0 p-3 bg-slate-50 border border-slate-200 rounded-full text-sm outline-none focus:border-sky-400" />
          {newMessage.trim() ? (
            <button type="submit" disabled={sending} className="w-11 h-11 shrink-0 bg-sky-500 text-white rounded-full flex items-center justify-center disabled:opacity-50">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            </button>
          ) : (
            <button type="button" onMouseDown={startRecording} onMouseUp={stopRecording} onTouchStart={(e) => { e.preventDefault(); startRecording() }} onTouchEnd={(e) => { e.preventDefault(); stopRecording() }} disabled={uploading} className="w-11 h-11 shrink-0 bg-sky-500 text-white rounded-full flex items-center justify-center disabled:opacity-50">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14a3 3 0 003-3V5a3 3 0 00-6 0v6a3 3 0 003 3zm5-3a5 5 0 01-10 0H5a7 7 0 006 6.92V21h2v-3.08A7 7 0 0019 11h-2z" /></svg>
            </button>
          )}
        </form>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      {/* 🎯 Menu appui long avec RÉACTIONS */}
      {longPressMessage && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={() => setLongPressMessage(null)}>
          <div className="bg-white rounded-3xl w-full max-w-sm p-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            {/* Barre d'emojis de réaction */}
            <div className="flex justify-around items-center gap-1 bg-slate-50 rounded-full p-2 mb-4">
              {EMOJIS.map(emoji => {
                const users = longPressMessage.reactions?.[emoji] || []
                const isReacted = users.includes(profile?.id)
                return (
                  <button key={emoji} onClick={() => reactToMessage(longPressMessage, emoji)} className={`text-2xl p-2 rounded-full transition active:scale-125 ${isReacted ? 'bg-sky-100' : 'hover:bg-slate-200'}`}>
                    {emoji}
                  </button>
                )
              })}
            </div>
            <button onClick={() => { setReplyTo(longPressMessage); setLongPressMessage(null) }} className="w-full py-3 bg-sky-50 text-sky-600 font-bold rounded-xl text-sm mb-2">↩️ Répondre</button>
            {longPressMessage.message_type === 'text' && (
              <button onClick={() => copyMessage(longPressMessage)} className="w-full py-3 bg-slate-50 text-slate-700 font-bold rounded-xl text-sm mb-2">📋 Copier le texte</button>
            )}
            {longPressMessage.sender_id === profile?.id && (
              <button onClick={() => deleteMessage(longPressMessage)} className="w-full py-3 bg-red-50 text-red-600 font-bold rounded-xl text-sm mb-2">🗑️ Supprimer</button>
            )}
            <button onClick={() => setLongPressMessage(null)} className="w-full py-3 bg-slate-100 text-slate-700 font-bold rounded-xl text-sm">Annuler</button>
          </div>
        </div>
      )}
    </main>
  )
}
