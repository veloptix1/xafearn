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
  const [menuConv, setMenuConv] = useState<any>(null)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const load = useCallback(async () => {
    // 🔥 Utiliser getSession au lieu de getUser (plus rapide et fiable)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.replace('/login'); return }

    const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
    if (!prof) return
    setProfile(prof)

    const { data, error } = await supabase
      .from('conversations')
      .select(`id,last_message,last_message_at,last_message_sender_id,user1_id,user2_id,user1:user1_id(id, full_name),user2:user2_id(id, full_name)`)
      .or(`user1_id.eq.${session.user.id},user2_id.eq.${session.user.id}`)
      .order('last_message_at', { ascending: false })

    if (!error) setConversations(data || [])

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

      convChannel = supabase.channel(`convs-${session.user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => load())
        .subscribe()
      msgChannel = supabase.channel(`msgs-${session.user.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => load())
        .subscribe()
    }
    init()
    return () => {
      isMounted = false
      if (convChannel) supabase.removeChannel(convChannel)
      if (msgChannel) supabase.removeChannel(msgChannel)
    }
  }, [load, supabase])

  useEffect(() => {
    const handleFocus = () => load()
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [load])

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
      const { data: existing } = await supabase.from('conversations').select('id').or(`and(user1_id.eq.${profile.id},user2_id.eq.${userId}),and(user1_id.eq.${userId},user2_id.eq.${profile.id})`).maybeSingle()
      if (existing) { router.push(`/dashboard/messages/${existing.id}`); return }
      const { data: newConv, error } = await supabase.from('conversations').insert({ user1_id: profile.id, user2_id: userId, last_message: 'Nouvelle conversation', last_message_at: new Date().toISOString() }).select('id').single()
      if (error) throw error
      router.push(`/dashboard/messages/${newConv.id}`)
    } catch (err: any) { setToast('Erreur: ' + err.message) }
    setCreatingConv(false)
  }

  const deleteConversation = async () => {
    if (!menuConv) return
    if (!confirm('Supprimer cette conversation ? Tous les messages seront effacés définitivement.')) return
    setDeleting(true)
    try {
      const { error } = await supabase.from('conversations').delete().eq('id', menuConv.id)
      if (error) throw error
      setConversations(prev => prev.filter(c => c.id !== menuConv.id))
      setMenuConv(null)
      setToast('Conversation supprimée')
    } catch (err: any) { setToast('Erreur suppression: ' + err.message) }
    setDeleting(false)
  }

  const markAsRead = async () => {
    if (!menuConv || !profile) return
    try {
      await supabase.from('messages').update({ is_read: true }).eq('conversation_id', menuConv.id).neq('sender_id', profile.id).eq('is_read', false)
      setUnreadCounts(prev => ({ ...prev, [menuConv.id]: 0 }))
      setMenuConv(null)
      setToast('Marqué comme lu')
    } catch (err: any) { setToast('Erreur: ' + err.message) }
  }

  const filteredConversations = conversations.filter(c => {
    if (!search.trim() || !profile) return true
    const other = c.user1_id === profile.id ? c.user2 : c.user1
    return other?.full_name?.toLowerCase().includes(search.toLowerCase())
  })
  const filteredUsers = allUsers.filter(u => u.full_name?.toLowerCase().includes(userSearch.toLowerCase()))
  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0)

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin"></div></div>

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 px-5 py-4 sticky top-0 z-50 flex items-center gap-3">
        <Link href="/dashboard" className="text-slate-500 bg-slate-100 p-2 rounded-full"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg></Link>
        <h1 className="text-lg font-black text-slate-900 flex-1">Messages</h1>
        {totalUnread > 0 && <span className="bg-rose-500 text-white text-xs font-bold px-2 py-1 rounded-full">{totalUnread}</span>}
      </header>

      <div className="p-4 max-w-lg mx-auto">
        <div className="relative mb-4">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg></div>
          <input type="text" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
        </div>

        {filteredConversations.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 mt-4">
            <h3 className="font-bold text-slate-900 mb-1">{search ? 'Aucun résultat' : 'Aucune conversation'}</h3>
            <button onClick={openNewMessage} className="px-5 py-2.5 bg-sky-500 text-white font-bold rounded-xl text-sm">Nouveau message</button>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredConversations.map(c => {
              const other = c.user1_id === profile?.id ? c.user2 : c.user1
              const unread = unreadCounts[c.id] || 0
              const isMyMessage = c.last_message_sender_id === profile?.id
              return (
                <div key={c.id} className={`relative border rounded-2xl shadow-sm transition ${unread > 0 ? 'bg-sky-50 border-sky-200' : 'bg-white border-slate-200'}`}>
                  <Link href={`/dashboard/messages/${c.id}`} className="block p-4 pr-14">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-sky-400 to-blue-500 rounded-full flex items-center justify-center font-bold text-white text-lg shrink-0">{other?.full_name?.charAt(0) || '?'}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`truncate ${unread > 0 ? 'font-black' : 'font-bold'} text-slate-900`}>{other?.full_name || 'Utilisateur'}</p>
                          <span className="text-[10px] text-slate-400 shrink-0">{c.last_message_at ? new Date(c.last_message_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <p className={`text-xs truncate ${unread > 0 ? 'text-slate-700 font-medium' : 'text-slate-500'}`}>{isMyMessage && <span className="text-slate-400">Vous : </span>}{c.last_message || 'Nouvelle conversation'}</p>
                          {unread > 0 && <span className="bg-sky-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">{unread}</span>}
                        </div>
                      </div>
                    </div>
                  </Link>
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuConv(c) }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-600 active:bg-slate-100 rounded-full"
                    aria-label="Options"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" /></svg>
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <button onClick={openNewMessage} className="fixed bottom-24 right-4 z-50 w-14 h-14 bg-gradient-to-tr from-sky-400 to-blue-600 text-white rounded-full flex items-center justify-center shadow-lg"><svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg></button>

      {isNewMessageOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md shadow-2xl max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center">
              <h2 className="font-black text-lg">Nouveau message</h2>
              <button onClick={() => setIsNewMessageOpen(false)} className="p-2 bg-slate-100 rounded-full text-slate-500">✕</button>
            </div>
            <div className="p-4 border-b border-slate-100">
              <input type="text" placeholder="Chercher un utilisateur..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredUsers.map(u => (
                <button key={u.id} onClick={() => startConversation(u.id)} disabled={creatingConv} className="w-full flex items-center gap-3 p-4 border-b border-slate-100 text-left">
                  <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-blue-500 rounded-full flex items-center justify-center font-bold text-white text-sm">{u.full_name?.charAt(0) || '?'}</div>
                  <div className="flex-1 min-w-0"><p className="font-bold text-slate-900 text-sm truncate">{u.full_name}</p><p className="text-[10px] text-slate-500">Niveau {u.level || 1}</p></div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {menuConv && (
        <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm" onClick={() => setMenuConv(null)}>
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-4 shadow-2xl animate-in slide-in-from-bottom duration-200" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto mb-4"></div>
            <p className="text-sm font-bold text-slate-900 mb-1 text-center">{menuConv.user1_id === profile?.id ? menuConv.user2?.full_name : menuConv.user1?.full_name}</p>
            <p className="text-xs text-slate-500 text-center mb-4">Que veux-tu faire ?</p>
            <button onClick={() => { setMenuConv(null); router.push(`/dashboard/messages/${menuConv.id}`) }} className="w-full py-3 bg-sky-50 text-sky-600 font-bold rounded-xl text-sm mb-2 active:bg-sky-100">💬 Ouvrir la conversation</button>
            <button onClick={markAsRead} className="w-full py-3 bg-slate-50 text-slate-700 font-bold rounded-xl text-sm mb-2 active:bg-slate-100">✅ Marquer comme lu</button>
            <button onClick={deleteConversation} disabled={deleting} className="w-full py-3 bg-red-50 text-red-600 font-bold rounded-xl text-sm mb-2 active:bg-red-100 disabled:opacity-50">{deleting ? 'Suppression...' : '🗑️ Supprimer la conversation'}</button>
            <button onClick={() => setMenuConv(null)} className="w-full py-3 bg-slate-100 text-slate-700 font-bold rounded-xl text-sm active:bg-slate-200">Annuler</button>
          </div>
        </div>
      )}

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      <BottomNav />
    </main>
  )
}
