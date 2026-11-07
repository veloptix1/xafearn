'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Toast from '@/components/Toast'

const ALL_SCOPES = [
  { id: 'tasks:read', label: 'Tâches (Lecture)', color: 'bg-blue-100 text-blue-700' },
  { id: 'tasks:submit', label: 'Tâches (Soumission)', color: 'bg-blue-100 text-blue-700' },
  { id: 'series:read', label: 'Séries (Lecture)', color: 'bg-purple-100 text-purple-700' },
  { id: 'series:unlock', label: 'Séries (Déblocage)', color: 'bg-purple-100 text-purple-700' },
  { id: 'users:sync', label: 'Utilisateurs (Sync)', color: 'bg-emerald-100 text-emerald-700' },
  { id: 'webhooks:receive', label: 'Webhooks', color: 'bg-amber-100 text-amber-700' },
  { id: 'wallet:read', label: 'Portefeuille (Lecture)', color: 'bg-rose-100 text-rose-700' },
  { id: 'analytics:read', label: 'Analytics', color: 'bg-cyan-100 text-cyan-700' },
]

export default function AdminApiPage() {
  const supabase = createClient()
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [partners, setPartners] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [selectedPartner, setSelectedPartner] = useState<any>(null)
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null)
  
  const [amountToAdd, setAmountToAdd] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => setToast({ message: msg, type })

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')

      const { data: prof } = await supabase.from('profiles').select('role, is_admin').eq('id', user.id).single()
      if (!prof || (prof.role !== 'admin' && !prof.is_admin)) return router.push('/dashboard')
      setIsAdmin(true)

      const { data } = await supabase.from('api_keys').select('*, profiles:partner_id(full_name, email)').order('created_at', { ascending: false })
      setPartners(data || [])

      const { data: recentLogs } = await supabase.from('api_logs').select('*, api_keys(name)').order('created_at', { ascending: false }).limit(10)
      setLogs(recentLogs || [])

      setLoading(false)
    }
    load()
  }, [supabase, router])

  const addCredits = async () => {
    const amount = parseFloat(amountToAdd)
    if (isNaN(amount) || amount <= 0) return showToast('Montant invalide.', 'error')
    if (!selectedPartner) return

    setIsProcessing(true)
    try {
      const newCredits = (selectedPartner.credits || 0) + amount
      await supabase.from('api_keys').update({ credits: newCredits }).eq('id', selectedPartner.id)

      await supabase.from('api_credit_purchases').insert({
        partner_id: selectedPartner.partner_id,
        amount_fcfa: 0,
        credits_added: amount,
        payment_method: 'admin_manual',
        status: 'completed'
      })

      showToast(`${amount} crédits ajoutés !`, 'success')
      setPartners(prev => prev.map(p => p.id === selectedPartner.id ? { ...p, credits: newCredits } : p))
      setSelectedPartner({ ...selectedPartner, credits: newCredits })
      setAmountToAdd('')
    } catch (err: any) {
      showToast('Erreur : ' + err.message, 'error')
    }
    setIsProcessing(false)
  }

  const toggleStatus = async (partner: any) => {
    const newStatus = !partner.is_active
    await supabase.from('api_keys').update({ is_active: newStatus }).eq('id', partner.id)
    setPartners(prev => prev.map(p => p.id === partner.id ? { ...p, is_active: newStatus } : p))
    showToast(newStatus ? 'Clé activée.' : 'Clé désactivée.', 'success')
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>
  if (!isAdmin) return null

  const totalCredits = partners.reduce((sum, p) => sum + (p.credits || 0), 0)
  const activePartners = partners.filter(p => p.is_active).length

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex items-center gap-4">
        <Link href="/dashboard/admin" className="text-slate-500 bg-slate-100 p-2 rounded-full">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Partenaires API</h1>
          <p className="text-xs text-slate-500">Gérez vos développeurs et leurs accès.</p>
        </div>
      </header>

      <div className="p-4 md:p-8 max-w-6xl mx-auto mt-4">
        
        {/* Statistiques globales */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
            <p className="text-xs font-bold text-slate-500 uppercase mb-1">Partenaires</p>
            <p className="text-3xl font-black text-slate-900">{partners.length}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
            <p className="text-xs font-bold text-slate-500 uppercase mb-1">Actifs</p>
            <p className="text-3xl font-black text-emerald-500">{activePartners}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
            <p className="text-xs font-bold text-slate-500 uppercase mb-1">Crédits en circulation</p>
            <p className="text-3xl font-black text-indigo-500">{totalCredits.toLocaleString('fr-FR')}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
            <p className="text-xs font-bold text-slate-500 uppercase mb-1">Appels aujourd'hui</p>
            <p className="text-3xl font-black text-amber-500">{logs.length}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Colonne de gauche : Liste des partenaires */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Tous les partenaires</h2>
            
            {partners.length === 0 ? (
              <div className="bg-white border border-slate-200 p-8 rounded-2xl text-center text-slate-500">
                Aucun partenaire API pour le moment.
              </div>
            ) : (
              <div className="space-y-3">
                {partners.map(p => (
                  <div key={p.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center font-bold text-lg">
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900">{p.name}</h3>
                          <p className="text-xs text-slate-500">{p.profiles?.full_name} • {p.profiles?.email}</p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${p.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {p.is_active ? 'Actif' : 'Désactivé'}
                      </span>
                    </div>

                    {/* Scopes */}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {p.scopes?.map((scopeId: string) => {
                        const scopeInfo = ALL_SCOPES.find(s => s.id === scopeId)
                        if (!scopeInfo) return null
                        return (
                          <span key={scopeId} className={`text-[10px] font-bold px-2 py-1 rounded-md ${scopeInfo.color}`}>
                            {scopeInfo.label}
                          </span>
                        )
                      })}
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Crédits</p>
                        <p className="text-xl font-black text-slate-900">{p.credits || 0}</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Dernière utilisation</p>
                        <p className="text-sm font-bold text-slate-700">{p.last_used_at ? new Date(p.last_used_at).toLocaleDateString('fr-FR') : 'Jamais'}</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button onClick={() => setSelectedPartner(p)} className="flex-1 py-2.5 bg-indigo-50 text-indigo-600 border border-indigo-200 font-bold text-xs rounded-lg hover:bg-indigo-100 transition">
                        + Ajouter crédits
                      </button>
                      <button onClick={() => toggleStatus(p)} className={`px-4 py-2.5 font-bold text-xs rounded-lg transition ${p.is_active ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'}`}>
                        {p.is_active ? 'Désactiver' : 'Activer'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Colonne de droite : Logs récents */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Activité récente</h2>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              {logs.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">Aucun appel API enregistré.</p>
              ) : (
                <div className="space-y-3">
                  {logs.map(log => (
                    <div key={log.id} className="flex items-start gap-3 text-xs">
                      <div className="w-2 h-2 rounded-full bg-indigo-400 mt-1.5 shrink-0"></div>
                      <div>
                        <p className="font-bold text-slate-800">{log.api_keys?.name || 'Inconnu'}</p>
                        <p className="text-slate-500">{log.endpoint} • <span className="font-bold text-indigo-600">{log.cost} crédit(s)</span></p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{new Date(log.created_at).toLocaleString('fr-FR')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal d'ajout de crédits */}
      {selectedPartner && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md p-6">
            <h2 className="font-bold text-lg mb-2">Ajouter des crédits</h2>
            <p className="text-sm text-slate-500 mb-4">Partenaire : <strong className="text-slate-900">{selectedPartner.name}</strong></p>
            
            <div className="bg-indigo-50 border border-indigo-200 p-3 rounded-xl mb-4">
              <p className="text-xs text-indigo-800">Solde actuel : <strong>{selectedPartner.credits || 0} crédits</strong></p>
            </div>

            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Nombre de crédits à ajouter</label>
            <input type="number" min="1" value={amountToAdd} onChange={e => setAmountToAdd(e.target.value)} placeholder="Ex: 100" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500 mb-4" />

            <div className="flex gap-2">
              <button onClick={() => setSelectedPartner(null)} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl">Annuler</button>
              <button onClick={addCredits} disabled={isProcessing} className="flex-1 py-3 bg-indigo-500 text-white font-bold rounded-xl shadow-md disabled:opacity-50">
                {isProcessing ? 'Ajout...' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
