'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function AllSeriesPage() {
  const supabase = createClient()
  const router = useRouter()
  const [series, setSeries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSeries()
  }, [])

  async function loadSeries() {
    // On ne récupère QUE les séries publiées
    const { data } = await supabase
      .from('series')
      .select('*, profiles(full_name)')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
    
    setSeries(data || [])
    setLoading(false)
  }

  if (loading) return <div className="text-center py-20 text-slate-500">Chargement de la bibliothèque...</div>

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex items-center gap-4 shadow-sm">
        <Link href="/dashboard/reseau" className="text-slate-500 hover:text-slate-900 bg-slate-100 p-2 rounded-full transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-lg font-black text-slate-900">Bibliothèque de Séries</h1>
      </header>

      <div className="p-4 md:p-8 max-w-4xl mx-auto mt-4">
        {series.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
            <div className="text-5xl mb-4">📚</div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Aucune série disponible</h2>
            <p className="text-slate-500 text-sm">Les créateurs n'ont pas encore publié d'histoires.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {series.map((s: any) => (
              <Link key={s.id} href={`/series/${s.id}`} className="group flex flex-col">
                <div className="aspect-[2/3] w-full rounded-2xl overflow-hidden bg-slate-200 mb-3 relative shadow-sm group-hover:shadow-md transition-shadow">
                  {s.cover_url ? (
                    <img src={s.cover_url} alt={s.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">📖</div>
                  )}
                  <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider">
                    {s.content_type}
                  </div>
                </div>
                <h3 className="font-bold text-slate-900 leading-tight line-clamp-2 mb-1">{s.title}</h3>
                <p className="text-xs text-slate-500 line-clamp-1">Par {s.profiles?.full_name || 'Anonyme'}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
