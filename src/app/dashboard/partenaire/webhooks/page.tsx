'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Toast from '@/components/Toast'

const AVAILABLE_EVENTS = [
  { id: 'task.completed', label: 'Tâche validée', desc: 'Quand une tâche est approuvée.' },
  { id: 'task.rejected', label: 'Tâche rejetée', desc: 'Quand une preuve est refusée.' },
  { id: 'payment.success', label: 'Paiement réussi', desc: 'Quand un utilisateur est payé.' },
  { id: 'series.unlocked', label: 'Épisode débloqué', desc: 'Quand un épisode est acheté.' },
]

export default function WebhooksPage() {
  const supabase = createClient()
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [apiKey, setApiKey] = useState<any>(null)
  const [webhooks, setWebhooks] = useState<any[]>([])
  const [isAdding, setIsAdding] = useState(false)
  const [newUrl, setNewUrl] = useState('')
  const [selectedEvents, setSelectedEvents] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => setToast({ message: msg, type })

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')

      const { data: keys } = await supabase.from('api_keys').select('*').eq('partner_id', user.id).limit(1)
      if (keys && keys.length > 0) {
        setApiKey(keys[0])
        const { data: hooks } = await supabase.from('api_webhooks').select('*').eq('api_key_id', keys[0].id).order('created_at', { ascending: false })
        setWebhooks(hooks || [])
      }
      setLoading(false)
    }
    load()
  }, [supabase, router])

  const addWebhook = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newUrl.trim() || !newUrl.startsWith('http')) return showToast('URL invalide (doit commencer par http).', 'error')
    if (selectedEvents.length === 0) return showToast('Sélectionne au moins un événement.', 'error')
    if (webhooks.length >= 3) return showToast('Maximum 3 webhooks par clé API.', 'error')

    setIsProcessing(true)
    try {
      const { data, error } = await supabase.from('api_webhooks').insert({
        api_key_id: apiKey.id,
        url: newUrl.trim(),
        events: selectedEvents,
        is_active: true
      }).select().single()

      if (error) throw error

      setWebhooks([data, ...webhooks])
      setIsAdding(false)
      setNewUrl('')
      setSelectedEvents([])
      showToast('Webhook ajouté avec succès !', 'success')
    } catch (err: any) {
      showToast('Erreur : ' + err.message, 'error')
    }
    setIsProcessing(false)
  }

  const toggleEvent = (id: string) => {
    setSelectedEvents(prev => prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id])
  }

  const deleteWebhook = async (id: string) => {
    if (!confirm('Supprimer ce webhook ?')) return
    try {
      const { error } = await supabase.from('api_webhooks').delete().eq('id', id)
      if (error) throw error
      setWebhooks(webhooks.filter(w => w.id !== id))
      showToast('Webhook supprimé.', 'success')
    } catch (err: any) {
      showToast('Erreur : ' + err.message, 'error')
    }
  }

  const testWebhook = async (hook: any) => {
    showToast('Test en cours...', 'info')
    try {
      const res = await fetch(hook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'test.ping',
          message: 'Ceci est un test de webhook depuis XAFEARN.',
          timestamp: new Date().toISOString()
        })
      })
      if (res.ok) showToast('Webhook testé avec succès (200 OK) !', 'success')
      else showToast(`Le serveur a répondu avec le code ${res.status}.`, 'error')
    } catch (err) {
      showToast('Erreur de connexion au webhook.', 'error')
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/partenaire" className="text-slate-500 bg-slate-100 p-2 rounded-full">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Webhooks</h1>
            <p className="text-xs text-slate-500">Recevez des notifications en temps réel</p>
          </div>
        </div>
        {!isAdding && webhooks.length < 3 && (
          <button onClick={() => setIsAdding(true)} className="px-4 py-2 bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md active:scale-95 transition">
            + Ajouter
          </button>
        )}
      </header>

      <div className="p-4 max-w-4xl mx-auto mt-4 space-y-4">
        
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl">
          <p className="text-sm text-blue-800 leading-relaxed">
            Les webhooks permettent à votre serveur d'être notifié instantanément lorsqu'un événement se produit sur Xafearn (ex: un utilisateur a terminé une tâche).
          </p>
        </div>

        {isAdding && (
          <form onSubmit={addWebhook} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-900 mb-4">Nouveau Webhook</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">URL de destination (Endpoint)</label>
                <input type="url" required value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="https://votresite.com/api/webhook" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500" />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Événements à écouter</label>
                <div className="space-y-2">
                  {AVAILABLE_EVENTS.map(evt => (
                    <label key={evt.id} className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${selectedEvents.includes(evt.id) ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200'}`}>
                      <input type="checkbox" checked={selectedEvents.includes(evt.id)} onChange={() => toggleEvent(evt.id)} className="mt-0.5 w-4 h-4 accent-indigo-500 rounded" />
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{evt.label}</p>
                        <p className="text-[10px] text-slate-500">{evt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsAdding(false)} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl">Annuler</button>
                <button type="submit" disabled={isProcessing} className="flex-1 py-3 bg-indigo-500 text-white font-bold rounded-xl shadow-md disabled:opacity-50">
                  {isProcessing ? 'Ajout...' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </form>
        )}

        {webhooks.length === 0 && !isAdding ? (
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
            </div>
            <h3 className="font-bold text-slate-900 mb-1">Aucun webhook configuré</h3>
            <p className="text-slate-500 text-sm mb-4">Ajoutez une URL pour recevoir des notifications.</p>
            <button onClick={() => setIsAdding(true)} className="px-6 py-3 bg-indigo-500 text-white font-bold rounded-xl shadow-md">Ajouter un webhook</button>
          </div>
        ) : (
          webhooks.map(hook => (
            <div key={hook.id} className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200">
              <div className="flex justify-between items-start mb-3">
                <div className="min-w-0 flex-1 mr-2">
                  <p className="font-bold text-slate-900 text-sm truncate">{hook.url}</p>
                  <p className="text-[10px] text-slate-500">Créé le {new Date(hook.created_at).toLocaleDateString('fr-FR')}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-md shrink-0 ${hook.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                  {hook.is_active ? 'Actif' : 'Désactivé'}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-4">
                {hook.events?.map((evtId: string) => {
                  const evt = AVAILABLE_EVENTS.find(e => e.id === evtId)
                  return <span key={evtId} className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded">{evt?.label || evtId}</span>
                })}
              </div>

              <div className="flex gap-2">
                <button onClick={() => testWebhook(hook)} className="flex-1 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-lg hover:bg-slate-200 transition">Tester</button>
                <button onClick={() => deleteWebhook(hook.id)} className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 font-bold text-xs rounded-lg hover:bg-red-100 transition">Supprimer</button>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  )
}
