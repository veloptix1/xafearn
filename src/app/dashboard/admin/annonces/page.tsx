'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AdminCampaignsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null)
  const [editingCampaign, setEditingCampaign] = useState<any>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.push('/login')
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (!prof || (prof.role !== 'admin' && !prof.is_admin)) return router.push('/dashboard')
    setProfile(prof)

    const { data } = await supabase.from('campaigns').select('*, profiles(full_name, email)').order('created_at', { ascending: false })
    setCampaigns(data || [])
    setLoading(false)
  }

  const handleProcess = async (id: string, action: 'approve' | 'reject') => {
    setActionLoading(id)
    try {
      const { data, error } = await supabase.rpc('admin_process_campaign', { p_campaign_id: id, p_admin_id: profile.id, p_action: action })
      if (error) throw error
      if (!data.success) throw new Error(data.error)
      showToast(action === 'approve' ? 'Campagne approuvée.' : 'Campagne rejetée & remboursée.', 'success')
      load()
    } catch (err: any) { showToast(err.message, 'error') }
    setActionLoading(null)
  }

  const handlePause = async (id: string) => {
    setActionLoading(id)
    try {
      const { data, error } = await supabase.rpc('admin_pause_campaign', { p_campaign_id: id, p_admin_id: profile.id })
      if (error) throw error
      if (!data.success) throw new Error(data.error)
      showToast('Statut mis à jour.', 'success')
      load()
    } catch (err: any) { showToast(err.message, 'error') }
    setActionLoading(null)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer définitivement cette campagne ?')) return
    setActionLoading(id)
    try {
      const { data, error } = await supabase.rpc('admin_delete_campaign', { p_campaign_id: id, p_admin_id: profile.id })
      if (error) throw error
      if (!data.success) throw new Error(data.error)
      showToast('Campagne supprimée.', 'success')
      setCampaigns(prev => prev.filter(c => c.id !== id))
    } catch (err: any) { showToast(err.message, 'error') }
    setActionLoading(null)
  }

  const handleSaveEdit = async () => {
    setActionLoading(editingCampaign.id)
    try {
      const { data, error } = await supabase.rpc('admin_update_campaign', {
        p_campaign_id: editingCampaign.id, p_admin_id: profile.id, p_title: editTitle, p_description: editDesc
      })
      if (error) throw error
      if (!data.success) throw new Error(data.error)
      showToast('Campagne modifiée.', 'success')
      setEditingCampaign(null)
      load()
    } catch (err: any) { showToast(err.message, 'error') }
    setActionLoading(null)
  }

  if (loading) return <div className="p-20 text-center text-slate-500">Chargement...</div>

  return (
    <main className="p-4 md:p-6 max-w-5xl mx-auto">
      {toast && <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-bold ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}>{toast.message}</div>}

      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-900">Campagnes</h1>
        <p className="text-sm text-slate-500">{campaigns.length} au total</p>
      </div>

      <div className="space-y-3">
        {campaigns.map(c => (
          <div key={c.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="flex gap-3">
              {c.image_url && <img src={c.image_url} className="w-16 h-16 rounded-lg object-cover shrink-0" alt="" />}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2 mb-1">
                  <h3 className="font-bold text-slate-900 text-sm truncate">{c.title}</h3>
                  <span className={`text-[9px] font-bold px-2 py-1 rounded uppercase shrink-0 ${c.status === 'active' ? 'bg-emerald-100 text-emerald-700' : c.status === 'pending' ? 'bg-amber-100 text-amber-700' : c.status === 'paused' ? 'bg-slate-100 text-slate-600' : 'bg-red-100 text-red-700'}`}>{c.status}</span>
                </div>
                <p className="text-xs text-slate-500 truncate">{c.profiles?.full_name} • {c.budget} F • {c.views_purchased} vues</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{new Date(c.created_at).toLocaleDateString('fr-FR')}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100">
              {c.status === 'pending' && (
                <>
                  <button onClick={() => handleProcess(c.id, 'reject')} disabled={actionLoading === c.id} className="flex-1 py-2 bg-red-50 text-red-600 border border-red-200 font-bold text-xs rounded-lg disabled:opacity-50">Rejeter</button>
                  <button onClick={() => handleProcess(c.id, 'approve')} disabled={actionLoading === c.id} className="flex-1 py-2 bg-emerald-500 text-white font-bold text-xs rounded-lg disabled:opacity-50">Approuver</button>
                </>
              )}
              {(c.status === 'active' || c.status === 'paused') && (
                <button onClick={() => handlePause(c.id)} disabled={actionLoading === c.id} className="flex-1 py-2 bg-amber-50 text-amber-600 border border-amber-200 font-bold text-xs rounded-lg disabled:opacity-50">
                  {c.status === 'active' ? 'Mettre en pause' : 'Reprendre'}
                </button>
              )}
              <button onClick={() => { setEditingCampaign(c); setEditTitle(c.title); setEditDesc(c.description) }} className="px-3 py-2 bg-sky-50 text-sky-600 border border-sky-200 font-bold text-xs rounded-lg">Modifier</button>
              <button onClick={() => handleDelete(c.id)} disabled={actionLoading === c.id} className="px-3 py-2 bg-slate-100 text-slate-600 font-bold text-xs rounded-lg disabled:opacity-50">Suppr.</button>
            </div>
          </div>
        ))}
      </div>

      {editingCampaign && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="font-bold text-lg mb-4">Modifier la campagne</h2>
            <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm mb-3" placeholder="Titre" />
            <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={4} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none mb-3" placeholder="Description" />
            <div className="flex gap-2">
              <button onClick={() => setEditingCampaign(null)} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl">Annuler</button>
              <button onClick={handleSaveEdit} disabled={actionLoading === editingCampaign.id} className="flex-1 py-3 bg-sky-500 text-white font-bold rounded-xl disabled:opacity-50">Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
