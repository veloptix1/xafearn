'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Toast from '@/components/Toast'

export default function AdminPreuvesPage() {
  const supabase = createClient()
  const router = useRouter()
  const [submissions, setSubmissions] = useState<any[]>([])
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.push('/login')
    
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (!profile || (profile.role !== 'admin' && !profile.is_admin)) return router.push('/dashboard')

    const { data: subs } = await supabase.from('ad_submissions').select('*').eq('status', 'pending').order('created_at', { ascending: true })
    const { data: camps } = await supabase.from('campaigns').select('*')
    const { data: usrs } = await supabase.from('profiles').select('*')
    
    setSubmissions(subs || [])
    setCampaigns(camps || [])
    setUsers(usrs || [])
    setLoading(false)
  }

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  const handleValidate = async (sub: any, views: number) => {
    if (views <= 0) return showToast('Le nombre de vues doit être supérieur à 0.', 'error')
    
    const camp = campaigns.find(c => c.id === sub.campaign_id)
    const profile = users.find(u => u.id === sub.user_id)
    if (!camp || !profile) return showToast('Données introuvables.', 'error')

    setActionLoading(sub.id)
    try {
      await supabase.from('ad_submissions').update({ status: 'validated', views_count: views }).eq('id', sub.id)

      if (camp.is_welcome_campaign) {
        await supabase.from('profiles').update({ is_test_mode: false }).eq('id', sub.user_id)
        await supabase.from('notifications').insert({
          user_id: sub.user_id, title: 'Mode test terminé 🚀',
          message: 'Félicitations ! Toutes les campagnes payantes sont débloquées.',
          link: '/dashboard/annonces'
        })
        showToast(`Test validé pour ${profile.full_name}.`, 'success')
      } else {
        const gainPerView = camp.custom_gain_per_view || (profile.level === 1 ? 0.50 : profile.level === 2 ? 1.25 : 1.75)
        const totalGain = gainPerView * views

        const { data: currentProfile } = await supabase.from('profiles').select('balance').eq('id', sub.user_id).single()
        await supabase.from('profiles').update({ balance: (currentProfile?.balance || 0) + totalGain }).eq('id', sub.user_id)

        await supabase.from('notifications').insert({
          user_id: sub.user_id, title: 'Diffusion validée ✅',
          message: `Tu as gagné ${totalGain.toFixed(2)} FCFA pour "${camp.title}".`,
          link: '/dashboard'
        })
        showToast(`${views} vues validées (+${totalGain.toFixed(0)} FCFA).`, 'success')
      }

      // 🚀 Retrait immédiat de l'affichage
      setSubmissions(prev => prev.filter(s => s.id !== sub.id))
    } catch (err: any) {
      showToast('Erreur : ' + err.message, 'error')
    }
    setActionLoading(null)
  }

  const handleReject = async (sub: any) => {
    if (!confirm('Rejeter cette preuve ?')) return
    setActionLoading(sub.id)
    try {
      await supabase.from('ad_submissions').update({ status: 'rejected' }).eq('id', sub.id)
      const profile = users.find(u => u.id === sub.user_id)
      await supabase.from('notifications').insert({
        user_id: sub.user_id, title: 'Preuve rejetée ❌',
        message: `Ta preuve a été rejetée. Vérifie qu'elle est bien conforme.`,
        link: '/dashboard/annonces'
      })
      showToast(`Preuve rejetée pour ${profile?.full_name}.`, 'success')
      setSubmissions(prev => prev.filter(s => s.id !== sub.id))
    } catch (err: any) {
      showToast('Erreur : ' + err.message, 'error')
    }
    setActionLoading(null)
  }

  const handleDeleteVideo = async (sub: any) => {
    if (!confirm('Supprimer définitivement cette preuve ? (La vidéo sera libérée)')) return
    setActionLoading(sub.id)
    try {
      if (sub.proof_video_url) {
        const fileName = sub.proof_video_url.split('/').pop()
        if (fileName) await supabase.storage.from('proof-videos').remove([fileName])
      }
      await supabase.from('ad_submissions').delete().eq('id', sub.id)
      showToast('Preuve et vidéo supprimées.', 'success')
      setSubmissions(prev => prev.filter(s => s.id !== sub.id))
    } catch (err: any) {
      showToast('Erreur : ' + err.message, 'error')
    }
    setActionLoading(null)
  }

  if (loading) return <div className="text-center py-20 text-slate-500">Chargement...</div>

  return (
    <div className="space-y-4">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <h2 className="text-xl font-black text-slate-900">📸 Preuves à valider ({submissions.length})</h2>

      {submissions.length === 0 ? (
        <div className="bg-white border border-slate-200 p-8 rounded-2xl text-center text-slate-500">
          Aucune preuve en attente.
        </div>
      ) : (
        submissions.map((s: any) => {
          const camp = campaigns.find(c => c.id === s.campaign_id)
          const u = users.find(usr => usr.id === s.user_id)
          const isTest = camp?.is_welcome_campaign
          const isLoading = actionLoading === s.id

          return (
            <div key={s.id} className={`bg-white border-2 rounded-2xl shadow-sm p-4 ${isTest ? 'border-purple-300' : 'border-amber-200'}`}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-slate-900">{camp?.title}</h3>
                  <p className="text-xs text-slate-500">{u?.full_name} ({u?.email})</p>
                  {isTest ? (
                    <span className="bg-purple-50 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded">TEST</span>
                  ) : (
                    <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded">
                      {u?.level === 1 ? '0,50' : u?.level === 2 ? '1,25' : '1,75'} F/vue
                    </span>
                  )}
                </div>
                <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-1 rounded">EN ATTENTE</span>
              </div>

              {s.proof_video_url && (
                <video src={s.proof_video_url} controls className="w-full max-h-48 rounded-lg bg-black mb-3" />
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  const formData = new FormData(e.currentTarget)
                  const views = parseInt(formData.get('views') as string) || 0
                  handleValidate(s, views)
                }}
                className="flex gap-2 items-end mt-2"
              >
                <div className="flex-1">
                  <input
                    type="number"
                    name="views"
                    required
                    defaultValue={1000}
                    disabled={isLoading}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm disabled:opacity-50"
                    placeholder="Vues"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 bg-emerald-500 text-white font-bold text-sm rounded-lg hover:bg-emerald-400 disabled:opacity-50"
                >
                  {isLoading ? '...' : (isTest ? 'Valider test' : 'Valider & Payer')}
                </button>
              </form>

              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => handleReject(s)}
                  disabled={isLoading}
                  className="flex-1 py-1.5 bg-red-50 text-red-600 border border-red-200 font-bold text-xs rounded-lg disabled:opacity-50"
                >
                  Rejeter
                </button>
                <button
                  onClick={() => handleDeleteVideo(s)}
                  disabled={isLoading}
                  className="flex-1 py-1.5 bg-slate-100 text-slate-600 border border-slate-200 font-bold text-xs rounded-lg disabled:opacity-50"
                >
                  Supprimer
                </button>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
