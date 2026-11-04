'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function Countdown({ expiresAt }: { expiresAt: string }) {
  const [timeLeft, setTimeLeft] = useState('')
  const [isExpired, setIsExpired] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime()
      const distance = new Date(expiresAt).getTime() - now

      if (distance < 0) {
        setIsExpired(true)
        setTimeLeft('EXPIRÉ')
        clearInterval(interval)
        return
      }

      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((distance % (1000 * 60)) / 1000)

      setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)
    }, 1000)

    return () => clearInterval(interval)
  }, [expiresAt])

  if (isExpired) return <span className="text-slate-400 font-bold">Terminé</span>
  return <span className="text-rose-600 font-mono font-bold">{timeLeft}</span>
}

export default function StatutFlashPage() {
  const supabase = createClient()
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadFlash() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // On récupère les campagnes Flash actives
      const { data } = await supabase
        .from('campaigns')
        .select('*')
        .eq('status', 'active')
        .eq('is_flash', true)
        .gt('expires_at', new Date().toISOString())
        .order('expires_at', { ascending: true })

      setCampaigns(data || [])
      setLoading(false)
    }
    loadFlash()
  }, [supabase])

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">Chargement...</div>

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex items-center gap-4">
        <Link href="/dashboard" className="text-slate-500 hover:text-slate-900 bg-slate-100 p-2 rounded-full">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-lg font-bold text-slate-900">Statuts Flash ⚡</h1>
      </header>

      <div className="p-4 md:p-8 max-w-lg mx-auto mt-4">
        <div className="bg-gradient-to-br from-rose-500 to-red-600 rounded-3xl p-6 text-white shadow-lg mb-6 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-10 -translate-y-10"></div>
          <div className="relative z-10">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h2 className="text-xl font-bold mb-1">Gagne le double. Vite.</h2>
            <p className="text-rose-100 text-sm">Ces annonces expirent très bientôt. Diffuse-les maintenant pour toucher un bonus.</p>
          </div>
        </div>

        {campaigns.length === 0 ? (
          <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h3 className="font-bold text-slate-900 mb-1">Aucune offre flash</h3>
            <p className="text-slate-500 text-sm">Reviens plus tard, de nouvelles offres arrivent souvent.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {campaigns.map((c) => (
              <div key={c.id} className="bg-white border-2 border-rose-400 rounded-2xl p-4 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-rose-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <Countdown expiresAt={c.expires_at} />
                </div>
                
                <div className="flex gap-4 items-center mt-2">
                  {c.image_url ? (
                    <img src={c.image_url} className="w-16 h-16 rounded-xl object-cover shrink-0" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-slate-100 shrink-0"></div>
                  )}
                  <div className="flex-1 min-w-0 pr-16">
                    <h3 className="font-bold text-slate-900 text-sm truncate">{c.title}</h3>
                    <p className="text-xs text-slate-500 mt-1">Gain : <strong className="text-rose-600">1,00 F / vue (x2)</strong></p>
                  </div>
                </div>
                <Link href="/dashboard/annonces" className="w-full mt-4 py-2 bg-rose-50 text-rose-600 font-bold text-sm rounded-xl hover:bg-rose-100 transition border border-rose-200 flex justify-center">
                  Diffuser avant expiration
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
