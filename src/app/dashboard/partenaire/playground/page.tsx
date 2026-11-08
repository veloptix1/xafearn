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
  const [method, setMethod] = useState('GET')
  const [endpoint, setEndpoint] = useState('/tasks')
  const [body, setBody] = useState('{\n  "task_id": "123",\n  "proof_url": "https://..."\n}')
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

  const presets = [
    { label: '📋 Tâches', method: 'GET', endpoint: '/tasks' },
    { label: '📚 Séries', method: 'GET', endpoint: '/series' },
    { label: '💰 Portefeuille', method: 'GET', endpoint: '/wallet' },
    { label: '📊 Analytics', method: 'GET', endpoint: '/analytics' },
  ]

  const testApi = async () => {
    if (!apiKey) return
    setIsTesting(true)
    setResponse(null)
    try {
      const options: RequestInit = {
        method,
        headers: { 'Authorization': `Bearer ${apiKey.api_key}` }
      }
      if (method === 'POST' || method === 'PATCH') {
        options.body = body
        options.headers = { ...options.headers, 'Content-Type': 'application/json' }
      }
      const res = await fetch(`${window.location.origin}/api/v1${endpoint}`, options)
      const data = await res.json()
      setResponse({ status: res.status, data })
    } catch (err: any) {
      setResponse({ status: 500, data: { error: err.message } })
    }
    setIsTesting(false)
  }

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-emerald-400 font-mono">Chargement du terminal...</div>

  return (
    <main className="min-h-screen bg-slate-950 pb-24 font-sans text-slate-300">
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 sticky top-0 z-50 flex items-center gap-4">
        <Link href="/dashboard/partenaire" className="text-slate-400 bg-slate-800 p-2 rounded-full hover:text-white transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <div>
          <h1 className="text-lg font-bold text-white font-mono">PLAYGROUND</h1>
          <p className="text-xs text-slate-500 font-mono">Testez l'API en direct</p>
        </div>
      </header>

      <div className="p-4 max-w-5xl mx-auto mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Colonne de gauche : Requête */}
        <div className="bg-slate-900 rounded-3xl p-6 shadow-xl border border-slate-700">
          <h2 className="font-bold text-white mb-4 font-mono text-sm flex items-center gap-2">
            <span className="text-sky-400">➤</span> REQUÊTE
          </h2>
          
          <div className="flex flex-wrap gap-2 mb-4">
            {presets.map(p => (
              <button key={p.label} onClick={() => { setMethod(p.method); setEndpoint(p.endpoint); }} className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs font-bold rounded-lg border border-slate-700 hover:border-slate-500 transition">
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2 mb-4">
            <select value={method} onChange={e => setMethod(e.target.value)} className="w-24 p-3 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono text-emerald-400 outline-none">
              <option>GET</option>
              <option>POST</option>
              <option>PATCH</option>
              <option>DELETE</option>
            </select>
            <input type="text" value={endpoint} onChange={e => setEndpoint(e.target.value)} className="flex-1 p-3 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono text-emerald-400 outline-none" />
          </div>

          <div className="mb-4">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1 font-mono">Clé API</label>
            <input type="password" readOnly value={apiKey?.api_key || ''} className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-500" />
          </div>

          {(method === 'POST' || method === 'PATCH') && (
            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1 font-mono">Body (JSON)</label>
              <textarea value={body} onChange={e => setBody(e.target.value)} rows={5} className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-amber-400 outline-none resize-none" />
            </div>
          )}

          <button onClick={testApi} disabled={isTesting || !apiKey} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black rounded-xl disabled:opacity-50 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition font-mono flex justify-center items-center gap-2">
            {isTesting ? 'EXÉCUTION...' : 'EXÉCUTER LA REQUÊTE'}
          </button>
        </div>

        {/* Colonne de droite : Réponse */}
        <div className="bg-slate-900 rounded-3xl p-6 shadow-xl border border-slate-700 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-white font-mono text-sm flex items-center gap-2">
              <span className="text-emerald-400">⬅</span> RÉPONSE
            </h2>
            {response && (
              <span className={`text-xs font-bold px-2 py-1 rounded font-mono ${response.status === 200 ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800' : 'bg-red-900/30 text-red-400 border border-red-800'}`}>
                HTTP {response.status}
              </span>
            )}
          </div>
          
          <div className="flex-1 bg-slate-950 rounded-xl p-4 border border-slate-800 overflow-auto">
            {!response ? (
              <p className="text-slate-600 font-mono text-xs">En attente d'exécution...</p>
            ) : (
              <pre className="text-xs font-mono text-emerald-400 whitespace-pre-wrap">
                {JSON.stringify(response.data, null, 2)}
              </pre>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
