import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || (profile.role !== 'admin' && !profile.is_admin)) redirect('/dashboard')

  const tabs = [
    { href: '/dashboard/admin', label: '📊 Vue d\'ensemble' },
    { href: '/dashboard/admin/annonces', label: '📢 Annonces' },
    { href: '/dashboard/admin/preuves', label: '📸 Preuves' },
    { href: '/dashboard/admin/utilisateurs', label: '👥 Utilisateurs' },
    { href: '/dashboard/admin/taches', label: '🎮 Tâches' },
    { href: '/dashboard/admin/retraits', label: '💸 Retraits' },
    { href: '/dashboard/admin/emails', label: '📧 Emails' },
  ]

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="px-6 py-3 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-slate-500 hover:text-slate-900 bg-slate-100 p-2 rounded-full">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
            </Link>
            <h1 className="text-lg font-black text-slate-900">Administration</h1>
          </div>
          <Link href="/dashboard/admin/annonce-test" className="px-3 py-1.5 bg-sky-500 text-white text-xs font-bold rounded-lg">Annonce test</Link>
        </div>
        
        {/* Onglets */}
        <div className="px-4 overflow-x-auto no-scrollbar border-t border-slate-100">
          <div className="flex gap-1 min-w-max">
            {tabs.map(tab => (
              <Link 
                key={tab.href} 
                href={tab.href}
                className="px-4 py-3 text-xs font-bold text-slate-600 hover:text-sky-600 hover:bg-slate-50 rounded-t-lg transition whitespace-nowrap border-b-2 border-transparent hover:border-sky-500"
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </div>
      </header>

      <div className="p-4 md:p-8 max-w-5xl mx-auto mt-2">
        {children}
      </div>
    </main>
  )
}
