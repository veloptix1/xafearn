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
  const [filter, setFilter] = useState('all')
  
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  // Formulaire de modification
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editRole, setEditRole] = useState('')
  const [editLevel, setEditLevel] = useState(1)
  const [editCountry, setEditCountry] = useState('')
  const [editCity, setEditCity] = useState('')

  // Formulaire finances
  const [adjustFCFA, setAdjustFCFA] = useState('')
  const [adjustCoins, setAdjustCoins] = useState('')
  const [adjustCredits, setAdjustCredits] = useState('')

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
  }, [supabase, router])

  const openUser = (user: any) => {
    setSelectedUser(user)
    setActiveTab('overview')
    setEditName(user.full_name || '')
    setEditPhone(user.phone || '')
    setEditRole(user.role || 'diffuseur')
    setEditLevel(user.level || 1)
    setEditCountry(user.country || '')
    setEditCity(user.city || '')
    setAdjustFCFA(''); setAdjustCoins(''); setAdjustCredits('')
  }

  const handleUpdateProfile = async () => {
    if (!editName.trim()) return showToast('Le nom ne peut pas être vide.', 'error')
    setIsProcessing(true)
    try {
      const { error } = await supabase.from('profiles').update({
        full_name: editName.trim(),
        phone: editPhone.trim(),
        role: editRole,
        level: editLevel,
        country: editCountry.trim(),
        city: editCity.trim()
      }).eq('id', selectedUser.id)
      
      if (error) throw error
      
      const updated = { ...selectedUser, full_name: editName, phone: editPhone, role: editRole, level: editLevel, country: editCountry, city: editCity }
      setSelectedUser(updated)
      setUsers(prev => prev.map(u => u.id === selectedUser.id ? updated : u))
      showToast('Profil mis à jour !', 'success')
    } catch (err: any) { showToast('Erreur : ' + err.message, 'error') }
    setIsProcessing(false)
  }

  const handleAdjustBalance = async (type: 'fcfa' | 'coins' | 'credits') => {
    let amount = 0
    let field = ''
    let rpcName = ''
    
    if (type === 'fcfa') { amount = parseFloat(adjustFCFA); field = 'balance'; rpcName = 'admin_adjust_balance' }
    if (type === 'coins') { amount = parseFloat(adjustCoins); field = 'coins_balance'; rpcName = 'admin_adjust_coins' }
    if (type === 'credits') { amount = parseFloat(adjustCredits); field = 'credits_ia'; rpcName = 'admin_adjust_credits' }

    if (isNaN(amount) || amount === 0) return showToast('Montant invalide.', 'error')

    setIsProcessing(true)
    try {
      if (type === 'fcfa') {
        await supabase.rpc('admin_adjust_balance', { p_user_id: selectedUser.id, p_amount: amount, p_reason: 'Ajustement manuel admin' })
      } else if (type === 'coins') {
        await supabase.rpc('admin_adjust_coins', { p_user_id: selectedUser.id, p_amount: amount })
      } else {
        await supabase.rpc('admin_adjust_credits', { p_user_id: selectedUser.id, p_amount: amount })
      }

      // Recharger l'utilisateur
      const { data: newUser } = await supabase.from('profiles').select('*').eq('id', selectedUser.id).single()
      if (newUser) {
        setSelectedUser(newUser)
        setUsers(prev => prev.map(u => u.id === newUser.id ? newUser : u))
      }
      
      showToast(`${amount} ajouté(s) !`, 'success')
      if (type === 'fcfa') setAdjustFCFA('')
      if (type === 'coins') setAdjustCoins('')
      if (type === 'credits') setAdjustCredits('')
    } catch (err: any) { showToast('Erreur : ' + err.message, 'error') }
    setIsProcessing(false)
  }

  const toggleBan = async () => {
    if (!confirm(`Voulez-vous ${selectedUser.is_banned ? 'débannir' : 'bannir'} cet utilisateur ?`)) return
    setIsProcessing(true)
    try {
      await supabase.from('profiles').update({ is_banned: !selectedUser.is_banned }).eq('id', selectedUser.id)
      const newStatus = !selectedUser.is_banned
      setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, is_banned: newStatus } : u))
      setSelectedUser({ ...selectedUser, is_banned: newStatus })
      showToast(newStatus ? 'Utilisateur banni.' : 'Utilisateur débanni.', 'success')
    } catch (err: any) { showToast('Erreur : ' + err.message, 'error') }
    setIsProcessing(false)
  }

  const togglePremium = async () => {
    if (!confirm(`Voulez-vous ${selectedUser.is_premium ? 'désactiver' : 'activer'} le statut Premium ?`)) return
    setIsProcessing(true)
    try {
      await supabase.from('profiles').update({ is_premium: !selectedUser.is_premium }).eq('id', selectedUser.id)
      const newStatus = !selectedUser.is_premium
      setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, is_premium: newStatus } : u))
      setSelectedUser({ ...selectedUser, is_premium: newStatus })
      showToast(newStatus ? 'Premium activé.' : 'Premium désactivé.', 'success')
    } catch (err: any) { showToast('Erreur : ' + err.message, 'error') }
    setIsProcessing(false)
  }

  const filtered = users.filter(u => {
    const matchesSearch = u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()) || u.phone?.includes(search)
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

  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>
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
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200"><p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Total</p><p className="text-2xl font-black text-slate-900">{stats.total}</p></div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200"><p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Premium</p><p className="text-2xl font-black text-amber-500">{stats.premium}</p></div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200"><p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Annonceurs</p><p className="text-2xl font-black text-indigo-500">{stats.annonceurs}</p></div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200"><p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Bannis</p><p className="text-2xl font-black text-rose-500">{stats.banned}</p></div>
        </div>

        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <input type="text" placeholder="Rechercher par nom, email ou téléphone..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1 p-3 bg-white border border-slate-200 rounded-xl text-sm shadow-sm focus:border-sky-500 outline-none" />
          <select value={filter} onChange={e => setFilter(e.target.value)} className="p-3 bg-white border border-slate-200 rounded-xl text-sm shadow-sm focus:border-sky-500 outline-none">
            <option value="all">Tous</option>
            <option value="premium">Premium</option>
            <option value="annonceur">Annonceurs</option>
            <option value="banned">Bannis</option>
          </select>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          {filtered.length === 0 ? (
            <div className="p-10 text-center text-slate-500">Aucun utilisateur trouvé.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map(u => (
                <div key={u.id} onClick={() => openUser(u)} className="flex items-center gap-3 p-4 hover:bg-slate-50 cursor-pointer transition">
                  <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-blue-500 rounded-full flex items-center justify-center font-bold text-white text-sm shrink-0">{u.full_name?.charAt(0) || '?'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-900 text-sm truncate">{u.full_name || 'Sans nom'}</p>
                      {u.is_premium && <span className="text-[8px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">PREMIUM</span>}
                      {u.is_banned && <span className="text-[8px] font-bold bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded">BANNI</span>}
                    </div>
                    <p className="text-[10px] text-slate-500 truncate">{u.email} {u.phone && `• ${u.phone}`}</p>
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

      {/* 🚀 TIROIR COMPLET */}
      {selectedUser && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedUser(null)}></div>
          
          <div className="relative bg-white w-full max-w-md h-full shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300 flex flex-col">
            
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center z-10">
              <h2 className="font-bold text-slate-900">Détails du membre</h2>
              <button onClick={() => setSelectedUser(null)} className="p-2 bg-slate-100 rounded-full text-slate-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex bg-slate-50 border-b border-slate-200 sticky top-[65px] z-10">
              <button onClick={() => setActiveTab('overview')} className={`flex-1 py-3 text-xs font-bold transition ${activeTab === 'overview' ? 'text-sky-600 border-b-2 border-sky-500 bg-white' : 'text-slate-500'}`}>Infos</button>
              <button onClick={() => setActiveTab('edit')} className={`flex-1 py-3 text-xs font-bold transition ${activeTab === 'edit' ? 'text-sky-600 border-b-2 border-sky-500 bg-white' : 'text-slate-500'}`}>Modifier</button>
              <button onClick={() => setActiveTab('finance')} className={`flex-1 py-3 text-xs font-bold transition ${activeTab === 'finance' ? 'text-sky-600 border-b-2 border-sky-500 bg-white' : 'text-slate-500'}`}>Finances</button>
            </div>

            <div className="p-6 flex-1">
              
              {/* ONGLET 1 : TOUTES LES INFOS */}
              {activeTab === 'overview' && (
                <div className="space-y-4">
                  <div className="text-center mb-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-sky-400 to-blue-500 rounded-full flex items-center justify-center font-bold text-white text-3xl mx-auto mb-3">
                      {selectedUser.full_name?.charAt(0) || '?'}
                    </div>
                    <h3 className="text-xl font-black text-slate-900">{selectedUser.full_name}</h3>
                    <p className="text-sm text-slate-500">{selectedUser.email}</p>
                  </div>

                  {/* Liste complète des infos */}
                  <div className="bg-slate-50 rounded-2xl p-4 space-y-3 border border-slate-200">
                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                      <span className="text-xs font-bold text-slate-500">Téléphone</span>
                      <span className="text-sm font-mono font-bold text-slate-900">{selectedUser.phone || 'Non renseigné'}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                      <span className="text-xs font-bold text-slate-500">Pays</span>
                      <span className="text-sm font-bold text-slate-900">{selectedUser.country || 'Non renseigné'}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                      <span className="text-xs font-bold text-slate-500">Ville</span>
                      <span className="text-sm font-bold text-slate-900">{selectedUser.city || 'Non renseigné'}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                      <span className="text-xs font-bold text-slate-500">Rôle</span>
                      <span className="text-sm font-bold text-slate-900 uppercase">{selectedUser.role || 'diffuseur'}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                      <span className="text-xs font-bold text-slate-500">Niveau</span>
                      <span className="text-sm font-bold text-slate-900">Niveau {selectedUser.level || 1}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                      <span className="text-xs font-bold text-slate-500">Compte Premium</span>
                      <span className={`text-xs font-bold px-2 py-1 rounded ${selectedUser.is_premium ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{selectedUser.is_premium ? 'Oui' : 'Non'}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                      <span className="text-xs font-bold text-slate-500">Statut</span>
                      <span className={`text-xs font-bold px-2 py-1 rounded ${selectedUser.is_banned ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>{selectedUser.is_banned ? 'Banni' : 'Actif'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-500">Inscrit le</span>
                      <span className="text-sm text-slate-700">{new Date(selectedUser.created_at).toLocaleDateString('fr-FR')}</span>
                    </div>
                  </div>

                  {/* Soldes */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-slate-900 rounded-xl p-3 text-center"><p className="text-[9px] font-bold text-slate-400 uppercase">FCFA</p><p className="text-lg font-black text-white">{selectedUser.balance?.toLocaleString('fr-FR') || 0}</p></div>
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center"><p className="text-[9px] font-bold text-amber-600 uppercase">Jetons</p><p className="text-lg font-black text-amber-900">{selectedUser.coins_balance || 0}</p></div>
                    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-center"><p className="text-[9px] font-bold text-indigo-600 uppercase">Crédits IA</p><p className="text-lg font-black text-indigo-900">{selectedUser.credits_ia || 0}</p></div>
                  </div>

                  {/* Actions rapides */}
                  <div className="grid grid-cols-2 gap-2 pt-4">
                    <button onClick={togglePremium} disabled={isProcessing} className={`py-3 font-bold text-xs rounded-xl ${selectedUser.is_premium ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'}`}>
                      {selectedUser.is_premium ? 'Retirer Premium' : 'Activer Premium'}
                    </button>
                    <button onClick={toggleBan} disabled={isProcessing} className={`py-3 font-bold text-xs rounded-xl ${selectedUser.is_banned ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                      {selectedUser.is_banned ? 'Débannir' : 'Bannir'}
                    </button>
                  </div>
                </div>
              )}

              {/* ONGLET 2 : MODIFIER */}
              {activeTab === 'edit' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Nom complet</label>
                    <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-sky-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Téléphone</label>
                    <input type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-sky-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Pays</label>
                      <input type="text" value={editCountry} onChange={e => setEditCountry(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-sky-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Ville</label>
                      <input type="text" value={editCity} onChange={e => setEditCity(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-sky-500" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Rôle</label>
                      <select value={editRole} onChange={e => setEditRole(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-sky-500">
                        <option value="diffuseur">Diffuseur</option>
                        <option value="annonceur">Annonceur</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Niveau</label>
                      <input type="number" min={1} max={3} value={editLevel} onChange={e => setEditLevel(parseInt(e.target.value) || 1)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-sky-500" />
                    </div>
                  </div>
                  <button onClick={handleUpdateProfile} disabled={isProcessing} className="w-full py-3 bg-sky-500 text-white font-bold rounded-xl shadow-md disabled:opacity-50 mt-4">
                    {isProcessing ? 'Enregistrement...' : 'Enregistrer les modifications'}
                  </button>
                </div>
              )}

              {/* ONGLET 3 : FINANCES */}
              {activeTab === 'finance' && (
                <div className="space-y-6">
                  <div className="bg-slate-900 rounded-2xl p-4 text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Solde actuel</p>
                    <p className="text-3xl font-black text-white">{selectedUser.balance?.toLocaleString('fr-FR') || 0} F</p>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900 text-sm mb-2">Ajuster le solde FCFA</h4>
                    <div className="flex gap-2">
                      <input type="number" placeholder="ex: 500 ou -500" value={adjustFCFA} onChange={e => setAdjustFCFA(e.target.value)} className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
                      <button onClick={() => handleAdjustBalance('fcfa')} disabled={isProcessing} className="px-4 bg-emerald-500 text-white font-bold text-sm rounded-xl disabled:opacity-50">Appliquer</button>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900 text-sm mb-2">Ajuster les jetons ({selectedUser.coins_balance || 0})</h4>
                    <div className="flex gap-2">
                      <input type="number" placeholder="ex: 100 ou -100" value={adjustCoins} onChange={e => setAdjustCoins(e.target.value)} className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
                      <button onClick={() => handleAdjustBalance('coins')} disabled={isProcessing} className="px-4 bg-amber-500 text-white font-bold text-sm rounded-xl disabled:opacity-50">Appliquer</button>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900 text-sm mb-2">Ajuster les crédits IA ({selectedUser.credits_ia || 0})</h4>
                    <div className="flex gap-2">
                      <input type="number" placeholder="ex: 50 ou -50" value={adjustCredits} onChange={e => setAdjustCredits(e.target.value)} className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
                      <button onClick={() => handleAdjustBalance('credits')} disabled={isProcessing} className="px-4 bg-indigo-500 text-white font-bold text-sm rounded-xl disabled:opacity-50">Appliquer</button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </main>
  )
}
