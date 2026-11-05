import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'

export default async function AdminOverviewPage() {
  const supabase = await createClient()

  // 🚀 On force le rafraîchissement des données à chaque visite
  revalidatePath('/dashboard/admin')

  const { data: campaigns } = await supabase.from('campaigns').select('*')
  const { data: submissions } = await supabase.from('ad_submissions').select('*')
  const { data: users } = await supabase.from('profiles').select('*')
  const { data: withdrawals } = await supabase.from('withdrawals').select('*').eq('status', 'pending')

  const pendingCampaigns = campaigns?.filter(c => c.status === 'pending').length || 0
  const pendingSubmissions = submissions?.filter(s => s.status === 'pending').length || 0
  const pendingWithdrawals = withdrawals?.length || 0
  const totalUsers = users?.length || 0

  const stats = [
    { label: 'Utilisateurs', value: totalUsers, color: 'bg-sky-500', href: '/dashboard/admin/utilisateurs', icon: '👥' },
    { label: 'Annonces en attente', value: pendingCampaigns, color: 'bg-amber-500', href: '/dashboard/admin/annonces', icon: '📢' },
    { label: 'Preuves en attente', value: pendingSubmissions, color: 'bg-purple-500', href: '/dashboard/admin/preuves', icon: '🎥' },
    { label: 'Retraits en attente', value: pendingWithdrawals, color: 'bg-emerald-500', href: '/dashboard/admin/retraits', icon: '💸' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-black text-slate-900">Vue d'ensemble</h2>
        <form action={async () => { 'use server'; revalidatePath('/dashboard/admin'); }}>
          <button className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-xl shadow-sm hover:bg-slate-50 transition flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            Rafraîchir
          </button>
        </form>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(stat => (
          <Link key={stat.label} href={stat.href} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-lg hover:border-sky-300 transition group">
            <div className={`w-10 h-10 ${stat.color} rounded-xl mb-3 flex items-center justify-center text-white text-lg shadow-md group-hover:scale-110 transition`}>
              {stat.icon}
            </div>
            <p className="text-3xl font-black text-slate-900">{stat.value}</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">{stat.label}</p>
          </Link>
        ))}
      </div>

      <div className="bg-gradient-to-br from-sky-500 to-blue-600 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-10 -translate-y-10"></div>
        <h3 className="font-bold text-lg mb-2 relative z-10">Bienvenue Admin 👋</h3>
        <p className="text-sky-100 text-sm relative z-10">Gère ta plateforme depuis les onglets en haut.</p>
      </div>
    </div>
  )
}
