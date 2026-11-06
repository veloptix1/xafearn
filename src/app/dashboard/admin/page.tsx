'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function AdminDashboard() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ users: 0, campaigns: 0, proofs: 0, withdrawals: 0 })
  const [recentProofs, setRecentProofs] = useState<any[]>([])
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')

      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!profile || (profile.role !== 'admin' && !profile.is_admin)) {
        return router.push('/dashboard')
      }
      setIsAdmin(true)

      const [{ count: usersCount }, { count: campsCount }, { count: proofsCount }, { count: wdCount }, { data: recent }] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('campaigns').select('*', { count: 'exact', head: true }),
        supabase.from('ad_submissions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('withdrawals').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('ad_submissions').select('*, profiles(full_name), campaigns(title)').eq('status', 'pending').order('created_at', { ascending: false }).limit(3)
      ])

      setStats({ users: usersCount || 0, campaigns: campsCount || 0, proofs: proofsCount || 0, withdrawals: wdCount || 0 })
      setRecentProofs(recent || [])
      setLoading(false)
    }
    load()
  }, [router, supabase])

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Chargement...</div>
  if (!isAdmin) return null

  const cards = [
    { label: 'Utilisateurs', value: stats.users, href: '/dashboard/admin/utilisateurs', color: 'from-sky-500 to-blue-600', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { label: 'Campagnes', value: stats.campaigns, href: '/dashboard/admin/annonces', color: 'from-purple-500 to-pink-600', icon: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z' },
    { label: 'Preuves en attente', value: stats.proofs, href: '/dashboard/admin/preuves', color: 'from-amber-500 to-orange-600', icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' },
    { label: 'Retraits en attente', value: stats.withdrawals, href: '/dashboard/admin/retraits', color: 'from-emerald-500 to-green-600', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
  ]

  return (
    <main className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-900">Administration</h1>
        <p className="text-sm text-slate-500">Gère ta plateforme XAFEARN</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {cards.map(card => (
          <Link key={card.label} href={card.href} className={`bg-gradient-to-br ${card.color} rounded-2xl p-4 text-white shadow-lg active:scale-95 transition`}>
            <svg className="w-7 h-7 mb-2 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={card.icon} /></svg>
            <p className="text-2xl font-black">{card.value}</p>
            <p className="text-[10px] font-bold uppercase opacity-80 mt-1">{card.label}</p>
          </Link>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <h2 className="font-bold text-slate-900">Preuves en attente</h2>
          <Link href="/dashboard/admin/preuves" className="text-xs font-bold text-sky-600">Voir tout</Link>
        </div>
        {recentProofs.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-500">Aucune preuve en attente.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentProofs.map(p => (
              <div key={p.id} className="p-4 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-slate-900 truncate">{p.profiles?.full_name}</p>
                  <p className="text-xs text-slate-500 truncate">{p.campaigns?.title}</p>
                </div>
                <Link href="/dashboard/admin/preuves" className="px-3 py-1.5 bg-sky-50 text-sky-600 text-xs font-bold rounded-lg shrink-0">Traiter</Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
