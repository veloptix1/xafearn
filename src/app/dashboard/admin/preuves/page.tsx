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

      const { data } = await supabase.from('ad_submissions').select('*, profiles(full_name, email, level), campaigns(title, price, is_welcome_campaign, custom_gain_per_view)').eq('status', 'pending').order('created_at', { ascending: false })
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
      const { data, error } = await supabase.rpc('admin_validate_submission', { p_submission_id: sub.id, p_admin_id: profile.id })
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
      const { data, error } = await supabase.rpc('admin_reject_submission', { p_submission_id: sub.id, p_admin_id: profile.id })
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
        <div className="bg-white border border-slate-200 p-8 rounded-2xl text-center text-slate-500">Aucune preuve en attente.</div>
      ) : (
        <div className="space-y-3">
          {submissions.map(sub => (
            <div key={sub.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-bold text-slate-900">{sub.profiles?.full_name}</p>
                  <p className="text-xs text-slate-500">{sub.profiles?.email}</p>
                  <p className="text-xs text-sky-600 font-bold mt-1">{sub.campaigns?.title}</p>
                </div>
                {sub.campaigns?.is_welcome_campaign && (
                  <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-1 rounded">TEST</span>
                )}
              </div>

              {sub.proof_video_url && (
                <video src={sub.proof_video_url} controls className="w-full max-h-64 rounded-lg bg-black mb-3" />
              )}

              <div className="flex gap-2">
                <button onClick={() => handleReject(sub)} disabled={actionLoading === sub.id} className="flex-1 py-2.5 bg-red-50 text-red-600 border border-red-200 font-bold text-xs rounded-lg disabled:opacity-50">
                  Rejeter
                </button>
                <button onClick={() => handleValidate(sub)} disabled={actionLoading === sub.id} className="flex-1 py-2.5 bg-emerald-500 text-white font-bold text-xs rounded-lg disabled:opacity-50 shadow-md">
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
