'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) {
        if (!data.is_onboarded) { router.push('/onboarding'); return }
        setProfile(data)
      }
      setLoading(false)
    }
    loadData()
  }, [router, supabase])

  if (loading) return <main className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">Chargement...</main>

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      {/* Barre de navigation */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="text-xl font-black text-slate-900">XAF<span className="text-sky-500">ERAN</span></div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/profil" className="w-10 h-10 bg-sky-100 rounded-full flex items-center justify-center text-sky-600 font-bold">
            {profile?.full_name?.charAt(0) || 'U'}
          </Link>
        </div>
      </nav>
      
      <div className="p-6 max-w-lg mx-auto w-full">
        {/* Carte Profil */}
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm mb-6 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full border-2 border-slate-100 bg-slate-50 flex items-center justify-center text-2xl overflow-hidden">
             {profile?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-slate-900">Bonjour, {profile?.full_name?.split(' ')[0] || 'Utilisateur'}</h1>
            <span className="inline-block mt-1 bg-emerald-50 text-emerald-600 text-xs font-bold px-2 py-0.5 rounded-md border border-emerald-100">Abonné</span>
            <p className="text-xs text-slate-400 mt-1">📍 {profile?.city || 'Ville'}, {profile?.neighborhood || 'Quartier'}</p>
          </div>
          <Link href="/dashboard/profil" className="w-8 h-8 bg-sky-50 rounded-full flex items-center justify-center text-sky-500 hover:bg-sky-100">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
          </Link>
        </div>

        {/* Carte Solde (Style Vert) */}
        <div className="bg-[#83b735] rounded-3xl p-6 text-white shadow-md mb-8">
          <p className="text-sm font-semibold text-white/90 uppercase tracking-wider mb-1">Vos soldes disponibles</p>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-5xl font-black">{profile?.balance?.toLocaleString('fr-FR') || '0'}</span>
            <span className="text-xl font-bold text-white/90">FCFA</span>
          </div>
          <div className="flex gap-4 text-xs font-medium text-white/80 mb-6">
            <span>Principal {profile?.balance?.toLocaleString('fr-FR') || '0'} F</span>
            <span>·</span>
            <span>Crypto 0 F ($0.00)</span>
          </div>
          <div className="flex gap-3">
            <Link href="/dashboard/retrait" className="flex-1 py-3 bg-white text-[#5c9e2f] font-bold rounded-full text-center hover:bg-slate-50 transition">
              Retirer
            </Link>
            <Link href="/dashboard/historique" className="flex-1 py-3 bg-[#6a9a2c] text-white font-bold rounded-full text-center hover:bg-[#5c8825] transition flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              Historique
            </Link>
          </div>
        </div>

        {/* Section Nos Services */}
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Nos services</h2>
        <div className="grid grid-cols-2 gap-4">
          <Link href="/dashboard/annonces" className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:border-sky-300 transition group">
            <div className="w-12 h-12 bg-sky-50 rounded-xl mb-4 flex items-center justify-center text-2xl group-hover:bg-sky-100 transition">📢</div>
            <h3 className="font-bold text-slate-900 mb-1">Annonces</h3>
            <p className="text-xs text-slate-500">Diffuser & gagner</p>
          </Link>
          
          <Link href="/dashboard/equipe" className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:border-sky-300 transition group">
            <div className="w-12 h-12 bg-amber-50 rounded-xl mb-4 flex items-center justify-center text-2xl group-hover:bg-amber-100 transition">👥</div>
            <h3 className="font-bold text-slate-900 mb-1">Mon Équipe</h3>
            <p className="text-xs text-slate-500">Gérer mes employés</p>
          </Link>
        </div>
      </div>

      {/* Barre de navigation bas (Mobile) */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 px-6 py-3 flex justify-between items-center z-50 md:hidden">
        <Link href="/dashboard" className="flex flex-col items-center text-sky-500">
          <div className="w-12 h-8 bg-sky-500 rounded-full flex items-center justify-center text-white mb-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
          </div>
        </Link>
        <Link href="/dashboard/annonces" className="text-slate-400 hover:text-slate-600">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
        </Link>
        <Link href="/dashboard/equipe" className="text-slate-400 hover:text-slate-600">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
        </Link>
        <Link href="/dashboard/profil" className="text-slate-400 hover:text-slate-600">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
        </Link>
      </div>
    </main>
  )
}
