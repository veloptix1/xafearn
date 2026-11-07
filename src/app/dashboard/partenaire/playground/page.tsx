'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function PlaygroundPage() {
  const supabase = createClient()
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [apiKey, setApiKey] = useState<any>(null)
  const [endpoint, setEndpoint] = useState('/tasks')
  const [response, setResponse] = useState<any>(null)
  const [isTesting, setIsTesting] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')
      const { data: keys } = await supabase.from('api_keys').select('*').eq('partner_id', user.id).limit(1)
      if (keys && keys.length > 0) setApiKey(keys[0])
      setLoading(false)
    }
    load()
  }, [supabase, router])

  const testApi = async () => {
    if (!apiKey) return
    setIsTesting(true)
    setResponse(null)
    try {
      const res = await fetch(`${window.location.origin}/api/v1${endpoint}?api_key=${apiKey.api_key}`)
      const data = await res.json()
      setResponse({ status: res.status, data })
    } catch (err: any) {
      setResponse({ status: 500, data: { error: err.message } })
    }
    setIsTesting(false)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex items-center gap-4">
        <Link href="/dashboard/partenaire" className="text-slate-500 bg-slate-100 p-2 rounded-full">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-lg font-bold text-slate-900">Playground</h1>
      </header>

      <div className="p-4 max-w-4xl mx-auto mt-4 space-y-4">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
          <h2 className="font-bold text-slate-900 mb-4">Teste l'API en direct</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Endpoint</label>
              <select value={endpoint} onChange={e => setEndpoint(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none">
                <option value="/tasks">GET /tasks (Lister les tâches)</option>
                <option value="/series">GET /series (Lister les séries)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-2">URL complète</label>
              <code className="block p-3 bg-slate-900 text-emerald-400 text-xs rounded-xl overflow-x-auto whitespace-nowrap">
                GET {typeof window !== 'undefined' ? window.location.origin : ''}/api/v1{endpoint}?api_key={apiKey?.api_key.substring(0, 12)}...
              </code>
            </div>

            <button onClick={testApi} disabled={isTesting || !apiKey} className="w-full py-4 bg-indigo-500 text-white font-bold rounded-xl shadow-md active:scale-95 transition disabled:opacity-50 flex items-center justify-center gap-2">
              {isTesting ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  Test en cours...
                </>
              ) : (
                '🚀 Envoyer la requête'
              )}
            </button>
          </div>
        </div>

        {response && (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900">Réponse</h3>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${response.status === 200 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                Status {response.status}
              </span>
            </div>
            <pre className="bg-slate-900 text-emerald-400 p-4 rounded-xl text-xs font-mono overflow-x-auto max-h-96">
              {JSON.stringify(response.data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </main>
  )
}
