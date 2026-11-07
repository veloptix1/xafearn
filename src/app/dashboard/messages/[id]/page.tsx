'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ChatPage() {
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const conversationId = params.id as string
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [otherUser, setOtherUser] = useState<any>(null)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [isOtherOnline, setIsOtherOnline] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [longPressMessage, setLongPressMessage] = useState<any>(null)

  useEffect(() => {
    let isMounted = true
    let presenceInterval: NodeJS.Timeout | null = null

    async function init() {
      // 🔥 Nettoyer TOUS les canaux existants pour éviter les conflits
      await supabase.removeAllChannels()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !isMounted) return router.push('/login')

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!prof) return
      setProfile(prof)

      const { data: conv } = await supabase.from('conversations').select('*, user1:user1_id(*), user2:user2_id(*)').eq('id', conversationId).single()
      if (!conv) return router.push('/dashboard/messages')
      
      const other = conv.user1_id === user.id ? conv.user2 : conv.user1
      setOtherUser(other)

      // 🔥 Charger les messages DIRECTEMENT
      const { data: msgs } = await supabase.from('messages').select('*, sender:sender_id(full_name)').eq('conversation_id', conversationId).order('created_at', { ascending: true })
      
      if (isMounted) {
        setMessages(msgs || [])
        setLoading(false)
      }

      // Marquer comme lus
      await supabase.rpc('mark_messages_read', { p_conversation_id: conversationId, p_user_id: user.id })

      // 🔥 Realtime pour les nouveaux messages
      supabase.channel(`chat-${conversationId}-${Date.now()}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, async (payload: any) => {
          if (!isMounted) return
          setMessages(prev => {
            if (prev.some(m => m.id === payload.new.id)) return prev // Éviter les doublons
            return [...prev, payload.new]
          })
          bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
          await supabase.rpc('mark_messages_read', { p_conversation_id: conversationId, p_user_id: user.id })
        })
        .subscribe()

      // 🔥 Realtime présence
      supabase.channel(`presence-${conversationId}-${Date.now()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'user_presence' }, (payload: any) => {
          if (!isMounted || !payload.new) return
          if (payload.new.user_id === other.id) {
            const lastSeen = new Date(payload.new.last_seen).getTime()
            setIsOtherOnline(Date.now() - lastSeen < 60000)
          }
        })
        .subscribe()

      // Signaler notre présence
      await supabase.from('user_presence').upsert({ user_id: user.id, last_seen: new Date().toISOString() })
      
      presenceInterval = setInterval(async () => {
        if (!isMounted) return
        await supabase.from('user_presence').upsert({ user_id: user.id, last_seen: new Date().toISOString() })
      }, 30000)
    }

    init()

    return () => {
      isMounted = false
      if (presenceInterval) clearInterval(presenceInterval)
      supabase.removeAllChannels()
    }
  }, [conversationId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !profile) return
    setSending(true)
    try {
      const { error: msgErr } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: profile.id,
        content: newMessage.trim(),
        message_type: 'text'
      })
      if (msgErr) throw msgErr

      await supabase.from('conversations').update({ 
        last_message: newMessage.trim(), 
        last_message_at: new Date().toISOString(),
        last_message_sender_id: profile.id
      }).eq('id', conversationId)

      setNewMessage('')
    } catch (err: any) { 
      console.error(err)
    }
    setSending(false)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile) return
    if (file.size > 5 * 1024 * 1024) return alert('Image max 5 Mo')
    
    setUploading(true)
    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const fileName = `chat-${profile.id}-${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('campaign-images').upload(fileName, file)
      if (error) throw error

      const { data: { publicUrl } } = supabase.storage.from('campaign-images').getPublicUrl(fileName)

      await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: profile.id,
        content: '📷 Image',
        message_type: 'image',
        media_url: publicUrl
      })
      await supabase.from('conversations').update({ 
        last_message: '📷 Image', 
        last_message_at: new Date().toISOString(),
        last_message_sender_id: profile.id
      }).eq('id', conversationId)
    } catch (err: any) {
      alert('Erreur upload: ' + err.message)
    }
    setUploading(false)
  }

  const deleteMessage = async (msg: any) => {
    if (!confirm('Supprimer ce message ?')) return
    await supabase.from('messages').delete().eq('id', msg.id)
    setMessages(prev => prev.filter(m => m.id !== msg.id))
    setLongPressMessage(null)
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin"></div>
    </div>
  )

  const groupedMessages: Record<string, any[]> = {}
  messages.forEach(m => {
    const date = new Date(m.created_at).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    if (!groupedMessages[date]) groupedMessages[date] = []
    groupedMessages[date].push(m)
  })

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-5 py-3 sticky top-0 z-50 flex items-center gap-3">
        <button onClick={() => router.push('/dashboard/messages')} className="text-slate-500 bg-slate-100 p-2 rounded-full">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-blue-500 rounded-full flex items-center justify-center font-bold text-white">
          {otherUser?.full_name?.charAt(0) || '?'}
        </div>
        <div>
          <p className="font-bold text-slate-900 text-sm">{otherUser?.full_name}</p>
          <p className={`text-[10px] font-bold ${isOtherOnline ? 'text-emerald-500' : 'text-slate-400'}`}>
            {isOtherOnline ? 'En ligne' : 'Hors ligne'}
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-28">
        {Object.entries(groupedMessages).map(([date, msgs]) => (
          <div key={date}>
            <div className="flex justify-center my-4">
              <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-3 py-1 rounded-full">{date}</span>
            </div>
            <div className="space-y-2">
              {msgs.map((m: any) => {
                const isMe = m.sender_id === profile.id
                return (
                  <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div 
                      onContextMenu={(e) => { e.preventDefault(); if (isMe) setLongPressMessage(m) }}
                      className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm shadow-sm ${isMe ? 'bg-sky-500 text-white rounded-br-none' : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'}`}
                    >
                      {m.message_type === 'image' && m.media_url ? (
                        <img src={m.media_url} alt="Chat" className="rounded-lg max-h-64 w-auto" />
                      ) : (
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      )}
                      <div className={`flex items-center justify-end gap-1 mt-1 ${isMe ? 'text-sky-100' : 'text-slate-400'}`}>
                        <p className="text-[9px]">
                          {new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={sendMessage} className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 p-3 flex gap-2 items-center max-w-lg mx-auto">
        <input type="file" ref={fileInputRef} accept="image/*" onChange={handleImageUpload} className="hidden" />
        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="w-10 h-10 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center shrink-0 disabled:opacity-50">
          {uploading ? <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
        </button>
        <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Écris un message..." className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-full text-sm outline-none focus:border-sky-400" />
        <button type="submit" disabled={sending || !newMessage.trim()} className="w-11 h-11 bg-sky-500 text-white rounded-full flex items-center justify-center disabled:opacity-50 shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
        </button>
      </form>

      {longPressMessage && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={() => setLongPressMessage(null)}>
          <div className="bg-white rounded-2xl w-full max-w-xs p-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <p className="text-xs text-slate-500 mb-3 text-center">Options du message</p>
            <button onClick={() => deleteMessage(longPressMessage)} className="w-full py-3 bg-red-50 text-red-600 font-bold rounded-xl text-sm mb-2 active:bg-red-100">Supprimer</button>
            <button onClick={() => setLongPressMessage(null)} className="w-full py-3 bg-slate-100 text-slate-700 font-bold rounded-xl text-sm active:bg-slate-200">Annuler</button>
          </div>
        </div>
      )}
    </main>
  )
}
