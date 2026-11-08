'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LogsPage() {
  const supabase = createClient()
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState<any[]>([])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')

      const { data: keys } = await supabase.from('api_keys').select('*').eq('partner_id', user.id).limit(1)
      if (keys && keys.length > 0) {
        const { data } = await supabase.from('api_logs').select('*').eq('api_key_id', keys[0].id).order('created_at', { ascending: false }).limit(50)
        setLogs(data || [])
      }
      setLoading(false)
    }
    load()
  }, [supabase, router])

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-emerald-400 font-mono">Chargement des logs...</div>

  return (
    <main className="min-h-screen bg-slate-950 pb-24 font-sans text-slate-300">
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 sticky top-0 z-50 flex items-center gap-4">
        <Link href="/dashboard/partenaire" className="text-slate-400 bg-slate-800 p-2 rounded-full hover:text-white transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <div>
          <h1 className="text-lg font-bold text-white font-mono">SYSTEM_LOGS</h1>
          <p className="text-xs text-slate-500 font-mono">Historique des requêtes</p>
        </div>
      </header>

      <div className="p-4 max-w-5xl mx-auto mt-4">
        <div className="bg-slate-900 rounded-3xl p-6 shadow-xl border border-slate-700">
          <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 font-mono text-xs space-y-2 max-h-[600px] overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-slate-600">Aucun log enregistré.</p>
            ) : (
              logs.map(log => (
                <div key={log.id} className="flex gap-3 hover:bg-slate-900/50 p-1 rounded transition">
                  <span className="text-slate-600">[{new Date(log.created_at).toLocaleTimeString('fr-FR')}]</span>
                  <span className={log.status_code === 200 ? 'text-emerald-400' : 'text-red-400'}>
                    {log.status_code === 200 ? 'OK' : 'ERR'}
                  </span>
                  <span className="text-slate-400">{log.endpoint}</span>
                  <span className="text-indigo-400 ml-auto">-{log.cost} credits</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
