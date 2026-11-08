'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Toast from '@/components/Toast'

const AVAILABLE_SCOPES = [
  { id: 'tasks:read', label: 'Tâches (Lecture)', desc: 'Accéder au catalogue des tâches.', color: 'bg-emerald-900/30 text-emerald-400 border-emerald-800' },
  { id: 'tasks:submit', label: 'Tâches (Soumission)', desc: 'Valider les preuves des utilisateurs.', color: 'bg-emerald-900/30 text-emerald-400 border-emerald-800' },
  { id: 'series:read', label: 'Séries (Lecture)', desc: 'Accéder au catalogue des séries.', color: 'bg-purple-900/30 text-purple-400 border-purple-800' },
  { id: 'series:unlock', label: 'Séries (Déblocage)', desc: 'Débloquer des épisodes payants.', color: 'bg-purple-900/30 text-purple-400 border-purple-800' },
  { id: 'users:sync', label: 'Utilisateurs (Sync)', desc: 'Synchroniser les comptes utilisateurs.', color: 'bg-blue-900/30 text-blue-400 border-blue-800' },
  { id: 'webhooks:receive', label: 'Webhooks', desc: 'Recevoir des notifications.', color: 'bg-amber-900/30 text-amber-400 border-amber-800' },
  { id: 'wallet:read', label: 'Portefeuille (Lecture)', desc: 'Lire les soldes et transactions.', color: 'bg-rose-900/30 text-rose-400 border-rose-800' },
  { id: 'analytics:read', label: 'Analytics', desc: 'Récupérer les statistiques.', color: 'bg-cyan-900/30 text-cyan-400 border-cyan-800' },
]

const MENU_ITEMS = [
  { label: 'Vue d\'ensemble', href: '/dashboard/partenaire', icon: 'home' },
  { label: 'Documentation', href: '/dashboard/partenaire/docs', icon: 'book' },
  { label: 'Playground', href: '/dashboard/partenaire/playground', icon: 'play' },
  { label: 'Webhooks', href: '/dashboard/partenaire/webhooks', icon: 'bell' },
  { label: 'Logs API', href: '/dashboard/partenaire/logs', icon: 'list' },
]

export default function PartnerDashboard() {
  const supabase = createClient()
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [apiKey, setApiKey] = useState<any>(null)
  const [showKey, setShowKey] = useState(false)
  const [selectedScopes, setSelectedScopes] = useState<string[]>([])
  const [appName, setAppName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => setToast({ message: msg, type })

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)

      const { data: keys } = await supabase.from('api_keys').select('*').eq('partner_id', user.id).order('created_at', { ascending: false }).limit(1)
      if (keys && keys.length > 0) {
        setApiKey(keys[0])
        setSelectedScopes(keys[0].scopes || [])
        setAppName(keys[0].name)
      }

      setLoading(false)
    }
    load()
  }, [supabase, router])

  const generateKey = async () => {
    if (!appName.trim()) return showToast('Donne un nom à ton application.', 'error')
    if (selectedScopes.length === 0) return showToast('Sélectionne au moins un scope.', 'error')

    setIsCreating(true)
    try {
      const newKey = `xaf_live_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`
      const { data, error } = await supabase.from('api_keys').insert({
        partner_id: profile.id, api_key: newKey, name: appName.trim(), scopes: selectedScopes, credits: 0
      }).select().single()

      if (error) throw error
      setApiKey(data)
      showToast('Clé API générée avec succès !', 'success')
    } catch (err: any) {
      showToast('Erreur : ' + err.message, 'error')
    }
    setIsCreating(false)
  }

  const toggleScope = (id: string) => {
    setSelectedScopes(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
  }

  const copyKey = () => {
    navigator.clipboard.writeText(apiKey.api_key)
    showToast('Clé copiée !', 'success')
  }

  const getIcon = (name: string) => {
    switch (name) {
      case 'home': return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      case 'book': return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      case 'play': return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      case 'bell': return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      case 'list': return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      default: return null
    }
  }

  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-emerald-400 font-mono">Initialisation du système...</div>

  return (
    <main className="min-h-screen bg-slate-950 pb-24 font-sans text-slate-300">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-slate-400 bg-slate-800 p-2 rounded-full hover:text-white transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <div>
            <h1 className="text-lg font-bold text-white font-mono flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              TERMINAL_API
            </h1>
            <p className="text-xs text-slate-500 font-mono">Connecté en tant que {profile?.full_name}</p>
          </div>
        </div>

        <div className="relative">
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" /></svg>
          </button>
          
          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
              {MENU_ITEMS.map((item, index) => (
                <Link key={index} href={item.href} onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-800 transition border-b border-slate-800 last:border-0">
                  <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center text-emerald-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">{getIcon(item.icon)}</svg>
                  </div>
                  <span className="text-sm font-bold text-slate-300">{item.label}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </header>

      <div className="p-4 md:p-8 max-w-5xl mx-auto mt-4 space-y-6">
        
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl transform translate-x-20 -translate-y-20"></div>
          <div className="relative z-10 flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-black text-white mb-1 font-mono">$ root@xafearn:~#</h2>
              <p className="text-emerald-400 text-sm font-mono">Accès autorisé. Bienvenue {profile?.full_name?.split(' ')[0]}.</p>
            </div>
            <div className="text-right bg-slate-950/50 p-4 rounded-2xl border border-slate-700">
              <p className="text-xs font-bold text-slate-500 uppercase font-mono mb-1">Crédits API</p>
              <p className="text-4xl font-black text-emerald-400 font-mono">{apiKey?.credits || 0}</p>
            </div>
          </div>
        </div>

        {!apiKey ? (
          <div className="bg-slate-900 rounded-3xl p-6 shadow-xl border border-slate-700">
            <h3 className="font-bold text-white mb-4 font-mono">INITIALISER UNE NOUVELLE CLÉ</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1 font-mono">Nom du projet</label>
                <input type="text" value={appName} onChange={e => setAppName(e.target.value)} placeholder="MonApp" className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono text-emerald-400 outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2 font-mono">Permissions (Scopes)</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {AVAILABLE_SCOPES.map(scope => (
                    <label key={scope.id} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${selectedScopes.includes(scope.id) ? 'border-emerald-500 bg-emerald-900/20' : 'border-slate-700 hover:border-slate-500'}`}>
                      <input type="checkbox" checked={selectedScopes.includes(scope.id)} onChange={() => toggleScope(scope.id)} className="mt-0.5 w-4 h-4 accent-emerald-500 rounded" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1"><span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${scope.color}`}>{scope.label}</span></div>
                        <p className="text-[11px] text-slate-500 leading-relaxed font-mono">{scope.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <button onClick={generateKey} disabled={isCreating} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black rounded-xl disabled:opacity-50 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition font-mono">
                {isCreating ? 'GÉNÉRATION...' : 'GÉNÉRER LA CLÉ API'}
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900 rounded-3xl p-6 shadow-xl border border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-white font-mono">TA CLÉ API</h3>
                <span className={`text-[10px] font-bold px-2 py-1 rounded border font-mono ${apiKey.is_active ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800' : 'bg-red-900/30 text-red-400 border-red-800'}`}>{apiKey.is_active ? 'ONLINE' : 'OFFLINE'}</span>
              </div>
              <div className="flex gap-2">
                <input type={showKey ? "text" : "password"} readOnly value={apiKey.api_key} className="flex-1 p-3 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-emerald-400" />
                <button onClick={copyKey} className="px-4 bg-slate-800 text-emerald-400 rounded-xl font-bold hover:bg-slate-700 transition">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                </button>
              </div>
              <button onClick={() => setShowKey(!showKey)} className="text-xs text-emerald-500 mt-2 font-bold font-mono hover:underline">{showKey ? '[MASQUER]' : '[AFFICHER]'} la clé</button>
            </div>
            <div className="bg-slate-900 rounded-3xl p-6 shadow-xl border border-slate-700">
              <h3 className="font-bold text-white mb-3 font-mono">SCOPES ACTIFS</h3>
              <div className="flex flex-wrap gap-2">
                {apiKey.scopes?.map((s: string) => {
                  const scopeInfo = AVAILABLE_SCOPES.find(sc => sc.id === s)
                  if (!scopeInfo) return null
                  return <span key={s} className={`text-[10px] font-bold px-2 py-1 rounded border font-mono ${scopeInfo.color}`}>{scopeInfo.label}</span>
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
