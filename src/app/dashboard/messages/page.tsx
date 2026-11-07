'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/BottomNav'

function Toast({ message, onClose }: { message: string, onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 2500); return () => clearTimeout(t) }, [onClose])
  return <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[300] px-5 py-3 bg-slate-900 text-white text-sm font-medium rounded-full shadow-xl animate-in fade-in slide-in-from-bottom-4">{message}</div>
}

const Icons = {
  Pin: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 4.5l-3.25 3.25L10.5 6.5 7.5 9.5l5.5 5.5 3-3-1.25-1.25 3.25-3.25 1.5 1.5V3h-5.5l1.5 1.5zM7.5 9.5L4 13l2 2 3.5-3.5M16.5 14.5L20 11l-2-2-3.5 3.5" /></svg>,
  Group: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
}

export default function MessagesPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [conversations, setConversations] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  const [isNewMessageOpen, setIsNewMessageOpen] = useState(false)
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [creatingConv, setCreatingConv] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.replace('/login'); return }
    
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
    if (!prof) return
    setProfile(prof)

    // Récupérer les conversations où l'utilisateur participe (1-à-1 ou groupe)
    const { data: participations } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', session.user.id)

    const convIds = participations?.map(p => p.conversation_id) || []

    if (convIds.length === 0) {
      setConversations([])
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('conversations')
      .select(`id, last_message, last_message_at, last_message_sender_id, is_group, group_name, group_avatar_url, user1_id, user2_id, user1:user1_id(id, full_name), user2:user2_id(id, full_name)`)
      .in('id', convIds)
      .order('last_message_at', { ascending: false })

    if (data) setConversations(data)

    if (data && data.length > 0) {
      const counts: Record<string, number> = {}
      for (const conv of data) {
        const { count } = await supabase.from('messages').select('*', { count: 'exact', head: true }).eq('conversation_id', conv.id).eq('is_read', false).neq('sender_id', session.user.id)
        counts[conv.id] = count || 0
      }
      setUnreadCounts(counts)
    }
    setLoading(false)
  }, [supabase, router])

  useEffect(() => {
    let isMounted = true
    let convChannel: any = null
    let msgChannel: any = null
    async function init() {
      await load()
      if (!isMounted) return
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      convChannel = supabase.channel(`convs-${session.user.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => load()).subscribe()
      msgChannel = supabase.channel(`msgs-${session.user.id}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => load()).subscribe()
    }
    init()
    return () => { isMounted = false; if (convChannel) supabase.removeChannel(convChannel); if (msgChannel) supabase.removeChannel(msgChannel) }
  }, [load, supabase])

  const openNewMessage = async () => {
    setIsNewMessageOpen(true)
    if (allUsers.length === 0) {
      const { data } = await supabase.from('profiles').select('id, full_name, level').neq('id', profile?.id || '').order('full_name')
      setAllUsers(data || [])
    }
  }

  const startConversation = async (userId: string) => {
    if (!profile) return
    setCreatingConv(true)
    try {
      // Vérifier si une conversation 1-à-1 existe déjà
      const { data: existing } = await supabase.from('conversations').select('id').eq('is_group', false).or(`and(user1_id.eq.${profile.id},user2_id.eq.${userId}),and(user1_id.eq.${userId},user2_id.eq.${profile.id})`).maybeSingle()
      if (existing) { router.push(`/dashboard/messages/${existing.id}`); return }
      
      const { data: newConv, error } = await supabase.from('conversations').insert({ 
        user1_id: profile.id, user2_id: userId, is_group: false, last_message: 'Nouvelle conversation', last_message_at: new Date().toISOString() 
      }).select('id').single()
      if (error) throw error

      // Ajouter les participants
      await supabase.from('conversation_participants').insert([
        { conversation_id: newConv.id, user_id: profile.id },
        { conversation_id: newConv.id, user_id: userId }
      ])

      router.push(`/dashboard/messages/${newConv.id}`)
    } catch (err: any) { setToast('Erreur: ' + err.message) }
    setCreatingConv(false)
  }

  const filteredConversations = conversations.filter(c => {
    if (!search.trim() || !profile) return true
    const name = c.is_group ? c.group_name : (c.user1_id === profile.id ? c.user2?.full_name : c.user1?.full_name)
    return name?.toLowerCase().includes(search.toLowerCase())
  })

  const filteredUsers = allUsers.filter(u => u.full_name?.toLowerCase().includes(userSearch.toLowerCase()))

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin"></div></div>

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 px-5 py-4 sticky top-0 z-50 flex items-center gap-3">
        <Link href="/dashboard" className="text-slate-500 bg-slate-100 p-2 rounded-full"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg></Link>
        <h1 className="text-lg font-black text-slate-900 flex-1">Messages</h1>
      </header>

      <div className="p-4 max-w-lg mx-auto">
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <input type="text" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-4 pr-4 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
          </div>
          <button onClick={() => router.push('/dashboard/messages/new-group')} className="w-12 h-12 bg-sky-500 text-white rounded-2xl flex items-center justify-center shadow-md shrink-0" title="Nouveau groupe">
            <Icons.Group />
          </button>
        </div>

        {filteredConversations.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 mt-4">
            <h3 className="font-bold text-slate-900 mb-1">Aucune conversation</h3>
            <button onClick={openNewMessage} className="px-5 py-2.5 bg-sky-500 text-white font-bold rounded-xl text-sm">Nouveau message</button>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredConversations.map(c => {
              const isGroup = c.is_group
              const other = c.user1_id === profile?.id ? c.user2 : c.user1
              const name = isGroup ? c.group_name : (other?.full_name || 'Utilisateur')
              const avatar = isGroup ? c.group_avatar_url : null
              const unread = unreadCounts[c.id] || 0
              
              return (
                <Link key={c.id} href={`/dashboard/messages/${c.id}`} className={`block border rounded-2xl p-4 shadow-sm ${unread > 0 ? 'bg-sky-50 border-sky-200' : 'bg-white border-slate-200'}`}>
                  <div className="flex items-center gap-3">
                    {avatar ? (
                      <img src={avatar} alt="Groupe" className="w-12 h-12 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white text-lg shrink-0 ${isGroup ? 'bg-emerald-500' : 'bg-gradient-to-br from-sky-400 to-blue-500'}`}>
                        {name.charAt(0) || '?'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1 min-w-0">
                          {isGroup && <Icons.Group />}
                          <p className={`truncate ${unread > 0 ? 'font-black' : 'font-bold'} text-slate-900`}>{name}</p>
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0">{c.last_message_at ? new Date(c.last_message_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <p className={`text-xs truncate ${unread > 0 ? 'text-slate-700 font-medium' : 'text-slate-500'}`}>{c.last_message || 'Nouvelle conversation'}</p>
                        {unread > 0 && <span className="bg-sky-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">{unread}</span>}
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      <button onClick={openNewMessage} className="fixed bottom-24 right-4 z-50 w-14 h-14 bg-sky-500 text-white rounded-full flex items-center justify-center shadow-lg"><svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg></button>

      {isNewMessageOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md shadow-2xl max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center">
              <h2 className="font-bold text-lg">Nouveau message</h2>
              <button onClick={() => setIsNewMessageOpen(false)} className="p-2 bg-slate-100 rounded-full text-slate-500">✕</button>
            </div>
            <div className="p-4 border-b border-slate-100">
              <input type="text" placeholder="Chercher un utilisateur..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredUsers.map(u => (
                <button key={u.id} onClick={() => startConversation(u.id)} disabled={creatingConv} className="w-full flex items-center gap-3 p-4 border-b border-slate-100 text-left hover:bg-slate-50">
                  <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-blue-500 rounded-full flex items-center justify-center font-bold text-white text-sm">{u.full_name?.charAt(0) || '?'}</div>
                  <div className="flex-1 min-w-0"><p className="font-bold text-slate-900 text-sm truncate">{u.full_name}</p><p className="text-[10px] text-slate-500">Niveau {u.level || 1}</p></div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      <BottomNav />
    </main>
  )
}
