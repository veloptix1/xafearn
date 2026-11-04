'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ProfilClient({ profile: initialProfile }: { profile: any }) {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState(initialProfile)
  const [isAnnonceurMode, setIsAnnonceurMode] = useState(profile?.role === 'annonceur')

  const toggleMode = async () => {
    const newMode = !isAnnonceurMode
    setIsAnnonceurMode(newMode)
    const newRole = newMode ? 'annonceur' : 'diffuseur'
    await supabase.from('profiles').update({ role: newRole }).eq('id', profile.id)
    setProfile({ ...profile, role: newRole })
    router.refresh()
  }

  const menuItems = [
    { icon: 'edit', label: 'Modifier le profil', href: '/dashboard/profil/modifier', color: 'text-sky-500', bg: 'bg-sky-50' },
    { icon: 'mail', label: 'Modifier mon email', href: '/dashboard/profil/email', color: 'text-sky-500', bg: 'bg-sky-50' },
    { icon: 'phone', label: 'Changer le numéro de téléphone', href: '/dashboard/profil/telephone', color: 'text-sky-500', bg: 'bg-sky-50' },
    { icon: 'lock', label: 'Modifier mon mot de passe', href: '/dashboard/profil/mot-de-passe', color: 'text-slate-700', bg: 'bg-slate-100' },
    { icon: 'bell', label: 'Notifications', href: '/dashboard/profil/notifications', color: 'text-slate-700', bg: 'bg-slate-100' },
    { icon: 'wallet', label: 'Mes transactions', href: '/dashboard/profil/transactions', color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { icon: 'shield', label: 'Sécurité & Confidentialité', href: '/dashboard/profil/securite', color: 'text-amber-600', bg: 'bg-amber-50' },
    { icon: 'help', label: 'Aide & Support', href: '/dashboard/profil/support', color: 'text-slate-700', bg: 'bg-slate-100' },
  ]

  const getIcon = (name: string) => {
    switch (name) {
      case 'edit': return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      case 'mail': return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      case 'phone': return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
      case 'lock': return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      case 'bell': return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      case 'wallet': return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      case 'shield': return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      case 'help': return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      default: return null
    }
  }

  const levelColor = profile?.level === 3 ? 'from-amber-400 to-amber-600' : profile?.level === 2 ? 'from-slate-300 to-slate-500' : 'from-orange-400 to-orange-600'
  const levelName = profile?.level === 3 ? 'Expert' : profile?.level === 2 ? 'Confirmé' : 'Débutant'

  return (
    <div className="max-w-lg mx-auto">
      {/* Carte de visite */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden mb-6">
        <div className={`h-24 bg-gradient-to-r ${levelColor}`}></div>
        <div className="px-6 pb-6 relative">
          <div className="flex justify-between items-end -mt-10 mb-4">
            <div className="w-20 h-20 bg-white rounded-full p-1 shadow-sm">
              <div className="w-full h-full bg-slate-100 rounded-full flex items-center justify-center text-slate-600 text-3xl font-black border border-slate-200">
                {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
              </div>
            </div>
            <Link href="/dashboard/profil/modifier" className="px-4 py-1.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-full hover:bg-slate-200 transition">
              Modifier
            </Link>
          </div>
          
          <h1 className="text-2xl font-black text-slate-900">{profile?.full_name || 'Utilisateur'}</h1>
          <p className="text-sm text-slate-500 mb-3">{profile?.email}</p>
          
          <div className="flex flex-wrap gap-2">
            <span className={`text-xs font-bold px-3 py-1 rounded-full bg-gradient-to-r ${levelColor} text-white shadow-sm`}>
              Niveau {profile?.level || 1} • {levelName}
            </span>
          </div>
        </div>
      </div>

      {/* Sélecteur de Mode (caché pour les admins) */}
      {profile?.role !== 'admin' && (
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm mb-6">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Mode d'utilisation</p>
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button 
              onClick={() => isAnnonceurMode && toggleMode()} 
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition flex items-center justify-center gap-2 ${!isAnnonceurMode ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
            >
              💰 Diffuseur
            </button>
            <button 
              onClick={() => !isAnnonceurMode && toggleMode()} 
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition flex items-center justify-center gap-2 ${isAnnonceurMode ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500'}`}
            >
              📢 Annonceur
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 text-center">
            {isAnnonceurMode ? 'Tu es en mode annonceur. Crée et gère tes campagnes publicitaires.' : 'Tu es en mode diffuseur. Gagne de l\'argent en publiant des annonces.'}
          </p>
        </div>
      )}

      {/* Menu des options */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden mb-6">
        {menuItems.map((item, index) => (
          <Link 
            key={index}
            href={item.href}
            className="w-full flex items-center justify-between p-4 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition text-left"
          >
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 ${item.bg} rounded-full flex items-center justify-center ${item.color}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {getIcon(item.icon)}
                </svg>
              </div>
              <span className="font-semibold text-slate-800 text-sm">{item.label}</span>
            </div>
            <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
          </Link>
        ))}
      </div>

      {/* Déconnexion */}
      <form action="/auth/signout" method="post">
        <button type="submit" className="w-full py-4 bg-white border border-red-200 text-red-600 font-bold rounded-2xl hover:bg-red-50 transition flex justify-center items-center gap-2 shadow-sm">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          Se déconnecter
        </button>
      </form>
    </div>
  )
}
