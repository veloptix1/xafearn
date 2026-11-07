'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Toast from '@/components/Toast'

export default function AdminUsersPage() {
  const supabase = createClient()
  const router = useRouter()
  
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all') // all, premium, annonceur, banned
  
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null)
  
  // Formulaire de modification
  const [adjustAmount, setAdjustAmount] = useState('')
  const [adjustReason, setAdjustReason] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => setToast({ message: msg, type })

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')

      const { data: prof } = await supabase.from('profiles').select('role, is_admin').eq('id', user.id).single()
      if (!prof || (prof.role !== 'admin' && !prof.is_admin)) return router.push('/dashboard')
      
      setIsAdmin(true)

      const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
      setUsers(data || [])
      setLoading(false)
    }
    load()
  }, [router, supabase])

  const filtered = users.filter(u => {
    const matchesSearch = u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
    if (!matchesSearch) return false
    
    if (filter === 'premium') return u.is_premium === true
    if (filter === 'annonceur') return u.role === 'annonceur'
    if (filter === 'banned') return u.is_banned === true
    return true
  })

  const stats = {
    total: users.length,
    premium: users.filter(u => u.is_premium).length,
    annonceurs: users.filter(u => u.role === 'annonceur').length,
    banned: users.filter(u => u.is_banned).length
  }

  const handleAdjustBalance = async () => {
    const amount = parseFloat(adjustAmount)
    if (isNaN(amount) || amount === 0) return showToast('Montant invalide.', 'error')
    if (!adjustReason.trim()) return showToast('Raison requise.', 'error')
    
    setIsProcessing(true)
    try {
      const { data, error } = await supabase.rpc('admin_adjust_balance', {
        p_user_id: selectedUser.id,
        p_amount: amount,
        p_reason: adjustReason.trim()
      })
      
      if (error) throw error
      if (!data.success) throw new Error('Erreur inconnue')

      showToast(`Solde ajusté ! Nouveau solde : ${data.new_balance.toLocaleString('fr-FR')} F`, 'success')
      
      // Mettre à jour localement
      setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, balance: data.new_balance } : u))
      setSelectedUser({ ...selectedUser, balance: data.new_balance })
      setAdjustAmount('')
      setAdjustReason('')
    } catch (err: any) {
      showToast('Erreur: ' + err.message, 'error')
    }
    setIsProcessing(false)
  }

  const toggleBan = async () => {
    if (!confirm(`Voulez-vous ${selectedUser.is_banned ? 'débannir' : 'bannir'} cet utilisateur ?`)) return
    
    setIsProcessing(true)
    try {
      const { data, error } = await supabase.rpc('admin_toggle_ban', {
        p_user_id: selectedUser.id,
        p_ban: !selectedUser.is_banned
      })
      
      if (error) throw error

      const newStatus = !selectedUser.is_banned
      setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, is_banned: newStatus } : u))
      setSelectedUser({ ...selectedUser, is_banned: newStatus })
      showToast(newStatus ? 'Utilisateur banni.' : 'Utilisateur débanni.', 'success')
    } catch (err: any) {
      showToast('Erreur: ' + err.message, 'error')
    }
    setIsProcessing(false)
  }

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
      <div className="w-10 h-10 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin mb-4"></div>
      <p className="text-slate-500 font-medium">Chargement des utilisateurs...</p>
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
          <h1 className="text-lg font-bold text-slate-900">Gestion des Utilisateurs</h1>
          <p className="text-xs text-slate-500">{users.length} membres inscrits</p>
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
            <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Premium</p>
            <p className="text-2xl font-black text-amber-500">{stats.premium}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
            <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Annonceurs</p>
            <p className="text-2xl font-black text-indigo-500">{stats.annonceurs}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
            <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Bannis</p>
            <p className="text-2xl font-black text-rose-500">{stats.banned}</p>
          </div>
        </div>

        {/* Recherche et Filtres */}
        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <input 
            type="text" 
            placeholder="Rechercher par nom ou email..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            className="flex-1 p-3 bg-white border border-slate-200 rounded-xl text-sm shadow-sm focus:border-sky-500 outline-none transition" 
          />
          <select 
            value={filter} 
            onChange={e => setFilter(e.target.value)} 
            className="p-3 bg-white border border-slate-200 rounded-xl text-sm shadow-sm focus:border-sky-500 outline-none"
          >
            <option value="all">Tous</option>
            <option value="premium">Premium</option>
            <option value="annonceur">Annonceurs</option>
            <option value="banned">Bannis</option>
          </select>
        </div>

        {/* Liste des utilisateurs */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          {filtered.length === 0 ? (
            <div className="p-10 text-center text-slate-500">Aucun utilisateur trouvé.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map(u => (
                <div 
                  key={u.id} 
                  onClick={() => setSelectedUser(u)}
                  className="flex items-center gap-3 p-4 hover:bg-slate-50 cursor-pointer transition"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-blue-500 rounded-full flex items-center justify-center font-bold text-white text-sm shrink-0">
                    {u.full_name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-900 text-sm truncate">{u.full_name || 'Sans nom'}</p>
                      {u.is_premium && <span className="text-[8px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">PREMIUM</span>}
                      {u.is_banned && <span className="text-[8px] font-bold bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded">BANNI</span>}
                    </div>
                    <p className="text-[10px] text-slate-500 truncate">{u.email}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-black text-slate-900">{u.balance?.toLocaleString('fr-FR') || 0} F</p>
                    <p className="text-[10px] text-slate-500 uppercase">{u.role || 'diffuseur'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Drawer de détails utilisateur */}
      {selectedUser && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedUser(null)}></div>
          <div className="relative bg-white w-full max-w-md h-full shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300">
            
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center z-10">
              <h2 className="font-bold text-slate-900">Détails de l'utilisateur</h2>
              <button onClick={() => setSelectedUser(null)} className="p-2 bg-slate-100 rounded-full text-slate-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Info Profil */}
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-sky-400 to-blue-500 rounded-full flex items-center justify-center font-bold text-white text-3xl mx-auto mb-3">
                  {selectedUser.full_name?.charAt(0) || '?'}
                </div>
                <h3 className="text-xl font-black text-slate-900">{selectedUser.full_name || 'Sans nom'}</h3>
                <p className="text-sm text-slate-500">{selectedUser.email}</p>
                <p className="text-xs text-slate-400 mt-1">Inscrit le {new Date(selectedUser.created_at).toLocaleDateString('fr-FR')}</p>
                <div className="flex justify-center gap-2 mt-3">
                  {selectedUser.is_premium && <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded-md">Premium</span>}
                  {selectedUser.is_banned && <span className="text-[10px] font-bold bg-rose-100 text-rose-700 px-2 py-1 rounded-md">Banni</span>}
                  <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-1 rounded-md uppercase">{selectedUser.role}</span>
                </div>
              </div>

              {/* Solde */}
              <div className="bg-slate-900 rounded-2xl p-5 text-white">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Solde actuel</p>
                <p className="text-3xl font-black">{selectedUser.balance?.toLocaleString('fr-FR') || 0} FCFA</p>
              </div>

              {/* Ajuster le solde */}
              <div className="border border-slate-200 rounded-2xl p-4">
                <h4 className="font-bold text-slate-900 text-sm mb-3">Ajuster le solde</h4>
                <div className="space-y-2">
                  <input 
                    type="number" 
                    placeholder="Montant (ex: 500 ou -500)" 
                    value={adjustAmount} 
                    onChange={e => setAdjustAmount(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-sky-500" 
                  />
                  <input 
                    type="text" 
                    placeholder="Raison (ex: Compensation, Bonus...)" 
                    value={adjustReason} 
                    onChange={e => setAdjustReason(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-sky-500" 
                  />
                  <button 
                    onClick={handleAdjustBalance} 
                    disabled={isProcessing}
                    className="w-full py-2.5 bg-emerald-500 text-white font-bold text-sm rounded-lg disabled:opacity-50 active:scale-[0.98] transition"
                  >
                    {isProcessing ? 'Traitement...' : 'Appliquer'}
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <button 
                  onClick={toggleBan}
                  disabled={isProcessing}
                  className={`w-full py-3 font-bold rounded-xl text-sm flex items-center justify-center gap-2 ${selectedUser.is_banned ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-rose-50 text-rose-600 border border-rose-200'}`}
                >
                  {selectedUser.is_banned ? 'Débannir cet utilisateur' : 'Bannir cet utilisateur'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
