'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Toast from '@/components/Toast'

export default function AdminCampaignsPage() {
  const supabase = createClient()
  const router = useRouter()
  
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [filter, setFilter] = useState('all') // all, pending, active, paused, rejected

  // Tiroir édition
  const [editingCampaign, setEditingCampaign] = useState<any>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')

  // Tiroir preuves
  const [viewingProofs, setViewingProofs] = useState<any>(null)
  const [proofs, setProofs] = useState<any[]>([])
  const [loadingProofs, setLoadingProofs] = useState(false)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => setToast({ message: msg, type })

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!prof || (prof.role !== 'admin' && !prof.is_admin)) return router.push('/dashboard')
      
      setIsAdmin(true)
      setProfile(prof)
      await fetchCampaigns()
      setLoading(false)
    }
    load()
  }, [router, supabase])

  async function fetchCampaigns() {
    const { data } = await supabase.from('campaigns').select('*, profiles(full_name, email)').order('created_at', { ascending: false })
    setCampaigns(data || [])
  }

  const handleProcess = async (id: string, action: 'approve' | 'reject') => {
    if (!confirm(`Voulez-vous ${action === 'approve' ? 'approuver' : 'rejeter'} cette campagne ?`)) return
    setActionLoading(id)
    try {
      const { data, error } = await supabase.rpc('admin_process_campaign', { p_campaign_id: id, p_admin_id: profile.id, p_action: action })
      if (error) throw error
      if (!data.success) throw new Error(data.error)
      showToast(action === 'approve' ? 'Campagne approuvée.' : 'Campagne rejetée & remboursée.', 'success')
      await fetchCampaigns()
    } catch (err: any) { showToast(err.message, 'error') }
    setActionLoading(null)
  }

  const handlePause = async (id: string) => {
    setActionLoading(id)
    try {
      const { data, error } = await supabase.rpc('admin_pause_campaign', { p_campaign_id: id, p_admin_id: profile.id })
      if (error) throw error
      if (!data.success) throw new Error(data.error)
      showToast(`Campagne ${data.new_status === 'paused' ? 'mise en pause' : 'reprise'}.`, 'success')
      await fetchCampaigns()
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
    if (!editTitle.trim()) return showToast('Le titre ne peut pas être vide.', 'error')
    setActionLoading(editingCampaign.id)
    try {
      const { data, error } = await supabase.rpc('admin_update_campaign', {
        p_campaign_id: editingCampaign.id, p_admin_id: profile.id, p_title: editTitle.trim(), p_description: editDesc.trim()
      })
      if (error) throw error
      if (!data.success) throw new Error(data.error)
      showToast('Campagne modifiée.', 'success')
      setEditingCampaign(null)
      await fetchCampaigns()
    } catch (err: any) { showToast(err.message, 'error') }
    setActionLoading(null)
  }

  const openProofs = async (campaign: any) => {
    setViewingProofs(campaign)
    setLoadingProofs(true)
    const { data, error } = await supabase.rpc('get_campaign_proofs', { p_campaign_id: campaign.id })
    if (!error && data) setProofs(data)
    setLoadingProofs(false)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md">Active</span>
      case 'pending': return <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded-md">En attente</span>
      case 'paused': return <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-md">En pause</span>
      case 'rejected': return <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-1 rounded-md">Rejetée</span>
      default: return <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-md">{status}</span>
    }
  }

  const filteredCampaigns = campaigns.filter(c => filter === 'all' ? true : c.status === filter)

  const stats = {
    total: campaigns.length,
    active: campaigns.filter(c => c.status === 'active').length,
    pending: campaigns.filter(c => c.status === 'pending').length,
    revenue: campaigns.filter(c => c.status === 'active' || c.status === 'paused').reduce((sum, c) => sum + (c.budget || 0), 0)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-10 h-10 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin"></div>
    </div>
  )
  if (!isAdmin) return null

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-40 flex items-center gap-4">
        <Link href="/dashboard/admin" className="text-slate-500 bg-slate-100 p-2 rounded-full hover:bg-slate-200 transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Campagnes Publicitaires</h1>
          <p className="text-xs text-slate-500">{campaigns.length} au total</p>
        </div>
      </header>

      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        
        {/* Statistiques */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
            <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Total</p>
            <p className="text-2xl font-black text-slate-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
            <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Actives</p>
            <p className="text-2xl font-black text-emerald-500">{stats.active}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
            <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">En attente</p>
            <p className="text-2xl font-black text-amber-500">{stats.pending}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
            <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Revenus</p>
            <p className="text-2xl font-black text-indigo-500">{stats.revenue.toLocaleString('fr-FR')} F</p>
          </div>
        </div>

        {/* Filtres */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
          {['all', 'pending', 'active', 'paused', 'rejected'].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${filter === f ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
              {f === 'all' ? 'Toutes' : f === 'pending' ? 'En attente' : f === 'active' ? 'Actives' : f === 'paused' ? 'En pause' : 'Rejetées'}
            </button>
          ))}
        </div>

        {/* Liste des campagnes */}
        <div className="space-y-3">
          {filteredCampaigns.length === 0 ? (
            <div className="bg-white border border-slate-200 p-8 rounded-2xl text-center text-slate-500">Aucune campagne dans cette catégorie.</div>
          ) : (
            filteredCampaigns.map(c => (
              <div key={c.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <div className="flex gap-3 items-start">
                  {c.image_url ? (
                    <img src={c.image_url} className="w-16 h-16 rounded-lg object-cover shrink-0" alt="" />
                  ) : (
                    <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 shrink-0">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <h3 className="font-bold text-slate-900 text-sm truncate">{c.title}</h3>
                      {getStatusBadge(c.status)}
                    </div>
                    <p className="text-xs text-slate-500 truncate">{c.profiles?.full_name} • {c.profiles?.email}</p>
                    <div className="flex gap-3 mt-1 text-[10px] text-slate-500">
                      <span>💰 {c.budget?.toLocaleString('fr-FR')} F</span>
                      <span>👁️ {c.views_purchased || 0} vues</span>
                      <span>💸 {c.gain_per_view || 0} F/vue</span>
                    </div>
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
                  <button onClick={() => openProofs(c)} className="px-3 py-2 bg-indigo-50 text-indigo-600 border border-indigo-200 font-bold text-xs rounded-lg">Voir preuves</button>
                  <button onClick={() => { setEditingCampaign(c); setEditTitle(c.title); setEditDesc(c.description) }} className="px-3 py-2 bg-sky-50 text-sky-600 border border-sky-200 font-bold text-xs rounded-lg">Modifier</button>
                  <button onClick={() => handleDelete(c.id)} disabled={actionLoading === c.id} className="px-3 py-2 bg-slate-100 text-slate-600 font-bold text-xs rounded-lg disabled:opacity-50">Suppr.</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 🚀 TIROIR : MODIFIER CAMPAGNE */}
      {editingCampaign && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setEditingCampaign(null)}></div>
          <div className="relative bg-white w-full max-w-md h-full shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center z-10">
              <h2 className="font-bold text-slate-900">Modifier la campagne</h2>
              <button onClick={() => setEditingCampaign(null)} className="p-2 bg-slate-100 rounded-full text-slate-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Titre</label>
                <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-sky-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Description</label>
                <textarea rows={6} value={editDesc} onChange={e => setEditDesc(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-sky-500 resize-none" />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setEditingCampaign(null)} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl">Annuler</button>
                <button onClick={handleSaveEdit} disabled={actionLoading === editingCampaign.id} className="flex-1 py-3 bg-sky-500 text-white font-bold rounded-xl shadow-md disabled:opacity-50">Enregistrer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 TIROIR : VOIR LES PREUVES */}
      {viewingProofs && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setViewingProofs(null)}></div>
          <div className="relative bg-white w-full max-w-md h-full shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center z-10">
              <div>
                <h2 className="font-bold text-slate-900">Preuves</h2>
                <p className="text-xs text-slate-500">{viewingProofs.title}</p>
              </div>
              <button onClick={() => setViewingProofs(null)} className="p-2 bg-slate-100 rounded-full text-slate-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-4 space-y-3">
              {loadingProofs ? (
                <p className="text-center text-slate-500 py-10">Chargement...</p>
              ) : proofs.length === 0 ? (
                <p className="text-center text-slate-500 py-10">Aucune preuve pour cette campagne.</p>
              ) : (
                proofs.map(p => (
                  <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{p.user_name}</p>
                        <p className="text-[10px] text-slate-500">{new Date(p.created_at).toLocaleString('fr-FR')}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${p.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : p.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                        {p.status === 'approved' ? 'Approuvé' : p.status === 'rejected' ? 'Rejeté' : 'En attente'}
                      </span>
                    </div>
                    {p.proof_url && (
                      <a href={p.proof_url} target="_blank" rel="noopener noreferrer" className="block text-xs text-sky-600 underline mb-2">Voir la vidéo de preuve</a>
                    )}
                    <p className="text-xs text-slate-600">Vues déclarées : <strong>{p.views_claimed || 0}</strong></p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
