'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function NewGroupPage() {
  const supabase = createClient()
  const router = useRouter()
  
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [groupAvatar, setGroupAvatar] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return router.replace('/login')
      
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      setProfile(prof)

      const { data: users } = await supabase.from('profiles').select('id, full_name, level').neq('id', session.user.id).order('full_name')
      setAllUsers(users || [])
      setLoading(false)
    }
    init()
  }, [supabase, router])

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setGroupAvatar(file)
      setAvatarPreview(URL.createObjectURL(file))
    }
  }

  const toggleUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    )
  }

  const createGroup = async () => {
    if (!groupName.trim()) return alert('Donne un nom au groupe')
    if (selectedUsers.length === 0) return alert('Sélectionne au moins un membre')
    if (!profile) return

    setCreating(true)
    try {
      let avatarUrl = null
      
      // 1. Upload de l'image du groupe si présente
      if (groupAvatar) {
        const ext = groupAvatar.name.split('.').pop() || 'jpg'
        const fileName = `group-${Date.now()}.${ext}`
        const { error: uploadErr } = await supabase.storage.from('campaign-images').upload(fileName, groupAvatar)
        if (uploadErr) throw uploadErr
        const { data: { publicUrl } } = supabase.storage.from('campaign-images').getPublicUrl(fileName)
        avatarUrl = publicUrl
      }

      // 2. Appel de la fonction RPC pour créer le groupe et ajouter les participants
      const { data: newConvId, error: rpcErr } = await supabase.rpc('create_group_conversation', {
        group_name: groupName.trim(),
        group_avatar_url: avatarUrl,
        member_ids: selectedUsers
      })

      if (rpcErr) throw rpcErr

      // 3. Redirection vers le nouveau groupe
      router.push(`/dashboard/messages/${newConvId}`)
    } catch (err: any) {
      alert('Erreur: ' + err.message)
    }
    setCreating(false)
  }

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin"></div></div>

  const filteredUsers = allUsers.filter(u => u.full_name?.toLowerCase().includes(search.toLowerCase()))

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-50 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-slate-500 bg-slate-100 p-2 rounded-full">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="font-bold text-lg text-slate-900 flex-1">Nouveau groupe</h1>
        <button onClick={createGroup} disabled={creating || !groupName.trim() || selectedUsers.length === 0} className="text-sky-600 font-bold text-sm disabled:opacity-50">
          {creating ? 'Création...' : 'Créer'}
        </button>
      </header>

      <div className="p-4 max-w-lg mx-auto">
        {/* Section Image + Nom */}
        <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-slate-200 flex items-center gap-4">
          <label className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center cursor-pointer overflow-hidden shrink-0 relative">
            {avatarPreview ? (
              <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            )}
            <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
          </label>
          <div className="flex-1">
            <label className="text-xs font-bold text-slate-500 mb-1 block">Nom du groupe</label>
            <input type="text" value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="Ex: Les investisseurs" className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-sky-400" maxLength={30} />
          </div>
        </div>

        {/* Section Membres */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <p className="font-bold text-sm text-slate-900">Membres ({selectedUsers.length})</p>
          </div>
          
          <input type="text" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="w-full p-2.5 mb-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-sky-400" />

          <div className="max-h-[50vh] overflow-y-auto -mx-4 px-4">
            {filteredUsers.map(u => {
              const isSelected = selectedUsers.includes(u.id)
              return (
                <button key={u.id} onClick={() => toggleUser(u.id)} className="w-full flex items-center gap-3 py-2 border-b border-slate-100 last:border-0 text-left">
                  <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-blue-500 rounded-full flex items-center justify-center font-bold text-white text-sm shrink-0">{u.full_name?.charAt(0) || '?'}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 text-sm truncate">{u.full_name}</p>
                    <p className="text-[10px] text-slate-500">Niveau {u.level || 1}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'bg-sky-500 border-sky-500' : 'border-slate-300'}`}>
                    {isSelected && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </main>
  )
}
