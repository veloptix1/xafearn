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
    <>
      {/* Bloc Principal (Bienvenue + Solde) */}
      <div className="bg-[#1e293b] rounded-3xl p-6 text-white shadow-xl relative overflow-hidden mb-8">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/20 rounded-full blur-2xl"></div>
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-sky-500/20 rounded-full blur-2xl"></div>
        
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-slate-400 text-sm font-medium mb-1">Bonjour,</p>
              <h1 className="text-2xl font-bold">{profile?.full_name?.split(' ')[0] || 'Utilisateur'}</h1>
            </div>
            <div className="bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 rounded-full flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">Actif</span>
            </div>
          </div>

          <div className="mb-2">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Solde disponible</p>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black tracking-tight">{profile?.balance?.toLocaleString('fr-FR') || '0'}</span>
              <span className="text-lg font-bold text-slate-400">FCFA</span>
            </div>
          </div>

          <div className="flex gap-4 text-xs font-medium text-slate-400 mb-6 border-b border-slate-700/50 pb-4">
            <span>Principal: {profile?.balance?.toLocaleString('fr-FR') || '0'} F</span>
            <span className="text-slate-600">|</span>
            <span>Crypto: 0 F ($0.00)</span>
          </div>

          <div className="flex gap-3">
            <Link href="/dashboard/retrait" className="flex-1 py-3 bg-white text-slate-900 font-bold rounded-xl text-center hover:bg-slate-100 transition shadow-sm flex justify-center items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
              Retirer
            </Link>
            <Link href="/dashboard/historique" className="flex-1 py-3 bg-slate-800 text-white font-bold rounded-xl text-center hover:bg-slate-700 transition shadow-sm border border-slate-700 flex justify-center items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Historique
            </Link>
          </div>
        </div>
      </div>

      {/* Section Niveau */}
      <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm mb-8 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Niveau Actuel</p>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black text-slate-900">Niveau {profile?.level || 1}</span>
            <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md border border-amber-200">
              {profile?.level === 1 ? '0,50 F/vue' : profile?.level === 2 ? '1,25 F/vue' : '1,75 F/vue'}
            </span>
          </div>
        </div>
        <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-500 border border-amber-100">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L11 4.323V3a1 1 0 011-1zm-5 8.274l-.818 2.552c.25.112.526.174.818.174.292 0 .569-.062.818-.174L5 10.274zm2.5 5.528l-1.5 2.5a1 1 0 001.723 1.016l.802-1.338.803 1.338a1 1 0 001.723-1.015l-1.5-2.5a1 1 0 00-1.723 0zm-2.5-5.528L4 7.632l.818 2.552a1.993 1.993 0 00.818-.174c.292 0 .569-.062.818-.174L4 10.274zM10 20a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
        </div>
      </div>

      {/* Section Services */}
      <h2 className="text-lg font-bold text-slate-900 mb-4 px-1">Services</h2>
      <div className="grid grid-cols-2 gap-4">
        <Link href="/dashboard/annonces" className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:border-sky-300 hover:shadow-md transition group">
          <div className="w-10 h-10 bg-sky-50 rounded-xl mb-4 flex items-center justify-center text-sky-500 group-hover:bg-sky-100 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
          </div>
          <h3 className="font-bold text-slate-900 text-sm mb-1">Diffuser</h3>
          <p className="text-xs text-slate-500">Gagner par vue</p>
        </Link>
        
        <Link href="/dashboard/equipe" className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:border-sky-300 hover:shadow-md transition group">
          <div className="w-10 h-10 bg-indigo-50 rounded-xl mb-4 flex items-center justify-center text-indigo-500 group-hover:bg-indigo-100 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          </div>
          <h3 className="font-bold text-slate-900 text-sm mb-1">Équipe</h3>
          <p className="text-xs text-slate-500">Gérer mes agents</p>
        </Link>
      </div>
    </>
  )
}

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex justify-between items-center">
        <div className="text-xl font-black text-slate-900 tracking-tight">
          XAF<span className="text-sky-500">ERAN</span>
        </div>
        <Link href="/dashboard/profil" className="w-10 h-10 bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-200 transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </Link>
      </header>
      
      <div className="p-4 max-w-lg mx-auto w-full mt-2">
        <Suspense fallback={
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin"></div>
            <p className="text-slate-400 mt-4 text-sm font-medium">Chargement de votre espace...</p>
          </div>
        }>
          <DashboardData />
        </Suspense>
      </div>

      {/* Barre de navigation bas (Mobile) */}
      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 px-6 py-2 flex justify-between items-center z-50">
        <Link href="/dashboard" className="flex flex-col items-center gap-1 text-sky-500">
          <div className="p-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
          </div>
          <span className="text-[10px] font-bold">Accueil</span>
        </Link>
        <Link href="/dashboard/annonces" className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600 transition">
          <div className="p-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
          </div>
          <span className="text-[10px] font-medium">Annonces</span>
        </Link>
        <Link href="/dashboard/equipe" className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600 transition">
          <div className="p-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
          </div>
          <span className="text-[10px] font-medium">Équipe</span>
        </Link>
        <Link href="/dashboard/profil" className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600 transition">
          <div className="p-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          </div>
          <span className="text-[10px] font-medium">Profil</span>
        </Link>
      </nav>
    </main>
  )
}
