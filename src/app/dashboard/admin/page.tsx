'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function AdminDashboardPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    users: 0,
    pendingWithdrawals: 0,
    pendingTasks: 0,
    activeCampaigns: 0
  })

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')

      const { data: prof } = await supabase.from('profiles').select('role, is_admin').eq('id', user.id).single()
      if (!prof || (prof.role !== 'admin' && !prof.is_admin)) {
        return router.push('/dashboard')
      }

      // Charger les stats
      const { count: usersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true })
      const { count: withdrawalsCount } = await supabase.from('withdrawals').select('*', { count: 'exact', head: true }).eq('status', 'pending')
      const { count: tasksCount } = await supabase.from('task_submissions').select('*', { count: 'exact', head: true }).eq('status', 'pending')
      const { count: campaignsCount } = await supabase.from('campaigns').select('*', { count: 'exact', head: true }).eq('status', 'active')

      setStats({
        users: usersCount || 0,
        pendingWithdrawals: withdrawalsCount || 0,
        pendingTasks: tasksCount || 0,
        activeCampaigns: campaignsCount || 0
      })

      setLoading(false)
    }
    load()
  }, [supabase, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-medium">Chargement de l'administration...</p>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex items-center gap-4">
        <Link href="/dashboard" className="text-slate-500 hover:text-slate-900 bg-slate-100 p-2 rounded-full transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Espace Administrateur</h1>
          <p className="text-xs text-slate-500">Gestion de la plateforme Xafearn</p>
        </div>
      </header>

      <div className="p-4 md:p-8 max-w-4xl mx-auto mt-4">
        
        {/* Statistiques rapides */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
            <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Utilisateurs</p>
            <p className="text-2xl font-black text-slate-900">{stats.users}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
            <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Retraits en attente</p>
            <p className="text-2xl font-black text-rose-500">{stats.pendingWithdrawals}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
            <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Preuves de tâches</p>
            <p className="text-2xl font-black text-amber-500">{stats.pendingTasks}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
            <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Campagnes actives</p>
            <p className="text-2xl font-black text-emerald-500">{stats.activeCampaigns}</p>
          </div>
        </div>

        {/* Menu d'administration */}
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 px-1">Menu d'administration</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Link href="/dashboard/admin/utilisateurs" className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition active:scale-95">
            <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center text-sky-500 mb-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Utilisateurs</h3>
            <p className="text-[10px] text-slate-500">Gérer les membres</p>
          </Link>

          <Link href="/dashboard/admin/retraits" className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition active:scale-95">
            <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-500 mb-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Retraits</h3>
            <p className="text-[10px] text-slate-500">Valider les paiements</p>
          </Link>

          <Link href="/dashboard/admin/taches" className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition active:scale-95">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500 mb-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Tâches</h3>
            <p className="text-[10px] text-slate-500">Créer des missions</p>
          </Link>

          <Link href="/dashboard/admin/annonces" className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition active:scale-95">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500 mb-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Annonces</h3>
            <p className="text-[10px] text-slate-500">Campagnes</p>
          </Link>

          {/* 🔥 NOUVELLE CARTE : ANNONCE TEST */}
          <Link href="/dashboard/admin/annonce-test" className="bg-gradient-to-br from-amber-400 to-orange-500 border border-amber-300 rounded-2xl p-5 shadow-sm hover:shadow-md transition active:scale-95 text-white">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white mb-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
            </div>
            <h3 className="font-bold text-white text-sm">Annonce Test</h3>
            <p className="text-[10px] text-amber-100">Débloquer les nouveaux</p>
          </Link>

          <Link href="/dashboard/admin/preuves" className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition active:scale-95">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500 mb-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Preuves</h3>
            <p className="text-[10px] text-slate-500">Valider les tâches</p>
          </Link>

          <Link href="/dashboard/admin/coffres" className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition active:scale-95">
            <div className="w-10 h-10 bg-cyan-50 rounded-xl flex items-center justify-center text-cyan-500 mb-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Coffres</h3>
            <p className="text-[10px] text-slate-500">Gérer les coffres</p>
          </Link>

          <Link href="/dashboard/admin/emails" className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition active:scale-95">
            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-500 mb-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Emails</h3>
            <p className="text-[10px] text-slate-500">Envoyer des messages</p>
          </Link>

          <Link href="/dashboard/admin/retraits-jetons" className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition active:scale-95">
            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-500 mb-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Jetons</h3>
            <p className="text-[10px] text-slate-500">Retraits de jetons</p>
          </Link>

          <Link href="/dashboard/admin/api" className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition active:scale-95">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500 mb-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
            </div>
            <h3 className="font-bold text-slate-900 text-sm">API</h3>
            <p className="text-[10px] text-slate-500">Gérer les partenaires</p>
          </Link>

          <Link href="/dashboard/admin/support" className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition active:scale-95">
            <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center text-sky-500 mb-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Support</h3>
            <p className="text-[10px] text-slate-500">Tickets clients</p>
          </Link>

          <Link href="/dashboard/admin/roue" className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition active:scale-95">
            <div className="w-10 h-10 bg-pink-50 rounded-xl flex items-center justify-center text-pink-500 mb-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Roue</h3>
            <p className="text-[10px] text-slate-500">Activer / Configurer</p>
          </Link>

          <Link href="/dashboard/admin/parametres" className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-5 shadow-sm hover:shadow-md transition active:scale-95">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white mb-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </div>
            <h3 className="font-bold text-white text-sm">Paramètres</h3>
            <p className="text-[10px] text-slate-400">Prix & configuration</p>
          </Link>

        </div>
      </div>
    </main>
  )
}
