'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Toast from '@/components/Toast'

// 🚀 COMPOSANT POUR LES RETRAITS
export function WithdrawalAdminSection() {
  const supabase = createClient()
  const router = useRouter()
  const [withdrawals, setWithdrawals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null)

  // Charger les retraits au montage
  useState(() => {
    async function load() {
      const { data } = await supabase.from('withdrawals').select('*, profiles(full_name)').eq('status', 'pending').order('created_at', { ascending: true })
      setWithdrawals(data || [])
      setLoading(false)
    }
    load()
  })

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleAction = async (id: string, status: 'approved' | 'rejected') => {
    setActionLoading(id)
    const { error } = await supabase.from('withdrawals').update({ status }).eq('id', id)
    if (error) {
      showToast('Erreur : ' + error.message, 'error')
    } else {
      showToast(status === 'approved' ? 'Retrait approuvé !' : 'Retrait rejeté.', 'success')
      setWithdrawals(prev => prev.filter(w => w.id !== id))
      router.refresh()
    }
    setActionLoading(null)
  }

  if (loading) return <div className="text-center py-10 text-slate-500">Chargement...</div>

  return (
    <div className="space-y-4">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      {withdrawals.length === 0 ? (
        <div className="bg-white border border-slate-200 p-8 rounded-2xl text-center text-slate-500">Aucune demande de retrait.</div>
      ) : (
        withdrawals.map((w: any) => (
          <div key={w.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-slate-900">{w.profiles?.full_name}</h3>
              <p className="text-xs text-slate-500">{new Date(w.created_at).toLocaleDateString('fr-FR')}</p>
              <p className="text-lg font-black text-emerald-600 mt-1">{w.amount} F</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleAction(w.id, 'rejected')} disabled={actionLoading === w.id} className="px-3 py-2 bg-red-50 text-red-600 border border-red-200 font-bold text-xs rounded-lg disabled:opacity-50">Rejeter</button>
              <button onClick={() => handleAction(w.id, 'approved')} disabled={actionLoading === w.id} className="px-3 py-2 bg-emerald-500 text-white font-bold text-xs rounded-lg disabled:opacity-50">
                {actionLoading === w.id ? '...' : 'Approuver'}
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

// 🚀 COMPOSANT POUR LES UTILISATEURS
export function AdminUserRow({ user }: { user: any }) {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const toggleRole = async () => {
    setLoading(true)
    const newRole = user.role === 'admin' ? 'user' : 'admin'
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', user.id)
    if (error) showToast('Erreur : ' + error.message, 'error')
    else {
      showToast(`Rôle : ${newRole}`, 'success')
      router.refresh()
    }
    setLoading(false)
  }

  const deleteUser = async () => {
    if (!confirm('Supprimer définitivement cet utilisateur ?')) return
    setLoading(true)
    const { error } = await supabase.from('profiles').delete().eq('id', user.id)
    if (error) showToast('Erreur : ' + error.message, 'error')
    else {
      showToast('Utilisateur supprimé !', 'success')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <tr className="hover:bg-slate-50 transition">
      {toast && <td><Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} /></td>}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-sky-400 to-blue-500 rounded-full flex items-center justify-center font-bold text-white text-xs">
            {user.full_name?.charAt(0) || '?'}
          </div>
          <div>
            <p className="font-bold text-slate-900">{user.full_name || 'Sans nom'}</p>
            <p className="text-xs text-slate-500">{user.email}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`px-2 py-1 text-[10px] font-bold rounded-lg ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
          {user.role || 'user'}
        </span>
      </td>
      <td className="px-4 py-3 font-bold text-amber-600">🪙 {user.coins_balance || 0}</td>
      <td className="px-4 py-3 text-right space-x-2">
        <button onClick={toggleRole} disabled={loading} className="px-3 py-1.5 bg-sky-50 text-sky-600 border border-sky-200 font-bold text-xs rounded-lg hover:bg-sky-100 transition disabled:opacity-50">
          {user.role === 'admin' ? 'Rétrograder' : 'Promouvoir'}
        </button>
        <button onClick={deleteUser} disabled={loading} className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 font-bold text-xs rounded-lg hover:bg-red-100 transition disabled:opacity-50">
          {loading ? '...' : 'Suppr.'}
        </button>
      </td>
    </tr>
  )
}
