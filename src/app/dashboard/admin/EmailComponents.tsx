'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const TEMPLATES = [
  { name: 'Nouvelle campagne', subject: 'Nouvelle campagne disponible sur XAFEARN', message: "Bonjour,\n\nUne nouvelle campagne est disponible. Connectez-vous dès maintenant.\n\nL'équipe XAFEARN" },
  { name: 'Rappel', subject: 'Rappel : Vérifiez votre annonce', message: "Bonjour,\n\nN'oubliez pas de vérifier votre statut pour valider vos gains.\n\nL'équipe XAFEARN" },
  { name: 'Info importante', subject: 'Information importante concernant XAFEARN', message: "Bonjour,\n\nNous avons de nouvelles fonctionnalités sur la plateforme.\n\nL'équipe XAFEARN" },
  { name: 'Relance', subject: 'Vous nous manquez sur XAFEARN', message: "Bonjour,\n\nCela fait un moment que vous ne vous êtes pas connecté.\n\nL'équipe XAFEARN" }
]

export function AdminUserRow({ user }: { user: any }) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [emailSubject, setEmailSubject] = useState('')
  const [emailMessage, setEmailMessage] = useState('')
  const [newBalance, setNewBalance] = useState(user.balance || 0)
  
  const supabase = createClient()
  const router = useRouter()

  const handleUpdateBalance = async () => {
    setLoading(true)
    await supabase.from('profiles').update({ balance: parseFloat(newBalance) }).eq('id', user.id)
    setToast('Solde mis à jour !')
    setLoading(false)
    setTimeout(() => { setToast(null); router.refresh() }, 1500)
  }

  const handleBlock = async () => {
    setLoading(true)
    await supabase.from('profiles').update({ is_blocked: !user.is_blocked }).eq('id', user.id)
    setToast(user.is_blocked ? 'Utilisateur débloqué' : 'Utilisateur bloqué')
    setLoading(false)
    setTimeout(() => { setToast(null); router.refresh() }, 1500)
  }

  const handleDelete = async () => {
    if (!confirm(`Supprimer définitivement ${user.full_name} ?`)) return
    setLoading(true)
    await supabase.from('profiles').delete().eq('id', user.id)
    setToast('Utilisateur supprimé')
    setLoading(false)
    setTimeout(() => { setIsOpen(false); router.refresh() }, 1500)
  }

  const handleSendEmail = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emails: [user.email], subject: emailSubject, message: emailMessage })
    })
    if (res.ok) {
      setToast('Email envoyé !')
      setEmailSubject('')
      setEmailMessage('')
    } else {
      setToast('Erreur envoi email')
    }
    setLoading(false)
    setTimeout(() => setToast(null), 3000)
  }

  return (
    <>
      <tr className="hover:bg-slate-50 cursor-pointer" onClick={() => setIsOpen(true)}>
        <td className="px-4 py-3">
          <div className="font-bold text-slate-900">{user.full_name}</div>
          <div className="text-xs text-slate-500">{user.email}</div>
        </td>
        <td className="px-4 py-3 capitalize">{user.role} {user.is_admin && <span className="bg-amber-100 text-amber-700 text-[10px] px-1 rounded ml-1">ADMIN</span>}</td>
        <td className="px-4 py-3">
          {user.is_blocked ? (
            <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-1 rounded">Bloqué</span>
          ) : (
            <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded">Actif</span>
          )}
        </td>
        <td className="px-4 py-3 font-bold text-emerald-600">{user.balance} F</td>
        <td className="px-4 py-3 text-right">
          <button className="px-3 py-1 bg-sky-100 text-sky-700 text-xs font-bold rounded">Gérer</button>
        </td>
      </tr>

      {isOpen && (
        <tr>
          <td colSpan={5} className="p-0">
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsOpen(false)}>
              <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 sticky top-0 z-10">
                  <h3 className="font-bold text-lg">Gérer l'utilisateur</h3>
                  <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-900 bg-white rounded-full p-1 shadow-sm">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>

                <div className="p-5 space-y-5">
                  {toast && <div className="bg-emerald-50 text-emerald-700 p-3 rounded-xl text-sm font-bold text-center">{toast}</div>}
                  
                  {/* Infos */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-lg font-black text-slate-700 border border-slate-200">
                        {user.full_name?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{user.full_name}</p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs mt-3">
                      <div className="bg-white p-2 rounded border border-slate-100"><span className="text-slate-500">Rôle:</span> <strong>{user.role}</strong></div>
                      <div className="bg-white p-2 rounded border border-slate-100"><span className="text-slate-500">Niveau:</span> <strong>{user.level}</strong></div>
                      <div className="bg-white p-2 rounded border border-slate-100"><span className="text-slate-500">Pays:</span> <strong>{user.country || '-'}</strong></div>
                      <div className="bg-white p-2 rounded border border-slate-100"><span className="text-slate-500">Ville:</span> <strong>{user.city || '-'}</strong></div>
                    </div>
                  </div>

                  {/* Modifier le solde */}
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase mb-2">Modifier le solde</p>
                    <div className="flex gap-2">
                      <input type="number" value={newBalance} onChange={e => setNewBalance(e.target.value)} className="flex-1 p-2 border border-slate-200 rounded-lg text-sm" />
                      <button onClick={handleUpdateBalance} disabled={loading} className="px-4 py-2 bg-emerald-500 text-white font-bold text-sm rounded-lg">Enregistrer</button>
                    </div>
                  </div>

                  {/* Email individuel */}
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase mb-2">Envoyer un email</p>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {TEMPLATES.map(t => (
                        <button key={t.name} onClick={() => { setEmailSubject(t.subject); setEmailMessage(t.message) }} className="text-[10px] bg-slate-100 px-2 py-1 rounded">{t.name}</button>
                      ))}
                    </div>
                    <input type="text" placeholder="Sujet" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-sm mb-2" />
                    <textarea placeholder="Message..." rows={3} value={emailMessage} onChange={e => setEmailMessage(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-sm mb-2" />
                    <button onClick={handleSendEmail} disabled={loading || !emailSubject} className="w-full py-2 bg-sky-500 text-white font-bold text-sm rounded-lg disabled:opacity-50">Envoyer l'email</button>
                  </div>

                  {/* Actions critiques */}
                  <div className="flex gap-2 pt-4 border-t border-slate-100">
                    <button onClick={handleBlock} disabled={loading} className={`flex-1 py-2 font-bold text-sm rounded-lg ${user.is_blocked ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                      {user.is_blocked ? 'Débloquer' : 'Bloquer'}
                    </button>
                    <button onClick={handleDelete} disabled={loading} className="flex-1 py-2 bg-red-50 text-red-600 font-bold text-sm rounded-lg">Supprimer</button>
                  </div>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export function EmailForm({ users }: { users: any[] }) {
  const [selected, setSelected] = useState<string[]>([])
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const router = useRouter()

  const filtered = users.filter(u => u.email.toLowerCase().includes(search.toLowerCase()) || u.full_name?.toLowerCase().includes(search.toLowerCase()))

  const toggleUser = (email: string) => {
    setSelected(prev => prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email])
  }

  const toggleAll = () => {
    if (selected.length === filtered.length) setSelected([])
    else setSelected(filtered.map(u => u.email))
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selected.length === 0) return setToast('Sélectionnez au moins un utilisateur.')
    setLoading(true)
    try {
      const res = await fetch('/api/admin/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails: selected, subject, message })
      })
      const data = await res.json()
      if (res.ok) {
        setToast(`${data.count} email(s) envoyé(s) !`)
        setSelected([]); setSubject(''); setMessage('');
        router.refresh()
      } else { setToast('Erreur: ' + data.error) }
    } catch (err) { setToast('Erreur réseau') }
    setLoading(false)
    setTimeout(() => setToast(null), 4000)
  }

  return (
    <form onSubmit={handleSend} className="bg-white rounded-2xl p-4 text-slate-900 shadow-md">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-slate-200 rounded-xl overflow-hidden flex flex-col h-72">
          <div className="p-2 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <input type="text" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1 p-1.5 text-xs border border-slate-200 rounded" />
            <button type="button" onClick={toggleAll} className="px-2 py-1.5 bg-slate-200 text-slate-700 text-[10px] font-bold rounded">Tout</button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filtered.map(u => (
              <label key={u.id} className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded cursor-pointer">
                <input type="checkbox" checked={selected.includes(u.email)} onChange={() => toggleUser(u.email)} className="w-4 h-4 accent-sky-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate">{u.full_name || 'Inconnu'}</p>
                  <p className="text-[10px] text-slate-500 truncate">{u.email}</p>
                </div>
              </label>
            ))}
          </div>
          <div className="p-2 border-t border-slate-100 bg-slate-50 text-[10px] font-bold text-sky-600 text-center">{selected.length} sélectionné(s)</div>
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap gap-1">
            {TEMPLATES.map(t => (
              <button key={t.name} type="button" onClick={() => { setSubject(t.subject); setMessage(t.message) }} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded">{t.name}</button>
            ))}
          </div>
          <input type="text" required placeholder="Sujet" value={subject} onChange={e => setSubject(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-sm" />
          <textarea required rows={5} placeholder="Message..." value={message} onChange={e => setMessage(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-sm resize-none" />
          {toast && <div className={`text-xs font-medium ${toast.includes('Erreur') ? 'text-red-500' : 'text-emerald-500'}`}>{toast}</div>}
          <button type="submit" disabled={loading || selected.length === 0} className="w-full py-2 bg-sky-500 text-white font-bold rounded-lg text-sm disabled:opacity-50">
            {loading ? 'Envoi...' : `Envoyer à ${selected.length} personne(s)`}
          </button>
        </div>
      </div>
    </form>
  )
}


export function TaskAdminSection() {
  const [tasks, setTasks] = useState<any[]>([])
  const [submissions, setSubmissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: t } = await supabase.from('tasks').select('*').order('created_at', { ascending: false })
      const { data: s } = await supabase.from('task_submissions').select('*').eq('status', 'pending')
      setTasks(t || [])
      setSubmissions(s || [])
      setLoading(false)
    }
    load()
  }, [supabase])

  const handleValidate = async (submissionId: string, userId: string, task: any) => {
    setLoading(true)

    let amountToCredit = 0

    // Calcul du montant selon le type de tâche
    if (task.type === 'diffusion_duration') {
      // Pour les diffusions : nombre de vues (défini par l'admin) * gain par vue
      // On va demander à l'admin de saisir le nombre de vues
      const viewsStr = prompt('Combien de vues vérifiées pour cette tâche ?', '1000')
      const views = parseInt(viewsStr || '0')
      if (views <= 0) {
        setLoading(false)
        return
      }
      amountToCredit = views * (task.gain_per_view || 0)
      
      // Mettre à jour la soumission avec le nombre de vues (si la colonne existe)
      await supabase.from('task_submissions').update({ 
        status: 'approved',
        views_count: views 
      }).eq('id', submissionId)
    } else {
      // Pour les tâches simples : gain fixe
      amountToCredit = task.reward || 0
      await supabase.from('task_submissions').update({ status: 'approved' }).eq('id', submissionId)
    }

    // Créditer le solde
    const { data: profile } = await supabase.from('profiles').select('balance').eq('id', userId).single()
    if (profile) {
      await supabase.from('profiles').update({ balance: (profile.balance || 0) + amountToCredit }).eq('id', userId)
    }

    // Notification
    await supabase.from('notifications').insert({
      user_id: userId,
      title: 'Tâche validée ✅',
      message: `Ta tâche a été validée. Tu as gagné ${amountToCredit.toFixed(2)} FCFA.`,
      link: '/dashboard/taches'
    })

    setToast(`Tâche validée ! ${amountToCredit.toFixed(2)} FCFA crédités.`)
    setLoading(false)
    setTimeout(() => { setToast(null); router.refresh() }, 2000)
  }

  const handleReject = async (submissionId: string) => {
    await supabase.from('task_submissions').update({ status: 'rejected' }).eq('id', submissionId)
    setToast('Tâche rejetée.')
    router.refresh()
  }

  if (loading) return <div className="text-center py-4 text-slate-500">Chargement...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-slate-900">Tâches à valider ({submissions.length})</h2>
        <Link href="/dashboard/admin/taches" className="px-4 py-2 bg-sky-500 text-white text-sm font-bold rounded-xl hover:bg-sky-400">Gérer les tâches</Link>
      </div>

      {submissions.length === 0 ? (
        <div className="bg-white border border-slate-200 p-6 rounded-2xl text-center text-slate-500 text-sm">Aucune tâche à valider.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {submissions.map((s: any) => {
            const task = tasks.find(t => t.id === s.task_id)
            return (
              <div key={s.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <h3 className="font-bold text-slate-900 text-sm">{task.title}</h3>
                <p className="text-xs text-slate-500 mb-3">{task.type === 'diffusion_duration' ? `Gain : ${task.gain_per_view} F / vue` : `Gain : ${task.reward} FCFA`}</p>
                {s.proof_screenshot_url && (
                  <div className="mb-3">
                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Capture d'écran</p>
                    <a href={s.proof_screenshot_url} target="_blank" rel="noopener noreferrer">
                      <img src={s.proof_screenshot_url} className="w-full max-h-40 object-cover rounded-lg border border-slate-200" />
                    </a>
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={() => handleValidate(s.id, s.user_id, task)} className="flex-1 py-2 bg-emerald-500 text-white font-bold text-sm rounded-lg">Valider</button>
                  <button onClick={() => handleReject(s.id)} className="flex-1 py-2 bg-red-50 text-red-600 font-bold text-sm rounded-lg border border-red-200">Rejeter</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}


export function WithdrawalAdminSection() {
  const [withdrawals, setWithdrawals] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: w } = await supabase.from('withdrawals').select('*').eq('status', 'pending').order('created_at', { ascending: true })
      setWithdrawals(w || [])
      
      const { data: u } = await supabase.from('profiles').select('*')
      setUsers(u || [])
      
      setLoading(false)
    }
    load()
  }, [supabase])

  const getUser = (id: string) => users.find(u => u.id === id)

  const handlePay = async (withdrawal: any) => {
    setLoading(true)

    // 1. Mettre à jour le statut
    await supabase.from('withdrawals').update({ status: 'paid' }).eq('id', withdrawal.id)

    // 2. Notification à l'utilisateur
    const { error: notifError } = await supabase.from('notifications').insert({
      user_id: withdrawal.user_id,
      title: 'Retrait payé ! 🎉',
      message: `Tes ${withdrawal.net_amount} FCFA ont été envoyés sur ton compte ${withdrawal.operator} (${withdrawal.phone_number}).`,
      link: '/dashboard/historique'
    })
    
    if (notifError) {
      console.error('Erreur notification:', notifError)
    }

    setToast('Retrait marqué comme payé !')
    setLoading(false)
    setTimeout(() => { setToast(null); router.refresh() }, 2000)
  }

  const handleReject = async (withdrawal: any) => {
    setLoading(true)

    // 1. Rembourser le solde
    const user = getUser(withdrawal.user_id)
    if (user) {
      await supabase.from('profiles').update({ balance: (user.balance || 0) + withdrawal.amount }).eq('id', user.id)
    }

    // 2. Mettre à jour le statut
    await supabase.from('withdrawals').update({ status: 'rejected' }).eq('id', withdrawal.id)

    // 3. Notification
    await supabase.from('notifications').insert({
      user_id: withdrawal.user_id,
      title: 'Retrait rejeté ❌',
      message: `Ta demande de retrait de ${withdrawal.amount} FCFA a été rejetée. Le montant a été remboursé sur ton solde.`,
      link: '/dashboard/historique'
    })

    setToast('Retrait rejeté et solde remboursé.')
    setLoading(false)
    setTimeout(() => { setToast(null); router.refresh() }, 2000)
  }

  if (loading) return <div className="text-center py-4 text-slate-500">Chargement...</div>

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-900 mb-4">Retraits en attente ({withdrawals.length})</h2>
      {toast && <div className="bg-slate-900 text-white p-2 rounded-xl text-center text-sm font-bold mb-3">{toast}</div>}
      
      {withdrawals.length === 0 ? (
        <div className="bg-white border border-slate-200 p-6 rounded-2xl text-center text-slate-500 text-sm">Aucun retrait en attente.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {withdrawals.map((w: any) => {
            const user = getUser(w.user_id)
            return (
              <div key={w.id} className="bg-white border-2 border-sky-200 rounded-2xl p-4 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{user?.full_name || 'Inconnu'}</h3>
                    <p className="text-xs text-slate-500">{user?.email}</p>
                  </div>
                  <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-1 rounded">EN ATTENTE</span>
                </div>
                
                <div className="bg-slate-50 p-3 rounded-lg text-xs space-y-1 my-3">
                  <p><span className="text-slate-500">Montant :</span> <strong>{w.amount} FCFA</strong></p>
                  <p><span className="text-slate-500">Frais (5%) :</span> <strong>{w.fee} FCFA</strong></p>
                  <p><span className="text-slate-500">Net à envoyer :</span> <strong className="text-emerald-600">{w.net_amount} FCFA</strong></p>
                  <p><span className="text-slate-500">Pays :</span> <strong>{w.country}</strong></p>
                  <p><span className="text-slate-500">Opérateur :</span> <strong>{w.operator}</strong></p>
                  <p><span className="text-slate-500">Téléphone :</span> <strong>{w.phone_number}</strong></p>
                  <p><span className="text-slate-500">Nom :</span> <strong>{w.full_name}</strong></p>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => handlePay(w)} className="flex-1 py-2 bg-emerald-500 text-white font-bold text-sm rounded-lg">Marquer Payé</button>
                  <button onClick={() => handleReject(w)} className="flex-1 py-2 bg-red-50 text-red-600 border border-red-200 font-bold text-sm rounded-lg">Rejeter</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
