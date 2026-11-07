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

  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex items-center gap-4">
        <Link href="/dashboard" className="text-slate-500 bg-slate-100 p-2 rounded-full">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Portail Développeur</h1>
          <p className="text-xs text-slate-500">Intègre Xafearn dans ton application</p>
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
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${scope.color}`}>{scope.label}</span>
                        </div>
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
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Carte Clé API */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-900">Ta clé API</h3>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${apiKey.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {apiKey.is_active ? 'Active' : 'Désactivée'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <input type={showKey ? "text" : "password"} readOnly value={apiKey.api_key} className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-600" />
                  <button onClick={copyKey} className="px-4 bg-sky-100 text-sky-600 rounded-xl font-bold active:bg-sky-200 transition">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  </button>
                </div>
                <button onClick={() => setShowKey(!showKey)} className="text-xs text-indigo-500 mt-2 font-bold">{showKey ? 'Cacher' : 'Afficher'} la clé</button>
              </div>

              {/* Carte Documentation Rapide */}
              <div className="bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-800 text-white">
                <h3 className="font-bold mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  Test rapide
                </h3>
                <p className="text-xs text-slate-400 mb-2">Copie cette URL dans ton navigateur :</p>
                <code className="block p-3 bg-black/40 text-emerald-400 text-[10px] rounded-lg overflow-x-auto whitespace-nowrap">
                  GET /api/v1/tasks?api_key={apiKey.api_key.substring(0, 12)}...
                </code>
              </div>
            </div>

            {/* Scopes activés */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-900 mb-3">Scopes activés</h3>
              <div className="flex flex-wrap gap-2">
                {apiKey.scopes?.map((s: string) => {
                  const scopeInfo = AVAILABLE_SCOPES.find(sc => sc.id === s)
                  if (!scopeInfo) return null
                  return (
                    <span key={s} className={`text-xs font-bold px-3 py-1.5 rounded-lg ${scopeInfo.color}`}>
                      {scopeInfo.label}
                    </span>
                  )
                })}
              </div>
            </div>

            {/* Documentation */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-900 mb-4">📖 Documentation</h3>
              
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-bold text-slate-600 uppercase mb-2">Endpoint : Tâches</p>
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                    <code className="text-xs font-mono text-slate-800">GET /api/v1/tasks?api_key=VOTRE_CLE</code>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2">Retourne la liste des tâches actives. Coût : <strong>1 crédit</strong>.</p>
                </div>

                <div>
                  <p className="text-xs font-bold text-slate-600 uppercase mb-2">Réponse type</p>
                  <pre className="bg-slate-900 text-emerald-400 text-[10px] p-3 rounded-xl overflow-x-auto">
{`{
  "success": true,
  "tasks": [
    {
      "id": "uuid",
      "title": "S'abonner à une chaîne",
      "reward": 50,
      "type": "simple"
    }
  ]
}`}
                  </pre>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
