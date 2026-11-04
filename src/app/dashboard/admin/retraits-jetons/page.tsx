'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Toast from '@/components/Toast'

export default function AdminCoinWithdrawalsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [withdrawals, setWithdrawals] = useState<any[]>([])
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    loadWithdrawals()
  }, [])

  async function loadWithdrawals() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.push('/login')
    
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (!profile || (profile.role !== 'admin' && !profile.is_admin)) return router.push('/dashboard')

    const { data } = await supabase
      .from('coin_withdrawals')
      .select('*, profiles(full_name, email)')
      .order('created_at', { ascending: true })
    
    setWithdrawals(data || [])
    setLoading(false)
  }

  const handleMarkAsPaid = async (w: any) => {
    setProcessingId(w.id)
    try {
      // 1. Mettre à jour le statut
      await supabase.from('coin_withdrawals').update({ status: 'paid' }).eq('id', w.id)

      // 2. Notification pour le créateur
      await supabase.from('notifications').insert({
        user_id: w.user_id,
        title: 'Paiement envoyé ! 💰',
        message: `Tes ${w.fcfc_amount} FCFA ont été envoyés sur ton compte ${w.payment_method} (${w.phone_number}).`,
        link: '/dashboard'
      })

      setToast({ message: 'Retrait marqué comme payé.', type: 'success' })
      setTimeout(() => window.location.reload(), 1500)
    } catch (err) {
      setToast({ message: 'Erreur lors de la mise à jour.', type: 'error' })
    }
    setProcessingId(null)
  }

  const handleReject = async (w: any) => {
    if (!confirm('Rejeter ce retrait et rembourser les jetons au créateur ?')) return
    setProcessingId(w.id)
    try {
      // 1. Rembourser les jetons
      const { data: profile } = await supabase.from('profiles').select('coins_balance').eq('id', w.user_id).single()
      if (profile) {
        await supabase.from('profiles').update({ 
          coins_balance: (profile.coins_balance || 0) + w.coins_amount 
        }).eq('id', w.user_id)
      }

      // 2. Mettre à jour le statut
      await supabase.from('coin_withdrawals').update({ status: 'rejected' }).eq('id', w.id)

      // 3. Notification
      await supabase.from('notifications').insert({
        user_id: w.user_id,
        title: 'Retrait rejeté ❌',
        message: `Ta demande a été rejetée. Tes ${w.coins_amount} jetons ont été remboursés sur ton compte.`,
        link: '/dashboard'
      })

      setToast({ message: 'Retrait rejeté et jetons remboursés.', type: 'success' })
      setTimeout(() => window.location.reload(), 1500)
    } catch (err) {
      setToast({ message: 'Erreur lors du rejet.', type: 'error' })
    }
    setProcessingId(null)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex items-center gap-4">
        <Link href="/dashboard/admin" className="text-slate-500 bg-slate-100 p-2 rounded-full">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-lg font-bold text-slate-900">Retraits de Jetons</h1>
      </header>

      <div className="p-4 md:p-8 max-w-4xl mx-auto mt-2 space-y-4">
        
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl">
          <p className="text-sm text-amber-800 font-medium">
            ⚠️ <strong>Rappel :</strong> LeekPay ne gère pas les envois automatiques. Effectue le transfert Mobile Money manuellement depuis ton téléphone, puis clique sur "Marquer comme payé".
          </p>
        </div>

        {withdrawals.length === 0 ? (
          <div className="bg-white p-8 rounded-3xl text-center text-slate-500">Aucun retrait en attente.</div>
        ) : (
          withdrawals.map(w => (
            <div key={w.id} className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex-1">
                <h3 className="font-bold text-slate-900">{w.profiles?.full_name}</h3>
                <p className="text-xs text-slate-500">{w.profiles?.email}</p>
                <div className="mt-2 space-y-1 text-sm">
                  <p>Jetons : <strong className="text-amber-600">{w.coins_amount}</strong> → FCFA : <strong className="text-emerald-600">{w.fcfc_amount} F</strong></p>
                  <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg inline-block">
                    📱 {w.payment_method} • <strong>{w.phone_number}</strong> • {w.full_name}
                  </p>
                </div>
              </div>
              
              {w.status === 'pending' ? (
                <div className="flex gap-2 shrink-0">
                  <button 
                    onClick={() => handleMarkAsPaid(w)} 
                    disabled={processingId === w.id}
                    className="px-4 py-2 bg-emerald-500 text-white font-bold text-sm rounded-lg disabled:opacity-50"
                  >
                    {processingId === w.id ? '...' : 'Marquer Payé'}
                  </button>
                  <button 
                    onClick={() => handleReject(w)} 
                    disabled={processingId === w.id}
                    className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 font-bold text-sm rounded-lg disabled:opacity-50"
                  >
                    Rejeter
                  </button>
                </div>
              ) : (
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${w.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                  {w.status === 'paid' ? 'Payé' : 'Rejeté'}
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </main>
  )
}
