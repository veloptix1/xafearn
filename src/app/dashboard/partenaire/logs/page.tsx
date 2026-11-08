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
  const [apiKeyId, setApiKeyId] = useState<string | null>(null)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')

      const { data: keys } = await supabase.from('api_keys').select('*').eq('partner_id', user.id).limit(1)
      if (keys && keys.length > 0) {
        setApiKeyId(keys[0].id)
        await fetchLogs(keys[0].id, 'all')
      }
      setLoading(false)
    }
    load()
  }, [supabase, router])

  async function fetchLogs(keyId: string, filterType: string) {
    let query = supabase.from('api_logs').select('*').eq('api_key_id', keyId).order('created_at', { ascending: false }).limit(50)
    
    if (filterType === 'success') query = query.eq('status_code', 200)
    if (filterType === 'error') query = query.neq('status_code', 200)

    const { data } = await query
    setLogs(data || [])
  }

  const handleFilterChange = async (newFilter: string) => {
    setFilter(newFilter)
    if (apiKeyId) await fetchLogs(apiKeyId, newFilter)
  }

  const getStatusBadge = (code: number) => {
    if (code === 200) return <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded">200 OK</span>
    if (code === 401) return <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-1 rounded">401 Non autorisé</span>
    if (code === 402) return <span className="text-[10px] font-bold bg-orange-100 text-orange-700 px-2 py-1 rounded">402 Crédits épuisés</span>
    if (code === 403) return <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded">403 Interdit</span>
    return <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-1 rounded">{code}</span>
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex items-center gap-4">
        <Link href="/dashboard/partenaire" className="text-slate-500 bg-slate-100 p-2 rounded-full">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Logs API</h1>
          <p className="text-xs text-slate-500">Historique de vos requêtes</p>
        </div>
      </header>

      <div className="p-4 max-w-4xl mx-auto mt-4 space-y-4">
        
        {/* Filtres */}
        <div className="flex gap-2">
          {[
            { id: 'all', label: 'Tous' },
            { id: 'success', label: 'Succès' },
            { id: 'error', label: 'Erreurs' }
          ].map(f => (
            <button 
              key={f.id} 
              onClick={() => handleFilterChange(f.id)} 
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${filter === f.id ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {logs.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <p className="text-slate-500 text-sm">Aucun appel API enregistré pour le moment.</p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="divide-y divide-slate-100">
              {logs.map(log => (
                <div key={log.id} className="p-4 hover:bg-slate-50 transition">
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900">{log.endpoint}</span>
                    </div>
                    {getStatusBadge(log.status_code || 200)}
                  </div>
                  <div className="flex items-center justify-between mt-2 text-[10px] text-slate-500">
                    <span>{new Date(log.created_at).toLocaleString('fr-FR')}</span>
                    <span className="font-bold text-indigo-600">-{log.cost} crédit(s)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
