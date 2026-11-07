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

  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [otherUser, setOtherUser] = useState<any>(null)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    load()
  }, [conversationId])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.push('/login')

    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(prof)

    const { data: conv } = await supabase.from('conversations').select('*, user1:user1_id(*), user2:user2_id(*)').eq('id', conversationId).single()
    if (!conv) return router.push('/dashboard/messages')
    setOtherUser(conv.user1_id === user.id ? conv.user2 : conv.user1)

    const { data: msgs } = await supabase.from('messages').select('*, sender:sender_id(full_name, avatar_url)').eq('conversation_id', conversationId).order('created_at', { ascending: true })
    setMessages(msgs || [])
    setLoading(false)

    // Marquer les messages comme lus
    await supabase.from('messages').update({ is_read: true }).eq('conversation_id', conversationId).neq('sender_id', user.id)

    // Realtime : écouter les nouveaux messages
    const channel = supabase.channel(`chat-${conversationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, (payload: any) => {
        setMessages(prev => [...prev, payload.new])
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !profile) return
    setSending(true)
    try {
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: profile.id,
        content: newMessage.trim()
      })
      await supabase.from('conversations').update({ 
        last_message: newMessage.trim(), 
        last_message_at: new Date().toISOString() 
      }).eq('id', conversationId)
      setNewMessage('')
    } catch (err) { console.error(err) }
    setSending(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin"></div>
    </div>
  )

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-5 py-3 sticky top-0 z-50 flex items-center gap-3">
        <Link href="/dashboard/messages" className="text-slate-500 bg-slate-100 p-2 rounded-full">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-blue-500 rounded-full flex items-center justify-center font-bold text-white">
          {otherUser?.full_name?.charAt(0) || '?'}
        </div>
        <div>
          <p className="font-bold text-slate-900 text-sm">{otherUser?.full_name}</p>
          <p className="text-[10px] text-emerald-500 font-bold">En ligne</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24">
        {messages.map(m => {
          const isMe = m.sender_id === profile.id
          return (
            <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${isMe ? 'bg-sky-500 text-white rounded-br-none' : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'}`}>
                <p>{m.content}</p>
                <p className={`text-[9px] mt-1 ${isMe ? 'text-sky-100' : 'text-slate-400'}`}>
                  {new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={sendMessage} className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 p-3 flex gap-2">
        <input 
          type="text" 
          value={newMessage} 
          onChange={e => setNewMessage(e.target.value)} 
          placeholder="Écris un message..." 
          className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-full text-sm outline-none focus:border-sky-400" 
        />
        <button type="submit" disabled={sending || !newMessage.trim()} className="w-12 h-12 bg-sky-500 text-white rounded-full flex items-center justify-center disabled:opacity-50">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
        </button>
      </form>
    </main>
  )
}
