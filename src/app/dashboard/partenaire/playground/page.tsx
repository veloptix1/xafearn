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
      const baseUrl = window.location.origin
      const finalUrl = `${baseUrl}/api/v1${endpoint}`
      const options: RequestInit = {
        method,
        headers: { 'Authorization': `Bearer ${apiKey.api_key}`, 'Content-Type': 'application/json' }
      }
      if (method === 'POST' || method === 'PATCH') options.body = body
      
      const res = await fetch(finalUrl, options)
      const text = await res.text()
      let data
      try { data = JSON.parse(text) } 
      catch { data = { error: `Erreur ${res.status}`, details: "Réponse non-JSON", raw: text.substring(0, 200) } }
      
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
        <div>
          <h1 className="text-lg font-bold text-slate-900">Playground</h1>
          <p className="text-xs text-slate-500">Testez l'API en direct</p>
        </div>
      </header>

      <div className="p-4 max-w-5xl mx-auto mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Colonne de gauche : Requête */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
          <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <span className="text-sky-500">➤</span> REQUÊTE
          </h2>
          
          <div className="flex flex-wrap gap-2 mb-4">
            {presets.map(p => (
              <button key={p.label} onClick={() => { setMethod(p.method); setEndpoint(p.endpoint); }} className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-200 transition">
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2 mb-4">
            <select value={method} onChange={e => setMethod(e.target.value)} className="w-24 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none">
              <option>GET</option><option>POST</option><option>PATCH</option><option>DELETE</option>
            </select>
            <input type="text" value={endpoint} onChange={e => setEndpoint(e.target.value)} className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 outline-none" />
          </div>

          <div className="mb-4">
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Clé API</label>
            {apiKey ? (
              <div className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-600 overflow-hidden text-ellipsis whitespace-nowrap">{apiKey.api_key}</div>
            ) : (
              <div className="w-full p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">⚠️ Aucune clé API. Créez-en une sur la page principale.</div>
            )}
          </div>

          {(method === 'POST' || method === 'PATCH') && (
            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Body (JSON)</label>
              <textarea value={body} onChange={e => setBody(e.target.value)} rows={4} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 outline-none resize-none" />
            </div>
          )}

          <button onClick={testApi} disabled={isTesting || !apiKey} className="w-full py-4 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl disabled:opacity-50 shadow-md active:scale-95 transition">
            {isTesting ? 'EXÉCUTION...' : 'EXÉCUTER LA REQUÊTE'}
          </button>
        </div>

        {/* Colonne de droite : Réponse */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-900 flex items-center gap-2"><span className="text-emerald-500">⬅</span> RÉPONSE</h2>
            {response && (
              <span className={`text-xs font-bold px-2 py-1 rounded ${response.status === 200 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                HTTP {response.status}
              </span>
            )}
          </div>
          
          <div className="flex-1 bg-slate-900 rounded-xl p-4 overflow-auto">
            {!response ? (
              <p className="text-slate-500 font-mono text-xs">En attente d'exécution...</p>
            ) : (
              <pre className="text-xs font-mono text-emerald-400 whitespace-pre-wrap">{JSON.stringify(response.data, null, 2)}</pre>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
