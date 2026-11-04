import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import NotificationList from './NotificationList'

async function NotificationsData() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    console.error('Auth error:', authError)
    redirect('/login')
  }

  const { data: notifications, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Erreur chargement notifications:', error)
  }

  return <NotificationList notifications={notifications || []} />
}

export default function NotificationsPage() {
  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex items-center gap-4">
        <Link href="/dashboard" className="text-slate-500 hover:text-slate-900 bg-slate-100 p-2 rounded-full">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-lg font-bold text-slate-900">Notifications</h1>
      </header>
      <div className="p-4 md:p-8 max-w-2xl mx-auto mt-2">
        <Suspense fallback={
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin"></div>
            <p className="text-slate-500 text-sm mt-4">Chargement...</p>
          </div>
        }>
          <NotificationsData />
        </Suspense>
      </div>
    </main>
  )
}
