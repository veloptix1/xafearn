'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Toast from '@/components/Toast'

// ==========================================
// RETRAITS
// ==========================================
export function WithdrawalAdminSection() {
  const supabase = createClient()
  const router = useRouter()
  const [withdrawals, setWithdrawals] = useState<any[]>([])
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

      const { data } = await supabase.from('withdrawals').select('*, profiles(full_name, email)').eq('status', 'pending').order('created_at', { ascending: true })
      setWithdrawals(data || [])
      setLoading(false)
    }
    load()
  }, [router, supabase])

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    setActionLoading(id)
    try {
      const { data, error } = await supabase.rpc('admin_process_withdrawal', { p_withdrawal_id: id, p_admin_id: profile.id, p_action: action })
      if (error) throw error
      if (!data.success) throw new Error(data.error)
      showToast(action === 'approve' ? 'Retrait approuvé.' : 'Retrait rejeté et remboursé.', 'success')
      setWithdrawals(prev => prev.filter(w => w.id !== id))
    } catch (err: any) {
      showToast(err.message, 'error')
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) return <div className="p-10 text-center text-slate-500">Chargement...</div>

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {withdrawals.length === 0 ? (
        <div className="bg-white border border-slate-200 p-8 rounded-2xl text-center text-slate-500">Aucune demande de retrait.</div>
      ) : (
        <div className="space-y-3">
          {withdrawals.map(w => (
            <div key={w.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-bold text-slate-900">{w.profiles?.full_name}</p>
                  <p className="text-xs text-slate-500">{w.profiles?.email}</p>
                  <p className="text-xs text-slate-400 mt-1">{new Date(w.created_at).toLocaleDateString('fr-FR')} • {w.operator} • {w.phone_number}</p>
                </div>
                <p className="text-xl font-black text-emerald-600">{w.amount} F</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleAction(w.id, 'reject')} disabled={actionLoading === w.id} className="flex-1 py-2.5 bg-red-50 text-red-600 border border-red-200 font-bold text-xs rounded-lg disabled:opacity-50">Rejeter & Rembourser</button>
                <button onClick={() => handleAction(w.id, 'approve')} disabled={actionLoading === w.id} className="flex-1 py-2.5 bg-emerald-500 text-white font-bold text-xs rounded-lg disabled:opacity-50 shadow-md">
                  {actionLoading === w.id ? '...' : 'Approuver'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ==========================================
// UTILISATEURS
// ==========================================
export function AdminUserRow({ user }: { user: any }) {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [showBalance, setShowBalance] = useState(false)
  const [coins, setCoins] = useState('0')
  const [fcfa, setFcfa] = useState('0')
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null)
  const [adminProfile, setAdminProfile] = useState<any>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) supabase.from('profiles').select('*').eq('id', data.user.id).single().then(r => setAdminProfile(r.data))
    })
  }, [])

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  const toggleBlock = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('admin_toggle_block', { p_user_id: user.id, p_admin_id: adminProfile.id })
      if (error) throw error
      if (!data.success) throw new Error(data.error)
      showToast(data.is_blocked ? 'Utilisateur bloqué.' : 'Utilisateur débloqué.', 'success')
      router.refresh()
    } catch (err: any) { showToast(err.message, 'error') }
    setLoading(false)
  }

  const toggleRole = async () => {
    if (!confirm('Changer le rôle de cet utilisateur ?')) return
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('admin_toggle_role', { p_user_id: user.id, p_admin_id: adminProfile.id })
      if (error) throw error
      if (!data.success) throw new Error(data.error)
      showToast(`Rôle changé : ${data.new_role}`, 'success')
      router.refresh()
    } catch (err: any) { showToast(err.message, 'error') }
    setLoading(false)
  }

  const deleteUser = async () => {
    if (!confirm('SUPPRIMER définitivement cet utilisateur ? Toutes ses données seront perdues.')) return
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('admin_delete_user', { p_user_id: user.id, p_admin_id: adminProfile.id })
      if (error) throw error
      if (!data.success) throw new Error(data.error)
      showToast('Utilisateur supprimé.', 'success')
      router.refresh()
    } catch (err: any) { showToast(err.message, 'error') }
    setLoading(false)
  }

  // 🚀 DÉFINIR LE SOLDE (remplace au lieu d'ajouter)
  const adjustBalance = async () => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          coins_balance: parseInt(coins) || 0,
          balance: parseFloat(fcfa) || 0
        })
        .eq('id', user.id)

      if (error) throw error
      
      showToast('Solde mis à jour.', 'success')
      setShowBalance(false)
      router.refresh()
    } catch (err: any) { 
      showToast(err.message, 'error') 
    }
    setLoading(false)
  }

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <tr className="hover:bg-slate-50 transition">
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-sky-400 to-blue-500 rounded-full flex items-center justify-center font-bold text-white text-xs shrink-0">
              {user.full_name?.charAt(0) || '?'}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-slate-900 truncate">{user.full_name || 'Sans nom'}</p>
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-col gap-1">
            <span className={`px-2 py-1 text-[10px] font-bold rounded-lg w-fit ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>{user.role || 'user'}</span>
            {user.is_blocked && <span className="px-2 py-1 text-[10px] font-bold rounded-lg bg-red-100 text-red-700 w-fit">Bloqué</span>}
          </div>
        </td>
        <td className="px-4 py-3">
          <p className="text-xs font-bold text-amber-600">🪙 {user.coins_balance || 0}</p>
          <p className="text-xs font-bold text-emerald-600">{user.balance || 0} F</p>
        </td>
        <td className="px-4 py-3 text-right">
          <div className="flex flex-wrap gap-1 justify-end">
            <button onClick={() => setShowDetails(true)} className="px-2 py-1.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded">Voir</button>
            <button 
              onClick={() => { 
                setShowBalance(true); 
                setCoins(String(user.coins_balance || 0)); 
                setFcfa(String(user.balance || 0)); 
              }} 
              className="px-2 py-1.5 bg-amber-50 text-amber-600 border border-amber-200 text-[10px] font-bold rounded"
            >
              Solde
            </button>
            <button onClick={toggleRole} disabled={loading} className="px-2 py-1.5 bg-sky-50 text-sky-600 border border-sky-200 text-[10px] font-bold rounded disabled:opacity-50">{user.role === 'admin' ? 'Retirer' : 'Admin'}</button>
            <button onClick={toggleBlock} disabled={loading} className={`px-2 py-1.5 text-[10px] font-bold rounded disabled:opacity-50 ${user.is_blocked ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{user.is_blocked ? 'Débloquer' : 'Bloquer'}</button>
            <button onClick={deleteUser} disabled={loading} className="px-2 py-1.5 bg-red-50 text-red-600 border border-red-200 text-[10px] font-bold rounded disabled:opacity-50">Suppr.</button>
          </div>
        </td>
      </tr>

      {showDetails && (
        <tr>
          <td colSpan={4}>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <div className="bg-white rounded-3xl w-full max-w-md p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-lg">Détails utilisateur</h3>
                  <button onClick={() => setShowDetails(false)} className="text-slate-400">✕</button>
                </div>
                <div className="space-y-2 text-sm">
                  <p><strong>Nom :</strong> {user.full_name}</p>
                  <p><strong>Email :</strong> {user.email}</p>
                  <p><strong>Téléphone :</strong> {user.phone || 'Non renseigné'}</p>
                  <p><strong>Ville :</strong> {user.city || '—'}</p>
                  <p><strong>Rôle :</strong> {user.role || 'user'}</p>
                  <p><strong>Niveau :</strong> {user.level || 1}</p>
                  <p><strong>Jetons :</strong> {user.coins_balance || 0}</p>
                  <p><strong>Solde FCFA :</strong> {user.balance || 0}</p>
                  <p><strong>Inscrit le :</strong> {new Date(user.created_at).toLocaleDateString('fr-FR')}</p>
                  <p><strong>Statut :</strong> {user.is_blocked ? '🔴 Bloqué' : '🟢 Actif'}</p>
                </div>
                <button onClick={() => setShowDetails(false)} className="w-full mt-6 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl">Fermer</button>
              </div>
            </div>
          </td>
        </tr>
      )}

      {showBalance && (
        <tr>
          <td colSpan={4}>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <div className="bg-white rounded-3xl w-full max-w-md p-6">
                <h3 className="font-bold text-lg mb-2">Définir le solde de {user.full_name}</h3>
                <p className="text-xs text-slate-500 mb-4">Actuel : {user.coins_balance || 0} 🪙 et {user.balance || 0} F</p>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nouveau solde en jetons</label>
                    <input 
                      type="number" 
                      value={coins} 
                      onChange={e => setCoins(e.target.value)} 
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nouveau solde FCFA</label>
                    <input 
                      type="number" 
                      value={fcfa} 
                      onChange={e => setFcfa(e.target.value)} 
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" 
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={() => setShowBalance(false)} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl">Annuler</button>
                  <button onClick={adjustBalance} disabled={loading} className="flex-1 py-3 bg-emerald-500 text-white font-bold rounded-xl disabled:opacity-50">
                    {loading ? '...' : 'Définir'}
                  </button>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ==========================================
// EMAIL FORM - AVEC LOGS VISIBLES
// ==========================================
export function EmailForm({ users }: { users: any[] }) {
  const [selectedTemplate, setSelectedTemplate] = useState('custom')
  const [selectedUser, setSelectedUser] = useState('all')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null)
  const [lastResult, setLastResult] = useState<string>('')

  const templates: Record<string, { subject: string, message: string }> = {
    welcome: { subject: "Bienvenue sur XAFEARN", message: "Salut !\n\nBienvenue sur XAFEARN, la plateforme qui te permet de gagner de l'argent en ligne." },
    promo: { subject: "Offre spéciale : Gagnez plus de jetons", message: "Bonjour,\n\nProfitez de notre offre spéciale cette semaine !" },
    maintenance: { subject: "Maintenance planifiée", message: "Bonjour,\n\nLa plateforme sera en maintenance ce soir de 22h à 00h." },
    custom: { subject: '', message: '' }
  }

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 6000)
  }

  const handleTemplateChange = (key: string) => {
    setSelectedTemplate(key)
    setSubject(templates[key].subject)
    setMessage(templates[key].message)
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject || !message) return showToast('Sujet et message requis.', 'error')
    
    setIsSending(true)
    setLastResult('🚀 Envoi en cours...')
    showToast('Envoi en cours...', 'info')

    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: selectedUser === 'all' ? 'all' : users.find(u => u.id === selectedUser)?.email,
          subject,
          message,
          users: selectedUser === 'all' ? users.map(u => u.email) : null
        })
      })

      const text = await res.text()
      let data
      try { data = JSON.parse(text) } catch { data = { error: text } }

      if (!res.ok) {
        throw new Error(data.error || `Erreur HTTP ${res.status}`)
      }

      if (data.success && data.sent > 0) {
        const resultMsg = `✅ ${data.sent} email(s) envoyé(s) avec succès.`
        setLastResult(resultMsg)
        showToast(resultMsg, 'success')
        setSubject(''); setMessage(''); setSelectedTemplate('custom')
      } else {
        throw new Error(data.error || 'Aucun email n\'a été envoyé.')
      }
    } catch (err: any) {
      console.error('Erreur envoi:', err)
      const errorMsg = `❌ ${err.message}`
      setLastResult(errorMsg)
      showToast(errorMsg, 'error')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <form onSubmit={handleSend} className="space-y-4">
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[200] px-4 py-3 rounded-xl shadow-lg text-white text-sm font-bold flex items-center gap-2 max-w-[90%] ${
          toast.type === 'success' ? 'bg-emerald-500' : 
          toast.type === 'error' ? 'bg-red-500' : 
          'bg-sky-500'
        }`}>
          <span>{toast.message}</span>
        </div>
      )}

      <div>
        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Modèle</label>
        <div className="flex flex-wrap gap-2">
          {Object.keys(templates).map(key => (
            <button key={key} type="button" onClick={() => handleTemplateChange(key)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${selectedTemplate === key ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-300'}`}>
              {key === 'welcome' ? 'Bienvenue' : key === 'promo' ? 'Promo' : key === 'maintenance' ? 'Maintenance' : 'Personnalisé'}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Destinataire</label>
        <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)} className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white">
          <option value="all">Tous les utilisateurs ({users.length})</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Sujet</label>
        <input type="text" value={subject} onChange={e => setSubject(e.target.value)} className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white" placeholder="Sujet..." required />
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Message</label>
        <textarea value={message} onChange={e => setMessage(e.target.value)} rows={6} className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white resize-none" placeholder="Message..." required />
      </div>

      {lastResult && (
        <div className={`p-3 rounded-xl text-xs font-bold ${
          lastResult.startsWith('✅') ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-800' :
          lastResult.startsWith('❌') ? 'bg-red-900/40 text-red-300 border border-red-800' :
          'bg-sky-900/40 text-sky-300 border border-sky-800'
        }`}>
          {lastResult}
        </div>
      )}

      <button type="submit" disabled={isSending} className="w-full py-4 bg-sky-500 text-white font-bold rounded-xl disabled:opacity-50 shadow-md flex justify-center items-center gap-2">
        {isSending ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            Envoi en cours...
          </>
        ) : (
          'Envoyer l\'email'
        )}
      </button>
    </form>
  )
}
