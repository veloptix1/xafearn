import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'

async function DashboardData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  if (profile && !profile.is_onboarded) redirect('/onboarding')

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2 space-y-4">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 rounded-full blur-2xl transform translate-x-10 -translate-y-10"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-cyan-500/20 rounded-full blur-2xl transform -translate-x-10 translate-y-10"></div>
          
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <p className="text-slate-400 text-xs font-medium mb-1">Solde disponible</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black">{profile?.balance?.toLocaleString('fr-FR') || '0'}</span>
                <span className="text-sm font-bold text-slate-400">FCFA</span>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/10 px-2 py-1 rounded-md flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-[10px] font-bold text-white uppercase">Actif</span>
            </div>
          </div>

          <div className="relative z-10 mt-4 flex gap-2">
            <Link href="/dashboard/retrait" className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm rounded-lg text-center transition shadow-sm">
              Retirer
            </Link>
            <Link href="/dashboard/historique" className="flex-1 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-sm rounded-lg text-center transition border border-white/5">
              Historique
            </Link>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L11 4.323V3a1 1 0 011-1zm-5 8.274l-.818 2.552c.25.112.526.174.818.174.292 0 .569-.062.818-.174L5 10.274zm2.5 5.528l-1.5 2.5a1 1 0 001.723 1.016l.802-1.338.803 1.338a1 1 0 001.723-1.015l-1.5-2.5a1 1 0 00-1.723 0zm-2.5-5.528L4 7.632l.818 2.552a1.993 1.993 0 00.818-.174c.292 0 .569-.062.818-.174L4 10.274zM10 20a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Niveau Actuel</p>
              <p className="text-lg font-black text-slate-900">Niveau {profile?.level || 1}</p>
            </div>
          </div>
          <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100">
            {profile?.level === 1 ? '0,50 F/vue' : profile?.level === 2 ? '1,25 F/vue' : '1,75 F/vue'}
          </span>
        </div>
      </div>

      <div className="md:col-span-1 space-y-4">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider px-1">Services</h2>
        
        <Link href="/dashboard/annonces" className="block bg-white border border-slate-200 p-4 rounded-2xl shadow-sm hover:border-sky-300 hover:shadow-md transition group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center text-sky-500 group-hover:bg-sky-100 transition">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-900 text-sm">Diffuser / Créer</h3>
              <p className="text-xs text-slate-500">Gérer mes annonces</p>
            </div>
          </div>
        </Link>
        
        {profile?.role === "admin" && (<Link href="/dashboard/admin" className="block bg-amber-50 border border-amber-200 p-4 rounded-2xl shadow-sm hover:border-amber-400 hover:shadow-md transition group mb-4"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg></div><div className="flex-1"><h3 className="font-bold text-amber-900 text-sm">Administration</h3><p className="text-xs text-amber-600">Valider les annonces</p></div></div></Link>)}
<Link href="/dashboard/equipe" className="block bg-white border border-slate-200 p-4 rounded-2xl shadow-sm hover:border-indigo-300 hover:shadow-md transition group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500 group-hover:bg-indigo-100 transition">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-900 text-sm">Mon Équipe</h3>
              <p className="text-xs text-slate-500">Gère tes agents</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-3 sticky top-0 z-50 flex justify-between items-center">
        <div className="text-xl font-black text-slate-900 tracking-tight">
          XAF<span className="text-sky-500">ERAN</span>
        </div>
        <Link href="/dashboard/profil" className="w-9 h-9 bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-200 transition">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </Link>
      </header>
      
      <div className="p-4 md:p-8 max-w-5xl mx-auto w-full mt-4">
        <Suspense fallback={<div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin"></div></div>}>
          <DashboardData />
        </Suspense>
      </div>

      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 px-6 py-2 flex justify-between items-center z-50 md:hidden">
        <Link href="/dashboard" className="flex flex-col items-center gap-1 text-sky-500">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
          <span className="text-[10px] font-bold">Accueil</span>
        </Link>
        <Link href="/dashboard/annonces" className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600 transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
          <span className="text-[10px] font-medium">Annonces</span>
        </Link>
        <Link href="/dashboard/equipe" className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600 transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
          <span className="text-[10px] font-medium">Équipe</span>
        </Link>
        <Link href="/dashboard/profil" className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600 transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          <span className="text-[10px] font-medium">Profil</span>
        </Link>
      </nav>
    </main>
  )
}
