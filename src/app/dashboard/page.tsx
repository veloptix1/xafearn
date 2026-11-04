'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import NotificationBell from '@/components/NotificationBell'

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

  const toggleMode = async () => {
    const newMode = !isAnnonceurMode
    setIsAnnonceurMode(newMode)
    const newRole = newMode ? 'annonceur' : 'diffuseur'
    await supabase.from('profiles').update({ role: newRole }).eq('id', profile.id)
    setProfile({ ...profile, role: newRole })
  }

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">Chargement...</div>

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-3 sticky top-0 z-50 flex justify-between items-center">
        <img src="/logo.png" alt="XAFERAN" className="h-7 w-auto object-contain" />
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
        
        {/* Sélecteur de Mode */}
        <div className="flex justify-center mb-6">
          <div className="bg-slate-200 p-1 rounded-full flex shadow-inner">
            <button 
              onClick={() => isAnnonceurMode && toggleMode()} 
              className={`px-6 py-2 rounded-full text-xs font-bold transition flex items-center gap-2 ${!isAnnonceurMode ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
            >
              💰 Diffuseur
            </button>
            <button 
              onClick={() => !isAnnonceurMode && toggleMode()} 
              className={`px-6 py-2 rounded-full text-xs font-bold transition flex items-center gap-2 ${isAnnonceurMode ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500'}`}
            >
              📢 Annonceur
            </button>
          </div>
        </div>

        {/* VUE DIFFUSEUR */}
        {!isAnnonceurMode && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
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
                </div>
              </Link>
            </div>

            <div className="md:col-span-1 space-y-4">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider px-1">Services Diffuseur</h2>
              <Link href="/dashboard/annonces" className="block bg-white border border-slate-200 p-4 rounded-2xl shadow-sm hover:border-sky-300 hover:shadow-md transition group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center text-sky-500 group-hover:bg-sky-100 transition">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
                  </div>
                  <div className="flex-1"><h3 className="font-bold text-slate-900 text-sm">Diffuser</h3><p className="text-xs text-slate-500">Gérer mes annonces</p></div>
                </div>
              </Link>
              <Link href="/dashboard/statut-ia" className="block bg-purple-50 border border-purple-200 p-4 rounded-2xl shadow-sm hover:border-purple-400 transition group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 group-hover:bg-purple-200 transition">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  </div>
                  <div className="flex-1"><h3 className="font-bold text-purple-900 text-sm">Statut IA</h3><p className="text-xs text-purple-600">Générer avec l'IA</p></div>
                </div>
              </Link>
            </div>
          </div>
        )}

        {/* VUE ANNONCEUR */}
        {isAnnonceurMode && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                  <p className="text-amber-100 text-xs font-bold uppercase tracking-wider mb-1">Espace Annonceur</p>
                  <h1 className="text-2xl font-black mb-4">Développe ton business</h1>
                  <Link href="/dashboard/annonces/creer" className="inline-block px-6 py-3 bg-white text-amber-700 font-bold rounded-xl hover:bg-slate-50 transition shadow-md">
                    + Créer une campagne
                  </Link>
                </div>
              </div>

              <Link href="/dashboard/annonceur/analytics" className="block bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:border-emerald-300 hover:shadow-md transition">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-bold text-slate-900">Tableau de bord</h2>
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                </div>
                <p className="text-sm text-slate-500 mb-4">Suis tes performances en temps réel.</p>
                <div className="flex gap-4">
                  <div className="flex-1 bg-slate-50 p-3 rounded-xl text-center">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Vues</p>
                    <p className="text-lg font-black text-slate-900">--</p>
                  </div>
                  <div className="flex-1 bg-slate-50 p-3 rounded-xl text-center">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Clics</p>
                    <p className="text-lg font-black text-slate-900">--</p>
                  </div>
                </div>
              </Link>
            </div>

            <div className="md:col-span-1 space-y-4">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider px-1">Outils Annonceur</h2>
              <Link href="/dashboard/annonces/creer" className="block bg-white border border-slate-200 p-4 rounded-2xl shadow-sm hover:border-amber-300 hover:shadow-md transition group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500 group-hover:bg-amber-100 transition">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                  </div>
                  <div className="flex-1"><h3 className="font-bold text-slate-900 text-sm">Créer</h3><p className="text-xs text-slate-500">Nouvelle campagne</p></div>
                </div>
              </Link>
              <Link href="/dashboard/annonceur/analytics" className="block bg-emerald-50 border border-emerald-200 p-4 rounded-2xl shadow-sm hover:border-emerald-400 transition group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 group-hover:bg-emerald-200 transition">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                  </div>
                  <div className="flex-1"><h3 className="font-bold text-emerald-900 text-sm">Statistiques</h3><p className="text-xs text-emerald-600">Voir mes résultats</p></div>
                </div>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Bottom nav mobile */}
      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 px-6 py-2 flex justify-between items-center z-50 md:hidden">
        <Link href="/dashboard" className="flex flex-col items-center gap-1 text-sky-500">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
          <span className="text-[10px] font-bold">Accueil</span>
        </Link>
        <Link href="/dashboard/annonces" className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600 transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
          <span className="text-[10px] font-medium">Annonces</span>
        </Link>
        <Link href="/dashboard/profil" className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600 transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          <span className="text-[10px] font-medium">Profil</span>
        </Link>
      </nav>
    </main>
  )
}
