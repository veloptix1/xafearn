'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function GroupSettingsPage() {
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const conversationId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [profileId, setProfileId] = useState<string | null>(null)
  
  const [groupName, setGroupName] = useState('')
  const [groupAvatar, setGroupAvatar] = useState<string | null>(null)
  const [newAvatarFile, setNewAvatarFile] = useState<File | null>(null)
  
  const [members, setMembers] = useState<any[]>([])
  const [showAddMember, setShowAddMember] = useState(false)
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [selectedNewMembers, setSelectedNewMembers] = useState<string[]>([])
  const [userSearch, setUserSearch] = useState('')

  const loadData = async (currentUserId: string) => {
    const { data: conv } = await supabase.from('conversations').select('*').eq('id', conversationId).single()
    if (!conv || !conv.is_group) return router.replace('/dashboard/messages')
    
    setGroupName(conv.group_name || '')
    setGroupAvatar(conv.group_avatar_url)

    const { data: participants } = await supabase
      .from('conversation_participants')
      .select('user_id, is_admin')
      .eq('conversation_id', conversationId)
    
    if (participants && participants.length > 0) {
      const userIds = participants.map(p => p.user_id)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, level')
        .in('id', userIds)

      const formattedMembers = participants.map(p => {
        const profile = profiles?.find(prof => prof.id === p.user_id)
        return {
          user_id: p.user_id,
          is_admin: p.is_admin,
          profile: profile || { full_name: 'Utilisateur inconnu' }
        }
      })
      setMembers(formattedMembers)
      const me = formattedMembers.find(m => m.user_id === currentUserId)
      setIsAdmin(me?.is_admin || false)
    }

    const { data: users } = await supabase.from('profiles').select('id, full_name, level').order('full_name')
    setAllUsers(users || [])
    setLoading(false)
  }

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return router.replace('/login')
      setProfileId(session.user.id)
      await loadData(session.user.id)
    }
    init()
  }, [supabase, router, conversationId])

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setNewAvatarFile(file)
      setGroupAvatar(URL.createObjectURL(file))
    }
  }

  const saveChanges = async () => {
    if (!groupName.trim()) return alert('Le nom ne peut pas être vide')
    setSaving(true)
    try {
      let avatarUrl = groupAvatar
      if (newAvatarFile) {
        const ext = newAvatarFile.name.split('.').pop() || 'jpg'
        const fileName = `group-${Date.now()}.${ext}`
        const { error: uploadErr } = await supabase.storage.from('campaign-images').upload(fileName, newAvatarFile)
        if (uploadErr) throw uploadErr
        const { data: { publicUrl } } = supabase.storage.from('campaign-images').getPublicUrl(fileName)
        avatarUrl = publicUrl
      }

      const { error } = await supabase.from('conversations').update({
        group_name: groupName.trim(),
        group_avatar_url: avatarUrl
      }).eq('id', conversationId)

      if (error) throw error
      alert('Paramètres enregistrés !')
      setNewAvatarFile(null)
    } catch (err: any) {
      alert('Erreur: ' + err.message)
    }
    setSaving(false)
  }

  const addMembers = async () => {
    if (selectedNewMembers.length === 0) return
    setSaving(true)
    try {
      const newParticipants = selectedNewMembers.map(id => ({
        conversation_id: conversationId,
        user_id: id,
        is_admin: false
      }))
      const { error } = await supabase.from('conversation_participants').insert(newParticipants)
      if (error) throw error
      
      setSelectedNewMembers([])
      setShowAddMember(false)
      await loadData(profileId!)
      alert('Membres ajoutés !')
    } catch (err: any) {
      alert('Erreur: ' + err.message)
    }
    setSaving(false)
  }

  const removeMember = async (userId: string) => {
    if (userId === profileId) return alert('Utilise le bouton "Quitter" pour partir.')
    if (!confirm('Retirer ce membre du groupe ?')) return
    setSaving(true)
    try {
      const { error } = await supabase.from('conversation_participants').delete().eq('conversation_id', conversationId).eq('user_id', userId)
      if (error) throw error
      await loadData(profileId!)
    } catch (err: any) {
      alert('Erreur: ' + err.message)
    }
    setSaving(false)
  }

  const toggleAdmin = async (userId: string, currentStatus: boolean) => {
    if (userId === profileId) return alert('Tu ne peux pas changer ton propre rôle.')
    setSaving(true)
    try {
      const { error } = await supabase.from('conversation_participants').update({ is_admin: !currentStatus }).eq('conversation_id', conversationId).eq('user_id', userId)
      if (error) throw error
      await loadData(profileId!)
    } catch (err: any) {
      alert('Erreur: ' + err.message)
    }
    setSaving(false)
  }

  const leaveGroup = async () => {
    if (!confirm('Es-tu sûr de vouloir quitter ce groupe ?')) return
    setSaving(true)
    try {
      const { error } = await supabase.from('conversation_participants').delete().eq('conversation_id', conversationId).eq('user_id', profileId)
      if (error) throw error
      router.push('/dashboard/messages')
    } catch (err: any) {
      alert('Erreur: ' + err.message)
      setSaving(false)
    }
  }

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin"></div></div>

  const availableUsers = allUsers.filter(u => !members.some(m => m.user_id === u.id) && u.full_name?.toLowerCase().includes(userSearch.toLowerCase()))

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-50 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-slate-500 bg-slate-100 p-2 rounded-full">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="font-bold text-lg text-slate-900 flex-1">Paramètres du groupe</h1>
      </header>

      <div className="p-4 max-w-lg mx-auto space-y-4">
        
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex items-center gap-4">
          <label className={`w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center overflow-hidden shrink-0 relative ${isAdmin ? 'cursor-pointer' : ''}`}>
            {groupAvatar ? (
              <img src={groupAvatar} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-slate-400">{groupName.charAt(0)}</span>
            )}
            {isAdmin && <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />}
          </label>
          <div className="flex-1">
            {isAdmin ? (
              <>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Nom du groupe</label>
                <input type="text" value={groupName} onChange={e => setGroupName(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-sky-400" maxLength={30} />
              </>
            ) : (
              <>
                <p className="font-bold text-slate-900 text-lg">{groupName}</p>
                <p className="text-xs text-slate-500">Seul un admin peut modifier</p>
              </>
            )}
          </div>
        </div>

        {isAdmin && (
          <button onClick={saveChanges} disabled={saving} className="w-full py-3 bg-sky-500 text-white font-bold rounded-xl text-sm shadow-md disabled:opacity-50">
            {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </button>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <h3 className="font-bold text-slate-700 text-sm">Membres ({members.length})</h3>
            {isAdmin && (
              <button onClick={() => setShowAddMember(!showAddMember)} className="text-xs font-bold text-sky-600 bg-sky-100 px-2 py-1 rounded-md">
                + Ajouter
              </button>
            )}
          </div>

          {showAddMember && isAdmin && (
            <div className="p-4 border-b border-slate-100 bg-sky-50/50">
              <input type="text" placeholder="Chercher un utilisateur..." value={userSearch} onChange={e => setUserSearch(e.target.value)} className="w-full p-2 mb-2 bg-white border border-slate-200 rounded-lg text-sm" />
              <div className="max-h-40 overflow-y-auto mb-2 space-y-1">
                {availableUsers.map(u => (
                  <label key={u.id} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-100 cursor-pointer hover:bg-slate-50">
                    <input type="checkbox" checked={selectedNewMembers.includes(u.id)} onChange={(e) => {
                      if (e.target.checked) setSelectedNewMembers([...selectedNewMembers, u.id])
                      else setSelectedNewMembers(selectedNewMembers.filter(id => id !== u.id))
                    }} className="w-4 h-4 text-sky-500 rounded" />
                    <span className="text-sm font-medium text-slate-700">{u.full_name}</span>
                  </label>
                ))}
                {availableUsers.length === 0 && <p className="text-xs text-slate-500 text-center py-2">Aucun utilisateur trouvé.</p>}
              </div>
              <div className="flex gap-2">
                <button onClick={addMembers} disabled={selectedNewMembers.length === 0 || saving} className="flex-1 py-2 bg-sky-500 text-white font-bold rounded-lg text-xs disabled:opacity-50">Ajouter</button>
                <button onClick={() => setShowAddMember(false)} className="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg text-xs">Annuler</button>
              </div>
            </div>
          )}

          <div className="divide-y divide-slate-100 max-h-[40vh] overflow-y-auto">
            {members.map((m) => (
              <div key={m.user_id} className="flex items-center gap-3 p-3">
                <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-blue-500 rounded-full flex items-center justify-center font-bold text-white text-sm shrink-0">
                  {m.profile?.full_name?.charAt(0) || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 text-sm truncate">{m.profile?.full_name || 'Utilisateur'}</p>
                  {m.is_admin && <p className="text-[10px] font-bold text-amber-600">Admin</p>}
                </div>
                {isAdmin && m.user_id !== profileId && (
                  <div className="flex gap-1">
                    <button onClick={() => toggleAdmin(m.user_id, m.is_admin)} className={`p-1.5 rounded-md text-[10px] font-bold ${m.is_admin ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                      {m.is_admin ? 'Retirer Admin' : 'Nommer Admin'}
                    </button>
                    <button onClick={() => removeMember(m.user_id)} className="p-1.5 bg-red-100 text-red-600 rounded-md">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 🔥 Bouton Quitter le groupe */}
        <div className="pt-2">
          <button 
            onClick={leaveGroup} 
            disabled={saving}
            className="w-full py-3.5 bg-red-50 text-red-600 font-bold rounded-2xl text-sm active:bg-red-100 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            Quitter le groupe
          </button>
        </div>
      </div>
    </main>
  )
}
