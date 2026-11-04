'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function NotificationList({ notifications }: { notifications: any[] }) {
  const supabase = createClient()
  const router = useRouter()
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  const filtered = filter === 'all' ? notifications : notifications.filter(n => !n.is_read)

  const markAsRead = async (id: string, link: string | null) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    if (link) router.push(link)
    else router.refresh()
  }

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id)
    if (unreadIds.length === 0) return
    await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds)
    router.refresh()
  }

  const getIcon = (title: string) => {
    if (title.includes('Bienvenue')) return <svg className="w-5 h-5 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
    if (title.includes('validée')) return <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    if (title.includes('Rappel') || title.includes('N\'oublie')) return <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    return <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
  }

  const formatDate = (date: string) => {
    const d = new Date(date)
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="space-y-4">
      {/* Filtres et actions */}
      <div className="flex justify-between items-center">
        <div className="flex bg-slate-200 p-1 rounded-lg">
          <button onClick={() => setFilter('all')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${filter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Toutes</button>
          <button onClick={() => setFilter('unread')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${filter === 'unread' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Non lues</button>
        </div>
        {notifications.some(n => !n.is_read) && (
          <button onClick={markAllAsRead} className="text-xs font-bold text-sky-600 hover:text-sky-700">
            Tout marquer comme lu
          </button>
        )}
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
          </div>
          <h3 className="font-bold text-slate-900 mb-1">Aucune notification</h3>
          <p className="text-slate-500 text-sm">Tu es à jour !</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => (
            <button
              key={n.id}
              onClick={() => markAsRead(n.id, n.link)}
              className={`w-full text-left p-4 rounded-2xl border transition flex items-start gap-4 ${n.is_read ? 'bg-white border-slate-200 hover:bg-slate-50' : 'bg-sky-50 border-sky-100 hover:bg-sky-100'}`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${n.is_read ? 'bg-slate-100' : 'bg-white shadow-sm'}`}>
                {getIcon(n.title)}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                  <h3 className={`text-sm ${n.is_read ? 'font-medium text-slate-700' : 'font-bold text-slate-900'}`}>{n.title}</h3>
                  <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">{formatDate(n.created_at)}</span>
                </div>
                <p className={`text-xs ${n.is_read ? 'text-slate-500' : 'text-slate-600'}`}>{n.message}</p>
              </div>
              {!n.is_read && <div className="w-2 h-2 bg-sky-500 rounded-full shrink-0 mt-2"></div>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
