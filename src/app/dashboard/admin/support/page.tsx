'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Toast from '@/components/Toast'

export default function AdminSupportPage() {
  const supabase = createClient()
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [tickets, setTickets] = useState<any[]>([])
  const [filter, setFilter] = useState('all')
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null)
  const [activeTicket, setActiveTicket] = useState<any>(null)
  const [replyText, setReplyText] = useState('')
  const [newStatus, setNewStatus] = useState('open')
  const [saving, setSaving] = useState(false)

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => setToast({ message: msg, type })

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.replace('/login')

      const { data: prof } = await supabase.from('profiles').select('role, is_admin').eq('id', user.id).single()
      if (!prof || (prof.role !== 'admin' && !prof.is_admin)) return router.replace('/dashboard')
      setIsAdmin(true)

      await loadTickets()
      setLoading(false)
    }
    init()
  }, [supabase, router])

  async function loadTickets() {
    const { data } = await supabase.from('support_tickets')
      .select('*, profiles:user_id(full_name, email)')
      .order('created_at', { ascending: false })
    setTickets(data || [])
  }

  const openTicket = (ticket: any) => {
    setActiveTicket(ticket)
    setReplyText(ticket.admin_reply || '')
    setNewStatus(ticket.status)
  }

  const handleSave = async () => {
    if (!activeTicket) return
    setSaving(true)
    try {
      const { error } = await supabase.from('support_tickets').update({
        admin_reply: replyText,
        status: newStatus,
        updated_at: new Date().toISOString()
      }).eq('id', activeTicket.id)

      if (error) throw error

      // Ajouter une notification pour l'utilisateur
      await supabase.from('notifications').insert({
        user_id: activeTicket.user_id,
        title: 'Réponse à ton ticket 📩',
        message: `Ton ticket "${activeTicket.subject}" a été mis à jour (${newStatus}).`,
        link: '/dashboard/profil/support'
      })

      showToast('Ticket mis à jour !', 'success')
      setActiveTicket(null)
      await loadTickets()
    } catch (err: any) {
      showToast('Erreur: ' + err.message, 'error')
    }
    setSaving(false)
  }

  const filteredTickets = filter === 'all' ? tickets : tickets.filter(t => t.status === filter)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open': return <span className="text-[10px] font-bold bg-sky-100 text-sky-700 px-2 py-1 rounded-md">Ouvert</span>
      case 'in_progress': return <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded-md">En cours</span>
      case 'resolved': return <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md">Résolu</span>
      case 'closed': return <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-md">Fermé</span>
      default: return null
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>
  if (!isAdmin) return null

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex items-center gap-4">
        <Link href="/dashboard/admin" className="text-slate-500 hover:text-slate-900 bg-slate-100 p-2 rounded-full transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Support Client</h1>
          <p className="text-xs text-slate-500">{tickets.length} tickets au total</p>
        </div>
      </header>

      <div className="p-4 md:p-8 max-w-4xl mx-auto mt-4 space-y-4">
        
        {/* Filtres */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {['all', 'open', 'in_progress', 'resolved', 'closed'].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${filter === f ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
              {f === 'all' ? 'Tous' : f === 'open' ? 'Ouverts' : f === 'in_progress' ? 'En cours' : f === 'resolved' ? 'Résolus' : 'Fermés'}
            </button>
          ))}
        </div>

        {filteredTickets.length === 0 ? (
          <div className="bg-white p-8 rounded-3xl text-center text-slate-500 border border-slate-200">
            Aucun ticket dans cette catégorie.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTickets.map(t => (
              <div key={t.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col gap-2">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{t.subject}</h3>
                    <p className="text-[10px] text-slate-500">{t.profiles?.full_name} ({t.profiles?.email}) • {new Date(t.created_at).toLocaleDateString('fr-FR')}</p>
                  </div>
                  {getStatusBadge(t.status)}
                </div>
                <p className="text-xs text-slate-600 line-clamp-2">{t.message}</p>
                <button onClick={() => openTicket(t)} className="self-end mt-1 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg active:scale-95 transition">
                  Répondre
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de réponse */}
      {activeTicket && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="font-bold text-lg text-slate-900">{activeTicket.subject}</h2>
                <p className="text-xs text-slate-500">{activeTicket.profiles?.full_name}</p>
              </div>
              <button onClick={() => setActiveTicket(null)} className="p-2 bg-slate-100 rounded-full text-slate-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl mb-4">
              <p className="text-xs text-slate-700 leading-relaxed">{activeTicket.message}</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Statut</label>
                <select value={newStatus} onChange={e => setNewStatus(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none">
                  <option value="open">Ouvert</option>
                  <option value="in_progress">En cours</option>
                  <option value="resolved">Résolu</option>
                  <option value="closed">Fermé</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Réponse (visible par l'utilisateur)</label>
                <textarea rows={4} value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Écris ta réponse..." className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none resize-none" />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setActiveTicket(null)} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl active:bg-slate-200 transition">Annuler</button>
                <button onClick={handleSave} disabled={saving} className="flex-1 py-3 bg-sky-500 text-white font-bold rounded-xl shadow-md disabled:opacity-50 active:scale-[0.98] transition">
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
