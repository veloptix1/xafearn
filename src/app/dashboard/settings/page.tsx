'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import BottomNav from '@/components/BottomNav'

export default function SettingsPage() {
  const supabase = createClient()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [userId, setUserId] = useState<string | null>(null)

  // Champs du profil
  const [fullName, setFullName] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [newAvatarFile, setNewAvatarFile] = useState<File | null>(null)
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return router.replace('/login')
      setUserId(session.user.id)

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      if (prof) {
        setProfile(prof)
        setFullName(prof.full_name || '')
        setBio(prof.bio || '')
        setAvatarUrl(prof.avatar_url || null)
        setDarkMode(prof.dark_mode || false)
      }
      setLoading(false)
    }
    init()
  }, [supabase, router])

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setNewAvatarFile(file)
      setAvatarUrl(URL.createObjectURL(file))
    }
  }

  const saveProfile = async () => {
    if (!fullName.trim()) return alert('Le nom ne peut pas être vide')
    setSaving(true)
    try {
      let newAvatarUrl = avatarUrl
      
      // Upload de la nouvelle photo
      if (newAvatarFile) {
        const ext = newAvatarFile.name.split('.').pop() || 'jpg'
        const fileName = `avatar-${userId}-${Date.now()}.${ext}`
        const { error: uploadErr } = await supabase.storage.from('campaign-images').upload(fileName, newAvatarFile)
        if (uploadErr) throw uploadErr
        const { data: { publicUrl } } = supabase.storage.from('campaign-images').getPublicUrl(fileName)
        newAvatarUrl = publicUrl
      }

      const { error } = await supabase.from('profiles').update({
        full_name: fullName.trim(),
        bio: bio.trim(),
        avatar_url: newAvatarUrl,
        dark_mode: darkMode
      }).eq('id', userId)

      if (error) throw error
      alert('Profil mis à jour avec succès !')
      setNewAvatarFile(null)
    } catch (err: any) {
      alert('Erreur: ' + err.message)
    }
    setSaving(false)
  }

  const handleLogout = async () => {
    if (!confirm('Voulez-vous vraiment vous déconnecter ?')) return
    await supabase.auth.signOut()
    router.push('/login')
  }

  const toggleDarkMode = async () => {
    const newValue = !darkMode
    setDarkMode(newValue)
    await supabase.from('profiles').update({ dark_mode: newValue }).eq('id', userId)
    // Note : pour appliquer le mode sombre, il faudra ajouter une classe sur <html> (on verra ça plus tard)
  }

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin"></div></div>

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white border-b border-slate-200 px-5 py-4 sticky top-0 z-50 flex items-center gap-3">
        <Link href="/dashboard" className="text-slate-500 bg-slate-100 p-2 rounded-full">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-lg font-black text-slate-900 flex-1">Paramètres</h1>
      </header>

      <div className="p-4 max-w-lg mx-auto space-y-4">
        
        {/* Section Profil */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200">
          <h2 className="font-bold text-slate-900 mb-4">Mon Profil</h2>
          
          <div className="flex items-center gap-4 mb-4">
            <label className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center cursor-pointer overflow-hidden shrink-0 border-2 border-white shadow-md relative">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-bold text-slate-400">{fullName.charAt(0) || '?'}</span>
              )}
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </div>
              <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
            </label>
            <div className="flex-1">
              <p className="font-bold text-slate-900">{fullName || 'Utilisateur'}</p>
              <p className="text-xs text-slate-500">Niveau {profile?.level || 1}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">Nom complet</label>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-sky-400" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">Bio (optionnel)</label>
              <textarea value={bio} onChange={e => setBio(e.target.value)} rows={2} placeholder="Parle de toi..." className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-sky-400 resize-none" maxLength={150} />
            </div>
            <button onClick={saveProfile} disabled={saving} className="w-full py-3 bg-sky-500 text-white font-bold rounded-xl text-sm shadow-md disabled:opacity-50">
              {saving ? 'Enregistrement...' : 'Enregistrer le profil'}
            </button>
          </div>
        </div>

        {/* Section Préférences */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
            <h2 className="font-bold text-slate-700 text-sm">Préférences</h2>
          </div>
          
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm">Mode sombre</p>
                <p className="text-[10px] text-slate-500">Bientôt disponible</p>
              </div>
            </div>
            <button onClick={toggleDarkMode} className={`w-12 h-6 rounded-full transition-colors relative ${darkMode ? 'bg-sky-500' : 'bg-slate-300'}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${darkMode ? 'translate-x-6' : 'translate-x-0'}`}></span>
            </button>
          </div>

          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm">Notifications</p>
                <p className="text-[10px] text-slate-500">Gérer les alertes</p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded-md">Activé</span>
          </div>
        </div>

        {/* Section Compte */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
            <h2 className="font-bold text-slate-700 text-sm">Compte</h2>
          </div>
          
          <button onClick={handleLogout} className="w-full flex items-center justify-between p-4 border-b border-slate-100 hover:bg-red-50 transition group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              </div>
              <p className="font-bold text-red-600 text-sm">Se déconnecter</p>
            </div>
            <svg className="w-5 h-5 text-red-400 group-hover:translate-x-1 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
          </button>

          <div className="p-4 text-center">
            <p className="text-[10px] text-slate-400">Xafearn v1.0.0</p>
          </div>
        </div>
      </div>

      <BottomNav />
    </main>
  )
}
