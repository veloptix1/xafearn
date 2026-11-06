'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AdminPreuvesPage() {
  const supabase = createClient()
  const router = useRouter()
  const [submissions, setSubmissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!prof || (prof.role !== 'admin' && !prof.is_admin)) return router.push('/dashboard')
      setProfile(prof)

      const { data } = await supabase
        .from('ad_submissions')
        .select('*, profiles(full_name, email, level), campaigns(title, price, is_welcome_campaign, custom_gain_per_view)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
      setSubmissions(data || [])
      setLoading(false)
    }
    load()
  }, [router, supabase])

  const handleValidate = async (sub: any) => {
    const views = prompt('Nombre de vues à valider ?', sub.views_count || '1000')
    if (!views) return
    setActionLoading(sub.id)

    try {
      await supabase.from('ad_submissions').update({ views_count: parseInt(views) }).eq('id', sub.id)
      const { data, error } = await supabase.rpc('admin_validate_submission', {
        p_submission_id: sub.id,
        p_admin_id: profile.id
      })
      if (error) throw error
      if (!data.success) throw new Error(data.error)

      showToast(`Validé ! Gain : ${data.gain.toFixed(0)} F`, 'success')
      setSubmissions(prev => prev.filter(s => s.id !== sub.id))
    } catch (err: any) {
      showToast(err.message, 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (sub: any) => {
    if (!confirm('Rejeter cette preuve ?')) return
    setActionLoading(sub.id)
    try {
      const { data, error } = await supabase.rpc('admin_reject_submission', {
        p_submission_id: sub.id,
        p_admin_id: profile.id
      })
      if (error) throw error
      if (!data.success) throw new Error(data.error)
      showToast('Preuve rejetée.', 'success')
      setSubmissions(prev => prev.filter(s => s.id !== sub.id))
    } catch (err: any) {
      showToast(err.message, 'error')
    } finally {
      setActionLoading(null)
    }
  }

  // 🚀 SUPPRESSION CORRIGÉE
  const handleDelete = async (sub: any) => {
    if (!confirm('Supprimer définitivement cette preuve ? La vidéo sera aussi effacée.')) return
    setActionLoading(sub.id)
    try {
      // 1. Supprimer la vidéo via l'API Storage (autorisé)
      if (sub.proof_video_url) {
        const fileName = sub.proof_video_url.split('/').pop()
        if (fileName) {
          await supabase.storage.from('proof-videos').remove([fileName])
        }
      }

      // 2. Supprimer la ligne en SQL
      const { data, error } = await supabase.rpc('admin_delete_submission', {
        p_submission_id: sub.id,
        p_admin_id: profile.id
      })
      if (error) throw error
      if (!data.success) throw new Error(data.error)

      showToast('Preuve supprimée.', 'success')
      setSubmissions(prev => prev.filter(s => s.id !== sub.id))
    } catch (err: any) {
      showToast(err.message, 'error')
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) return <div className="p-20 text-center text-slate-500">Chargement...</div>

  return (
    <main className="p-4 md:p-6 max-w-4xl mx-auto">
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-bold ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}>
          {toast.message}
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-900">Preuves à valider</h1>
        <p className="text-sm text-slate-500">{submissions.length} en attente</p>
      </div>

      {submissions.length === 0 ? (
        <div className="bg-white border border-slate-200 p-8 rounded-2xl text-center text-slate-500">
          Aucune preuve en attente.
        </div>
      ) : (
        <div className="space-y-3">
          {submissions.map(sub => (
            <div key={sub.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 truncate">{sub.profiles?.full_name}</p>
                  <p className="text-xs text-slate-500 truncate">{sub.profiles?.email}</p>
                  <p className="text-xs text-sky-600 font-bold mt-1 truncate">{sub.campaigns?.title}</p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {new Date(sub.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {sub.campaigns?.is_welcome_campaign && (
                  <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-1 rounded shrink-0 ml-2">TEST</span>
                )}
              </div>

              {sub.proof_video_url && (
                <video src={sub.proof_video_url} controls className="w-full max-h-64 rounded-lg bg-black mb-3" />
              )}

              {!sub.proof_video_url && (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg mb-3">
                  <p className="text-xs text-amber-800 font-bold">Aucune vidéo de preuve</p>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => handleDelete(sub)}
                  disabled={actionLoading === sub.id}
                  className="px-3 py-2.5 bg-slate-100 text-slate-600 font-bold text-xs rounded-lg disabled:opacity-50 active:bg-slate-200"
                  title="Supprimer définitivement"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
                <button
                  onClick={() => handleReject(sub)}
                  disabled={actionLoading === sub.id}
                  className="flex-1 py-2.5 bg-red-50 text-red-600 border border-red-200 font-bold text-xs rounded-lg disabled:opacity-50"
                >
                  Rejeter
                </button>
                <button
                  onClick={() => handleValidate(sub)}
                  disabled={actionLoading === sub.id}
                  className="flex-1 py-2.5 bg-emerald-500 text-white font-bold text-xs rounded-lg disabled:opacity-50 shadow-md"
                >
                  {actionLoading === sub.id ? '...' : 'Valider & Payer'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
