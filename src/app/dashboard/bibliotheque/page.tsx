'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function MyLibraryPage() {
  const supabase = createClient()
  const router = useRouter()
  const [favorites, setFavorites] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadFavorites()
  }, [])

  async function loadFavorites() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.push('/login')

    // On récupère les séries favorites de l'utilisateur
    const { data } = await supabase
      .from('series_favorites')
      .select('series_id, series:series_id(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    setFavorites(data?.map((f: any) => f.series) || [])
    setLoading(false)
  }

  if (loading) return <div className="text-center py-20 text-slate-500">Chargement de ta bibliothèque...</div>

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex items-center gap-4 shadow-sm">
        <Link href="/dashboard" className="text-slate-500 hover:text-slate-900 bg-slate-100 p-2 rounded-full transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-lg font-black text-slate-900">Ma Bibliothèque</h1>
      </header>

      <div className="p-4 md:p-8 max-w-4xl mx-auto mt-4">
        {favorites.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
            <div className="text-5xl mb-4">📚</div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Ta bibliothèque est vide</h2>
            <p className="text-slate-500 text-sm mb-6">Ajoute des séries en favori pour les retrouver ici.</p>
            <Link href="/series" className="px-6 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition shadow-md inline-block">
              Explorer les séries
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {favorites.map((s: any) => (
              <Link key={s.id} href={`/series/${s.id}`} className="group flex flex-col">
                <div className="aspect-[2/3] w-full rounded-2xl overflow-hidden bg-slate-200 mb-3 relative shadow-sm group-hover:shadow-md transition-shadow">
                  {s.cover_url ? (
                    <img src={s.cover_url} alt={s.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">📖</div>
                  )}
                  <div className="absolute top-2 right-2 bg-rose-500 text-white p-1.5 rounded-full shadow-md">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                  </div>
                </div>
                <h3 className="font-bold text-slate-900 leading-tight line-clamp-2 mb-1 group-hover:text-purple-600 transition">{s.title}</h3>
                <p className="text-xs text-slate-500 capitalize">{s.content_type}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
