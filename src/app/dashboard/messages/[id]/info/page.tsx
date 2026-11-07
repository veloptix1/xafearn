'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function GroupInfoPage() {
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const conversationId = params.id as string

  const [loading, setLoading] = useState(true)
  const [group, setGroup] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [myRole, setMyRole] = useState<string | null>(null)
  const [profileId, setProfileId] = useState<string | null>(null)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return router.replace('/login')
      setProfileId(session.user.id)

      // Récupérer les infos du groupe
      const { data: conv } = await supabase.from('conversations').select('*').eq('id', conversationId).single()
      if (!conv || !conv.is_group) return router.replace('/dashboard/messages')
      setGroup(conv)

      // Récupérer les membres
      const { data: participants } = await supabase
        .from('conversation_participants')
        .select('user_id, is_admin, profiles:user_id(full_name)')
        .eq('conversation_id', conversationId)
      
      setMembers(participants || [])
      
      // Savoir si je suis admin
      const me = participants?.find(p => p.user_id === session.user.id)
      if (me) setMyRole(me.is_admin ? 'admin' : 'member')

      setLoading(false)
    }
    init()
  }, [supabase, router, conversationId])

  const leaveGroup = async () => {
    if (!confirm('Es-tu sûr de vouloir quitter ce groupe ?')) return
    setLeaving(true)
    try {
      const { error } = await supabase
        .from('conversation_participants')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('user_id', profileId)
      
      if (error) throw error
      router.push('/dashboard/messages')
    } catch (err: any) {
      alert('Erreur: ' + err.message)
      setLeaving(false)
    }
  }

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin"></div></div>

  return (
    <main className="min-h-screen bg-slate-50 pb-10">
      <header className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-50 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-slate-500 bg-slate-100 p-2 rounded-full">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="font-bold text-lg text-slate-900 flex-1">Infos du groupe</h1>
      </header>

      <div className="p-4 max-w-lg mx-auto">
        {/* En-tête du groupe */}
        <div className="flex flex-col items-center bg-white rounded-3xl p-6 shadow-sm border border-slate-200 mb-4">
          {group?.group_avatar_url ? (
            <img src={group.group_avatar_url} alt="Groupe" className="w-24 h-24 rounded-full object-cover mb-4 shadow-md" />
          ) : (
            <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center font-bold text-white text-3xl mb-4 shadow-md">
              {group?.group_name?.charAt(0) || '?'}
            </div>
          )}
          <h2 className="text-xl font-black text-slate-900 text-center">{group?.group_name}</h2>
          <p className="text-sm text-slate-500 mt-1">{members.length} membres</p>
        </div>

        {/* Liste des membres */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden mb-4">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
            <h3 className="font-bold text-slate-700 text-sm">Membres du groupe</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {members.map((m) => (
              <div key={m.user_id} className="flex items-center gap-3 p-4">
                <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-blue-500 rounded-full flex items-center justify-center font-bold text-white text-sm shrink-0">
                  {m.profiles?.full_name?.charAt(0) || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 text-sm truncate">{m.profiles?.full_name || 'Utilisateur'}</p>
                  {m.user_id === profileId && <p className="text-[10px] text-sky-600 font-bold">Vous</p>}
                </div>
                {m.is_admin && (
                  <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded-md">Admin</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Bouton Quitter */}
        <button 
          onClick={leaveGroup} 
          disabled={leaving}
          className="w-full py-3.5 bg-red-50 text-red-600 font-bold rounded-2xl text-sm active:bg-red-100 transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {leaving ? (
            'Suppression...'
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              Quitter le groupe
            </>
          )}
        </button>
      </div>
    </main>
  )
}
