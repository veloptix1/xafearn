import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function AdminOverviewPage() {
  const supabase = await createClient()
  
  const { data: campaigns } = await supabase.from('campaigns').select('*')
  const { data: submissions } = await supabase.from('ad_submissions').select('*')
  const { data: users } = await supabase.from('profiles').select('*')
  const { data: withdrawals } = await supabase.from('withdrawals').select('*').eq('status', 'pending')

  const pendingCampaigns = campaigns?.filter(c => c.status === 'pending').length || 0
  const pendingSubmissions = submissions?.filter(s => s.status === 'pending').length || 0
  const pendingWithdrawals = withdrawals?.length || 0
  const totalUsers = users?.length || 0

  const stats = [
    { label: 'Utilisateurs', value: totalUsers, color: 'bg-sky-500', href: '/dashboard/admin/utilisateurs' },
    { label: 'Annonces en attente', value: pendingCampaigns, color: 'bg-amber-500', href: '/dashboard/admin/annonces' },
    { label: 'Preuves en attente', value: pendingSubmissions, color: 'bg-purple-500', href: '/dashboard/admin/preuves' },
    { label: 'Retraits en attente', value: pendingWithdrawals, color: 'bg-emerald-500', href: '/dashboard/admin/retraits' },
  ]

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-black text-slate-900">Vue d'ensemble</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(stat => (
          <Link key={stat.label} href={stat.href} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition">
            <div className={`w-10 h-10 ${stat.color} rounded-xl mb-3`}></div>
            <p className="text-3xl font-black text-slate-900">{stat.value}</p>
            <p className="text-xs font-bold text-slate-500 uppercase mt-1">{stat.label}</p>
          </Link>
        ))}
      </div>

      <div className="bg-gradient-to-br from-sky-500 to-blue-600 rounded-3xl p-6 text-white shadow-lg">
        <h3 className="font-bold text-lg mb-2">Bienvenue Admin 👋</h3>
        <p className="text-sky-100 text-sm">Gère ta plateforme depuis les onglets en haut.</p>
      </div>
    </div>
  )
}
