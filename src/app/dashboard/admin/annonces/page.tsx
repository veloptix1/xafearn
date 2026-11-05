'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Toast from '@/components/Toast'

export default function AdminAnnoncesPage() {
  const supabase = createClient()
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null)
  const [editingCampaign, setEditingCampaign] = useState<any>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.push('/login')
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (!profile || (profile.role !== 'admin' && !profile.is_admin)) return router.push('/dashboard')

    const { data: c } = await supabase.from('campaigns').select('*').order('created_at', { ascending: false })
    const { data: u } = await supabase.from('profiles').select('*')
    setCampaigns(c || [])
    setUsers(u || [])
    setLoading(false)
  }

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const updateStatus = async (id: string, newStatus: string, label: string) => {
    setActionLoading(id)
    const { error } = await supabase.from('campaigns').update({ status: newStatus }).eq('id', id)
    if (error) showToast('Erreur : ' + error.message, 'error')
    else {
      showToast(`Campagne ${label} avec succès !`, 'success')
      await load()
    }
    setActionLoading(null)
  }

  const deleteCampaign = async (id: string) => {
    if (!confirm('Supprimer définitivement cette campagne ?')) return
    setActionLoading(id)
    const { error } = await supabase.from('campaigns').delete().eq('id', id)
    if (error) showToast('Erreur : ' + error.message, 'error')
    else {
      showToast('Campagne supprimée !', 'success')
      await load()
    }
    setActionLoading(null)
  }

  const saveEdit = async () => {
    if (!editingCampaign) return
    setActionLoading(editingCampaign.id)
    const { error } = await supabase.from('campaigns').update({ 
      title: editTitle, description: editDescription 
    }).eq('id', editingCampaign.id)
    if (error) showToast('Erreur : ' + error.message, 'error')
    else {
      showToast('Campagne modifiée !', 'success')
      setEditingCampaign(null)
      await load()
    }
    setActionLoading(null)
  }

  if (loading) return <div className="text-center py-20 text-slate-500">Chargement...</div>

  const usersMap = new Map(users.map(u => [u.id, u]))

  return (
    <div className="space-y-4">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <h2 className="text-xl font-black text-slate-900">📢 Modération des campagnes ({campaigns.length})</h2>
      
      {campaigns.length === 0 ? (
        <div className="bg-white border border-slate-200 p-8 rounded-2xl text-center text-slate-500">Aucune campagne.</div>
      ) : (
        campaigns.map((c: any) => (
          <div key={c.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
              {c.image_url && <img src={c.image_url} className="w-20 h-20 object-cover rounded-xl" />}
              <div className="flex-1">
                <h3 className="font-bold text-slate-900">{c.title}</h3>
                <p className="text-xs text-slate-500">{usersMap.get(c.user_id)?.full_name}</p>
                <p className="text-xs text-slate-400 mt-1">Budget : {c.budget} F • Vues : {c.views_purchased}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                c.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 
                c.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                c.status === 'paused' ? 'bg-slate-100 text-slate-700' :
                'bg-red-100 text-red-700'
              }`}>{c.status}</span>
            </div>

            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100">
              {c.status === 'pending' && (
                <button onClick={() => updateStatus(c.id, 'active', 'approuvée')} disabled={actionLoading === c.id} className="px-4 py-2 bg-emerald-500 text-white font-bold text-xs rounded-lg hover:bg-emerald-400 disabled:opacity-50">
                  {actionLoading === c.id ? '...' : 'Approuver'}
                </button>
              )}
              {c.status === 'active' && (
                <button onClick={() => updateStatus(c.id, 'paused', 'mise en pause')} disabled={actionLoading === c.id} className="px-4 py-2 bg-amber-500 text-white font-bold text-xs rounded-lg hover:bg-amber-400 disabled:opacity-50">
                  {actionLoading === c.id ? '...' : 'Mettre en pause'}
                </button>
              )}
              {c.status === 'paused' && (
                <button onClick={() => updateStatus(c.id, 'active', 'reprise')} disabled={actionLoading === c.id} className="px-4 py-2 bg-emerald-500 text-white font-bold text-xs rounded-lg hover:bg-emerald-400 disabled:opacity-50">
                  {actionLoading === c.id ? '...' : 'Reprendre'}
                </button>
              )}
              {c.status !== 'rejected' && c.status !== 'pending' && (
                <button onClick={() => updateStatus(c.id, 'rejected', 'rejetée')} disabled={actionLoading === c.id} className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 font-bold text-xs rounded-lg">
                  Rejeter
                </button>
              )}
              <button onClick={() => { setEditingCampaign(c); setEditTitle(c.title); setEditDescription(c.description) }} className="px-4 py-2 bg-sky-50 text-sky-600 border border-sky-200 font-bold text-xs rounded-lg">
                Modifier
              </button>
              <button onClick={() => deleteCampaign(c.id)} disabled={actionLoading === c.id} className="px-4 py-2 bg-red-100 text-red-700 font-bold text-xs rounded-lg ml-auto">
                Supprimer
              </button>
            </div>
          </div>
        ))
      )}

      {/* Modal de modification */}
      {editingCampaign && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md p-6">
            <h3 className="font-bold text-lg mb-4">Modifier la campagne</h3>
            <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm mb-3" placeholder="Titre" />
            <textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} rows={4} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm mb-3 resize-none" placeholder="Description" />
            <div className="flex gap-2">
              <button onClick={() => setEditingCampaign(null)} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl">Annuler</button>
              <button onClick={saveEdit} disabled={actionLoading === editingCampaign.id} className="flex-1 py-3 bg-sky-500 text-white font-bold rounded-xl disabled:opacity-50">
                {actionLoading === editingCampaign.id ? '...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
