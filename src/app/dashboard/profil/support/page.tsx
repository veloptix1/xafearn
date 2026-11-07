'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Toast from '@/components/Toast'

export default function SupportPage() {
  const supabase = createClient()
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [tickets, setTickets] = useState<any[]>([])
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null)
  
  // Formulaire
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [subject, setSubject] = useState('')
  const [category, setCategory] = useState('general')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => setToast({ message: msg, type })

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.replace('/login')

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)

      const { data: tks } = await supabase.from('support_tickets').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      setTickets(tks || [])

      setLoading(false)
    }
    init()
  }, [supabase, router])

  const submitTicket = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject.trim() || !message.trim()) return showToast('Remplis tous les champs.', 'warning')
    
    setSubmitting(true)
    try {
      const { data, error } = await supabase.from('support_tickets').insert({
        user_id: profile.id,
        subject: subject.trim(),
        message: message.trim(),
        category,
        status: 'open'
      }).select().single()

      if (error) throw error

      setTickets([data, ...tickets])
      showToast('Ticket envoyé avec succès !', 'success')
      setIsFormOpen(false)
      setSubject('')
      setMessage('')
      setCategory('general')
    } catch (err: any) {
      showToast('Erreur: ' + err.message, 'error')
    }
    setSubmitting(false)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open': return <span className="text-[10px] font-bold bg-sky-100 text-sky-700 px-2 py-1 rounded-md">Ouvert</span>
      case 'in_progress': return <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded-md">En cours</span>
      case 'resolved': return <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md">Résolu</span>
      case 'closed': return <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-md">Fermé</span>
      default: return null
    }
  }

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'paiement': return '💳 Paiement / Retrait'
      case 'tache': return '📋 Problème de tâche'
      case 'bug': return '🐛 Bug technique'
      case 'autre': return '📌 Autre'
      default: return '💬 Général'
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex items-center gap-4">
        <Link href="/dashboard/profil" className="text-slate-500 hover:text-slate-900 bg-slate-100 p-2 rounded-full transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-lg font-bold text-slate-900">Support & Aide</h1>
      </header>

      <div className="p-4 md:p-8 max-w-2xl mx-auto mt-4 space-y-4">
        
        {/* Bannière d'aide */}
        <div className="bg-gradient-to-br from-sky-500 to-blue-600 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-10 -translate-y-10"></div>
          <div className="relative z-10">
            <h2 className="text-xl font-black mb-1">Besoin d'aide ?</h2>
            <p className="text-sky-100 text-xs mb-4">Notre équipe te répond généralement sous 24h.</p>
            <button onClick={() => setIsFormOpen(true)} className="inline-block bg-white text-sky-600 font-bold text-sm px-5 py-2.5 rounded-xl shadow-md active:scale-95 transition">
              + Créer un ticket
            </button>
          </div>
        </div>

        {/* Liste des tickets */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
            <h3 className="font-bold text-slate-700 text-sm">Mes tickets ({tickets.length})</h3>
          </div>

          {tickets.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
              <p className="text-sm">Aucun ticket pour le moment.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {tickets.map(ticket => (
                <div key={ticket.id} className="p-4">
                  <div className="flex justify-between items-start gap-2 mb-1">
                    <h4 className="font-bold text-slate-900 text-sm">{ticket.subject}</h4>
                    {getStatusBadge(ticket.status)}
                  </div>
                  <p className="text-[10px] text-slate-500 mb-2">{getCategoryLabel(ticket.category)} • {new Date(ticket.created_at).toLocaleDateString('fr-FR')}</p>
                  
                  <div className="bg-slate-50 p-3 rounded-xl mb-2">
                    <p className="text-xs text-slate-700 leading-relaxed">{ticket.message}</p>
                  </div>

                  {ticket.admin_reply && (
                    <div className="bg-sky-50 border border-sky-100 p-3 rounded-xl mt-2">
                      <p className="text-[10px] font-bold text-sky-600 mb-1">Réponse de l'équipe :</p>
                      <p className="text-xs text-sky-800 leading-relaxed">{ticket.admin_reply}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal de création de ticket */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6">
            <h2 className="font-bold text-lg mb-4 text-slate-900">Nouveau ticket</h2>
            <form onSubmit={submitTicket} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Sujet</label>
                <input type="text" required value={subject} onChange={e => setSubject(e.target.value)} placeholder="Ex: Problème de retrait" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-sky-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Catégorie</label>
                <select value={category} onChange={e => setCategory(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-sky-500 outline-none">
                  <option value="general">💬 Général</option>
                  <option value="paiement">💳 Paiement / Retrait</option>
                  <option value="tache">📋 Problème de tâche</option>
                  <option value="bug">🐛 Bug technique</option>
                  <option value="autre">📌 Autre</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Message</label>
                <textarea required rows={4} value={message} onChange={e => setMessage(e.target.value)} placeholder="Décris ton problème en détail..." className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-sky-500 outline-none resize-none" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsFormOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl active:bg-slate-200 transition">Annuler</button>
                <button type="submit" disabled={submitting} className="flex-1 py-3 bg-sky-500 text-white font-bold rounded-xl shadow-md disabled:opacity-50 active:scale-[0.98] transition">
                  {submitting ? 'Envoi...' : 'Envoyer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
