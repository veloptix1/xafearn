'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Toast from '@/components/Toast'

const AVAILABLE_SCOPES = [
  { id: 'tasks:read', label: 'Tâches (Lecture)', desc: 'Accéder au catalogue des tâches.', color: 'bg-blue-100 text-blue-700' },
  { id: 'tasks:submit', label: 'Tâches (Soumission)', desc: 'Valider les preuves des utilisateurs.', color: 'bg-blue-100 text-blue-700' },
  { id: 'series:read', label: 'Séries (Lecture)', desc: 'Accéder au catalogue des séries.', color: 'bg-purple-100 text-purple-700' },
  { id: 'series:unlock', label: 'Séries (Déblocage)', desc: 'Débloquer des épisodes payants.', color: 'bg-purple-100 text-purple-700' },
  { id: 'users:sync', label: 'Utilisateurs (Sync)', desc: 'Synchroniser les comptes utilisateurs.', color: 'bg-emerald-100 text-emerald-700' },
  { id: 'webhooks:receive', label: 'Webhooks', desc: 'Recevoir des notifications.', color: 'bg-amber-100 text-amber-700' },
  { id: 'wallet:read', label: 'Portefeuille (Lecture)', desc: 'Lire les soldes et transactions.', color: 'bg-rose-100 text-rose-700' },
  { id: 'analytics:read', label: 'Analytics', desc: 'Récupérer les statistiques.', color: 'bg-cyan-100 text-cyan-700' },
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
        partner_id: profile.id,
        api_key: newKey,
        name: appName.trim(),
        scopes: selectedScopes,
        credits: 0
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

  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-slate-500 bg-slate-100 p-2 rounded-full">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Portail Développeur</h1>
            <p className="text-xs text-slate-500">Xafearn API</p>
          </div>
        </div>

        {/* 🔥 MENU BURGER */}
        <div className="relative">
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-200 transition">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" /></svg>
          </button>
          
          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
              {MENU_ITEMS.map((item, index) => (
                <Link
                  key={index}
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition border-b border-slate-100 last:border-0"
                >
                  <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">{getIcon(item.icon)}</svg>
                  </div>
                  <span className="text-sm font-bold text-slate-700">{item.label}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </header>

      <div className="p-4 md:p-8 max-w-4xl mx-auto mt-4 space-y-6">
        
        {/* Carte héro */}
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl transform translate-x-10 -translate-y-10"></div>
          <div className="relative z-10 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-black mb-1">Bienvenue {profile?.full_name?.split(' ')[0]} 🚀</h2>
              <p className="text-indigo-100 text-sm">Gère ton accès à l'API Xafearn.</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-indigo-100 uppercase">Crédits</p>
              <p className="text-4xl font-black">{apiKey?.credits || 0}</p>
            </div>
          </div>
        </div>

        {/* Le reste de la page Overview */}
        {!apiKey ? (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-900 mb-4">Créer ta clé API</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Nom de ton application</label>
                <input type="text" value={appName} onChange={e => setAppName(e.target.value)} placeholder="Ex: MonSiteDeJeux" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Scopes (autorisations)</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {AVAILABLE_SCOPES.map(scope => (
                    <label key={scope.id} className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${selectedScopes.includes(scope.id) ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-indigo-200'}`}>
                      <input type="checkbox" checked={selectedScopes.includes(scope.id)} onChange={() => toggleScope(scope.id)} className="mt-0.5 w-4 h-4 accent-indigo-500 rounded" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1"><span className={`text-[10px] font-bold px-2 py-0.5 rounded ${scope.color}`}>{scope.label}</span></div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">{scope.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <button onClick={generateKey} disabled={isCreating} className="w-full py-4 bg-indigo-500 text-white font-bold rounded-xl disabled:opacity-50 shadow-md active:scale-95 transition">
                {isCreating ? 'Génération...' : 'Générer ma clé API'}
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900">Ta clé API</h3>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${apiKey.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{apiKey.is_active ? 'Active' : 'Désactivée'}</span>
              </div>
              <div className="flex gap-2">
                <input type={showKey ? "text" : "password"} readOnly value={apiKey.api_key} className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-600" />
                <button onClick={copyKey} className="px-4 bg-sky-100 text-sky-600 rounded-xl font-bold active:bg-sky-200 transition">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                </button>
              </div>
              <button onClick={() => setShowKey(!showKey)} className="text-xs text-indigo-500 mt-2 font-bold">{showKey ? 'Cacher' : 'Afficher'} la clé</button>
            </div>
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-900 mb-3">Scopes activés</h3>
              <div className="flex flex-wrap gap-2">
                {apiKey.scopes?.map((s: string) => {
                  const scopeInfo = AVAILABLE_SCOPES.find(sc => sc.id === s)
                  if (!scopeInfo) return null
                  return <span key={s} className={`text-[10px] font-bold px-2 py-1 rounded-md ${scopeInfo.color}`}>{scopeInfo.label}</span>
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
