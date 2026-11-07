'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/BottomNav'

export default function MessagesPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [conversations, setConversations] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.push('/login')

    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(prof)

    // Charger les conversations
    const { data } = await supabase
      .from('conversations')
      .select('*, user1:user1_id(id, full_name, avatar_url), user2:user2_id(id, full_name, avatar_url)')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .order('last_message_at', { ascending: false })

    setConversations(data || [])

    // Charger les compteurs de messages non lus
    if (data && data.length > 0) {
      const counts: Record<string, number> = {}
      for (const conv of data) {
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .eq('is_read', false)
          .neq('sender_id', user.id)
        counts[conv.id] = count || 0
      }
      setUnreadCounts(counts)
    }

    setLoading(false)

    // Realtime : écouter les nouveaux messages pour mettre à jour la liste
    const channel = supabase.channel('conversations-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        load() // Recharge la liste complète pour simplifier
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }

  const filteredConversations = conversations.filter(c => {
    if (!search.trim()) return true
    const other = c.user1_id === profile?.id ? c.user2 : c.user1
    return other?.full_name?.toLowerCase().includes(search.toLowerCase())
  })

  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0)

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin"></div>
    </div>
  )

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 px-5 py-4 sticky top-0 z-50 flex items-center gap-3">
        <Link href="/dashboard" className="text-slate-500 bg-slate-100 p-2 rounded-full active:bg-slate-200 transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-lg font-black text-slate-900 flex-1">Messages</h1>
        {totalUnread > 0 && (
          <span className="bg-rose-500 text-white text-xs font-bold px-2 py-1 rounded-full">{totalUnread}</span>
        )}
      </header>

      <div className="p-4 max-w-lg mx-auto">
        
        {/* Barre de recherche */}
        <div className="relative mb-4">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <input 
            type="text" 
            placeholder="Rechercher une conversation..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        {filteredConversations.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 mt-4">
            <div className="w-16 h-16 bg-sky-50 rounded-full flex items-center justify-center mx-auto mb-4 text-sky-500">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            </div>
            <h3 className="font-bold text-slate-900 mb-1">
              {search ? 'Aucun résultat' : 'Aucune conversation'}
            </h3>
            <p className="text-sm text-slate-500 px-6">
              {search ? 'Essaie avec un autre nom.' : 'Va sur le profil d\'un utilisateur pour commencer à discuter.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredConversations.map(c => {
              const other = c.user1_id === profile.id ? c.user2 : c.user1
              const unread = unreadCounts[c.id] || 0
              const isMyMessage = c.last_message_sender_id === profile.id
              
              return (
                <Link key={c.id} href={`/dashboard/messages/${c.id}`} className={`block border rounded-2xl p-4 shadow-sm active:scale-[0.99] transition ${unread > 0 ? 'bg-sky-50 border-sky-200' : 'bg-white border-slate-200'}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-sky-400 to-blue-500 rounded-full flex items-center justify-center font-bold text-white text-lg shrink-0">
                      {other?.full_name?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`truncate ${unread > 0 ? 'font-black text-slate-900' : 'font-bold text-slate-900'}`}>{other?.full_name || 'Utilisateur'}</p>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {new Date(c.last_message_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <p className={`text-xs truncate ${unread > 0 ? 'text-slate-700 font-medium' : 'text-slate-500'}`}>
                          {isMyMessage && <span className="text-slate-400">Vous : </span>}
                          {c.last_message || 'Nouvelle conversation'}
                        </p>
                        {unread > 0 && (
                          <span className="bg-sky-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center shrink-0">{unread}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
      <BottomNav />
    </main>
  )
}
