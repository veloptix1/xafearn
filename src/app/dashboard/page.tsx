'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import NotificationBell from '@/components/NotificationBell'
import WelcomePopup from '@/components/WelcomePopup'

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isAnnonceurMode, setIsAnnonceurMode] = useState(false)

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) {
        if (!data.is_onboarded) { router.push('/onboarding'); return }
        setProfile(data)
        setIsAnnonceurMode(data.role === 'annonceur')
      }
      setLoading(false)
    }
    loadData()
  }, [router, supabase])

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">Chargement...</div>

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <WelcomePopup />
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-3 sticky top-0 z-50 flex justify-between items-center">
        <img src="/logo.png" alt="XAFEARN" className="h-7 w-auto object-contain" />
        <div className="flex items-center gap-2">
          <NotificationBell userId={profile.id} />
          <Link href="/dashboard/profil" className="w-9 h-9 bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-200 transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </Link>
        </div>
      </header>
      
      <div className="p-4 md:p-8 max-w-5xl mx-auto w-full mt-4">
        
        {/* VUE DIFFUSEUR */}
        {!isAnnonceurMode ? (
          <div className="space-y-4">
            
            {/* Carte Solde */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 rounded-full blur-2xl transform translate-x-10 -translate-y-10"></div>
              <div className="relative z-10 flex justify-between items-start">
                <div>
                  <p className="text-slate-400 text-xs font-medium mb-1">Solde disponible</p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-black">{profile?.balance?.toLocaleString('fr-FR') || '0'}</span>
                    <span className="text-sm font-bold text-slate-400">FCFA</span>
                  </div>
                </div>
              </div>
              <div className="relative z-10 mt-4 flex gap-2">
                <Link href="/dashboard/retrait" className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm rounded-lg text-center transition">Retirer</Link>
                <Link href="/dashboard/historique" className="flex-1 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-sm rounded-lg text-center transition border border-white/5">Historique</Link>
              </div>
            </div>

            {/* Carte Niveau */}
            <Link href="/dashboard/niveaux" className="block bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex items-center justify-between hover:border-sky-300 hover:shadow-md transition">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L11 4.323V3a1 1 0 011-1zm-5 8.274l-.818 2.552c.25.112.526.174.818.174.292 0 .569-.062.818-.174L5 10.274zm2.5 5.528l-1.5 2.5a1 1 0 001.723 1.016l.802-1.338.803 1.338a1 1 0 001.723-1.015l-1.5-2.5a1 1 0 00-1.723 0zm-2.5-5.528L4 7.632l.818 2.552a1.993 1.993 0 00.818-.174c.292 0 .569-.062.818-.174L4 10.274zM10 20a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Niveau Actuel</p>
                  <p className="text-lg font-black text-slate-900">Niveau {profile?.level || 1}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100">
                  {profile?.level === 1 ? '0,50 F/vue' : profile?.level === 2 ? '1,25 F/vue' : '1,75 F/vue'}
                </span>
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
              </div>
            </Link>

            {/* Services */}
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider px-1 pt-2">Services Diffuseur</h2>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/dashboard/annonces" className="block bg-white border border-slate-200 p-4 rounded-2xl shadow-sm hover:border-sky-300 hover:shadow-md transition group">
                <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center text-sky-500 group-hover:bg-sky-100 transition mb-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Diffuser</h3>
                <p className="text-[10px] text-slate-500">Gérer mes annonces</p>
              </Link>

              <Link href="/dashboard/equipe" className="block bg-white border border-slate-200 p-4 rounded-2xl shadow-sm hover:border-indigo-300 hover:shadow-md transition group">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500 group-hover:bg-indigo-100 transition mb-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Équipe</h3>
                <p className="text-[10px] text-slate-500">Gérer mes agents</p>
              </Link>

              <Link href="/dashboard/statut-ia" className="block bg-purple-50 border border-purple-200 p-4 rounded-2xl shadow-sm hover:border-purple-400 transition group">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 group-hover:bg-purple-200 transition mb-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <h3 className="font-bold text-purple-900 text-sm">Statut IA</h3>
                <p className="text-[10px] text-purple-600">Générer avec l'IA</p>
              </Link>

              <Link href="/dashboard/statut-flash" className="block bg-rose-50 border border-rose-200 p-4 rounded-2xl shadow-sm hover:border-rose-400 transition group">
                <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center text-rose-600 group-hover:bg-rose-200 transition mb-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <h3 className="font-bold text-rose-900 text-sm">Statut Flash</h3>
                <p className="text-[10px] text-rose-600">Offres limitées</p>
              </Link>

              <Link href="/dashboard/flyers" className="block bg-cyan-50 border border-cyan-200 p-4 rounded-2xl shadow-sm hover:border-cyan-400 transition group">
                <div className="w-10 h-10 bg-cyan-100 rounded-xl flex items-center justify-center text-cyan-600 group-hover:bg-cyan-200 transition mb-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
                <h3 className="font-bold text-cyan-900 text-sm">Flyers</h3>
                <p className="text-[10px] text-cyan-600">Affiches pro</p>
              </Link>

              <Link href="/dashboard/video-promo" className="block bg-fuchsia-50 border border-fuchsia-200 p-4 rounded-2xl shadow-sm hover:border-fuchsia-400 transition group">
                <div className="w-10 h-10 bg-fuchsia-100 rounded-xl flex items-center justify-center text-fuchsia-600 group-hover:bg-fuchsia-200 transition mb-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                </div>
                <h3 className="font-bold text-fuchsia-900 text-sm">Vidéo Promo</h3>
                <p className="text-[10px] text-fuchsia-600">Visuels animés</p>
              </Link>

              <Link href="/dashboard/coffres" className="block bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 p-4 rounded-2xl shadow-sm hover:border-amber-400 transition group relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-amber-500 text-white text-[8px] font-bold px-2 py-0.5 rounded-bl-lg">NEW</div>
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 group-hover:bg-amber-200 transition mb-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <h3 className="font-bold text-amber-900 text-sm">Trésors</h3>
                <p className="text-[10px] text-amber-600">Gagne des coffres</p>
              </Link>
            </div>
          </div>
        ) : (
          // VUE ANNONCEUR
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg">
              <p className="text-amber-100 text-xs font-bold uppercase tracking-wider mb-1">Espace Annonceur</p>
              <h1 className="text-2xl font-black mb-4">Développe ton business</h1>
              <Link href="/dashboard/annonces/creer" className="inline-block px-6 py-3 bg-white text-amber-700 font-bold rounded-xl hover:bg-slate-50 transition shadow-md">
                + Créer une campagne
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link href="/dashboard/annonceur/analytics" className="block bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:border-emerald-300 hover:shadow-md transition">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                  </div>
                  <h3 className="font-bold text-slate-900">Tableau de bord</h3>
                </div>
                <p className="text-sm text-slate-500">Suis les performances de tes campagnes.</p>
              </Link>

              <Link href="/dashboard/annonces" className="block bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:border-sky-300 hover:shadow-md transition">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center text-sky-500">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
                  </div>
                  <h3 className="font-bold text-slate-900">Mes campagnes</h3>
                </div>
                <p className="text-sm text-slate-500">Voir et gérer toutes tes annonces.</p>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Bottom nav mobile */}
      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 px-2 py-2 flex justify-between items-center z-50 md:hidden">
        <Link href="/dashboard" className="flex flex-col items-center gap-1 text-sky-500">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
          <span className="text-[10px] font-bold">Accueil</span>
        </Link>
        <Link href="/dashboard/annonces" className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600 transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
          <span className="text-[10px] font-medium">Annonces</span>
        </Link>
        <Link href="/dashboard/taches" className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600 transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
          <span className="text-[10px] font-medium">Tâches</span>
        </Link>
        <Link href="/dashboard/reseau" className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600 transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
          <span className="text-[10px] font-medium">Réseau</span>
        </Link>
        <Link href="/dashboard/profil" className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600 transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          <span className="text-[10px] font-medium">Profil</span>
        </Link>
      </nav>
    </main>
  )
}
