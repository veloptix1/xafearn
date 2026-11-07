'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Toast from '@/components/Toast'

const AVAILABLE_SCOPES = [
  { id: 'tasks:read', label: 'Lire les tâches', desc: 'Accéder au catalogue des tâches disponibles.' },
  { id: 'tasks:submit', label: 'Valider les tâches', desc: 'Permettre aux utilisateurs de soumettre leurs preuves.' },
  { id: 'series:read', label: 'Lire les séries', desc: 'Accéder au catalogue des séries et épisodes.' },
  { id: 'series:unlock', label: 'Débloquer des épisodes', desc: 'Permettre le déblocage d\'épisodes payants.' },
  { id: 'users:sync', label: 'Synchroniser les utilisateurs', desc: 'Créer et mettre à jour les utilisateurs.' },
  { id: 'webhooks:receive', label: 'Recevoir des webhooks', desc: 'Recevoir des notifications automatiques.' },
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
        <h1 className="text-lg font-bold text-slate-900">Portail Développeur</h1>
      </header>

      <div className="p-4 max-w-2xl mx-auto mt-4 space-y-4">
        
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-6 text-white shadow-lg">
          <h2 className="text-xl font-black mb-1">Intègre Xafearn dans ton app</h2>
          <p className="text-indigo-100 text-sm mb-4">Accède à nos tâches et séries via notre API sécurisée.</p>
          <div className="bg-white/20 rounded-2xl p-4 backdrop-blur-sm">
            <p className="text-xs font-bold text-indigo-100 uppercase mb-1">Solde de crédits API</p>
            <p className="text-3xl font-black">{apiKey?.credits || 0} crédits</p>
          </div>
        </div>

        {!apiKey ? (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-900 mb-4">Créer ta clé API</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Nom de ton application</label>
                <input type="text" value={appName} onChange={e => setAppName(e.target.value)} placeholder="Ex: MonSiteDeJeux" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500" />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Scopes (autorisations)</label>
                <div className="space-y-2">
                  {AVAILABLE_SCOPES.map(scope => (
                    <label key={scope.id} className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${selectedScopes.includes(scope.id) ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200'}`}>
                      <input type="checkbox" checked={selectedScopes.includes(scope.id)} onChange={() => toggleScope(scope.id)} className="mt-0.5 w-4 h-4 accent-indigo-500 rounded" />
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{scope.label}</p>
                        <p className="text-[10px] text-slate-500">{scope.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <button onClick={generateKey} disabled={isCreating} className="w-full py-3 bg-indigo-500 text-white font-bold rounded-xl disabled:opacity-50 shadow-md active:scale-95 transition">
                {isCreating ? 'Génération...' : 'Générer ma clé API'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-900 mb-3">Ta clé API</h3>
              <div className="flex gap-2">
                <input type={showKey ? "text" : "password"} readOnly value={apiKey.api_key} className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-600" />
                <button onClick={copyKey} className="px-4 bg-sky-100 text-sky-600 rounded-xl font-bold active:bg-sky-200 transition">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                </button>
              </div>
              <button onClick={() => setShowKey(!showKey)} className="text-xs text-indigo-500 mt-2 font-bold">{showKey ? 'Cacher' : 'Afficher'} la clé</button>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-900 mb-3">Tes scopes activés</h3>
              <div className="flex flex-wrap gap-2">
                {apiKey.scopes?.map((s: string) => (
                  <span key={s} className="bg-indigo-50 text-indigo-700 text-xs font-bold px-3 py-1 rounded-lg border border-indigo-100">{s}</span>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-900 mb-2">Documentation</h3>
              <p className="text-xs text-slate-500 mb-3">Utilise cette URL pour tes requêtes :</p>
              <code className="block p-3 bg-slate-900 text-emerald-400 text-xs rounded-xl overflow-x-auto">
                GET https://getagriculture.store/api/v1/tasks?api_key={apiKey.api_key.substring(0, 10)}...
              </code>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
