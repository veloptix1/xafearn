'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Toast from '@/components/Toast'

export default function AdminCampaignsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
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
    load()
  }, [router, supabase])

  const handleProcess = async (id: string, action: 'approve' | 'reject') => {
    setActionLoading(id)
    try {
      const { data, error } = await supabase.rpc('admin_process_campaign', { p_campaign_id: id, p_admin_id: profile.id, p_action: action })
      if (error) throw error
      if (!data.success) throw new Error(data.error)
      showToast(action === 'approve' ? 'Campagne approuvée.' : 'Campagne rejetée.', 'success')
      router.refresh()
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

  if (loading) return <div className="p-20 text-center text-slate-500">Chargement...</div>

  return (
    <main className="p-4 md:p-6 max-w-5xl mx-auto">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <h1 className="text-2xl font-black text-slate-900 mb-1">Campagnes</h1>
      <p className="text-sm text-slate-500 mb-6">{campaigns.length} au total</p>

      <div className="space-y-3">
        {campaigns.map(c => (
          <div key={c.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="flex gap-3">
              {c.image_url && <img src={c.image_url} className="w-16 h-16 rounded-lg object-cover shrink-0" alt="" />}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2 mb-1">
                  <h3 className="font-bold text-slate-900 text-sm truncate">{c.title}</h3>
                  <span className={`text-[9px] font-bold px-2 py-1 rounded uppercase shrink-0 ${c.status === 'active' ? 'bg-emerald-100 text-emerald-700' : c.status === 'pending' ? 'bg-amber-100 text-amber-700' : c.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                    {c.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 truncate">{c.profiles?.full_name} • {c.budget} F</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{new Date(c.created_at).toLocaleDateString('fr-FR')}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
              {c.status === 'pending' && (
                <>
                  <button onClick={() => handleProcess(c.id, 'reject')} disabled={actionLoading === c.id} className="flex-1 py-2 bg-red-50 text-red-600 border border-red-200 font-bold text-xs rounded-lg disabled:opacity-50">Rejeter</button>
                  <button onClick={() => handleProcess(c.id, 'approve')} disabled={actionLoading === c.id} className="flex-1 py-2 bg-emerald-500 text-white font-bold text-xs rounded-lg disabled:opacity-50">Approuver</button>
                </>
              )}
              <button onClick={() => handleDelete(c.id)} disabled={actionLoading === c.id} className="px-3 py-2 bg-slate-100 text-slate-600 font-bold text-xs rounded-lg disabled:opacity-50">Supprimer</button>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
