'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const TEMPLATES = {
  welcome: {
    label: '👋 Bienvenue',
    subject: 'Bienvenue sur XAFEARN 🚀',
    message: `Salut !\n\nBienvenue sur XAFEARN, la plateforme qui te permet de gagner de l'argent en ligne grâce à tes statuts WhatsApp.\n\nVoici comment commencer :\n1. Complète ton profil\n2. Choisis ton mode : Diffuseur ou Annonceur\n3. Publie ton premier statut\n4. Reçois ton argent sur Mobile Money\n\nL'équipe XAFEARN`
  },
  promo: {
    label: '🎁 Promo',
    subject: 'Offre spéciale : 50% de jetons offerts !',
    message: `Bonjour,\n\nProfite de notre offre spéciale cette semaine !\n\nRecharge ton compte et reçois 50% de jetons en bonus.\n\nOffre valable jusqu'à dimanche minuit.\n\nNe rate pas cette occasion !\n\nL'équipe XAFEARN`
  },
  maintenance: {
    label: '🛠️ Maintenance',
    subject: 'Maintenance planifiée ce soir',
    message: `Bonjour,\n\nNous allons effectuer une maintenance de la plateforme ce soir de 22h à 00h.\n\nDurant cette période, l'application sera indisponible.\n\nNous nous excusons pour la gêne occasionnée.\n\nL'équipe XAFEARN`
  },
  withdrawal_approved: {
    label: '💸 Retrait approuvé',
    subject: 'Ton retrait a été approuvé',
    message: `Bonjour,\n\nNous avons le plaisir de t'informer que ton retrait a été approuvé.\n\nLe montant sera crédité sur ton compte Mobile Money sous 24h à 48h.\n\nMerci de ta confiance.\n\nL'équipe XAFEARN`
  },
  withdrawal_rejected: {
    label: '❌ Retrait rejeté',
    subject: 'Ton retrait a été rejeté',
    message: `Bonjour,\n\nMalheureusement, ta demande de retrait a été rejetée.\n\nRaisons possibles :\n- Numéro Mobile Money incorrect\n- Nom du titulaire non correspondant\n- Activité suspecte\n\nLe montant a été remboursé sur ton solde XAFEARN.\n\nL'équipe XAFEARN`
  },
  warning: {
    label: '⚠️ Avertissement',
    subject: 'Comportement non conforme détecté',
    message: `Bonjour,\n\nNous avons détecté un comportement non conforme à nos conditions d'utilisation sur ton compte.\n\nMerci de respecter les règles sous peine de suspension.\n\nL'équipe XAFEARN`
  },
  suspended: {
    label: '🚫 Compte suspendu',
    subject: 'Ton compte a été suspendu',
    message: `Bonjour,\n\nTon compte XAFEARN a été suspendu en raison d'une violation répétée de nos conditions.\n\nContacte notre support pour plus d'informations.\n\nL'équipe XAFEARN`
  },
  custom: {
    label: '✍️ Personnalisé',
    subject: '',
    message: ''
  }
}

export default function AdminEmailsPage() {
  const supabase = createClient()
  const router = useRouter()
  
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  
  const [selectedTemplate, setSelectedTemplate] = useState('welcome')
  const [selectedUser, setSelectedUser] = useState('all')
  const [subject, setSubject] = useState(TEMPLATES.welcome.subject)
  const [message, setMessage] = useState(TEMPLATES.welcome.message)
  
  const [isSending, setIsSending] = useState(false)
  const [result, setResult] = useState<{ sent: number, total: number, failed: number } | null>(null)
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null)
  const [history, setHistory] = useState<any[]>([])

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
      
      setIsAdmin(true)

      const { data } = await supabase.from('profiles').select('id, full_name, email').order('full_name')
      setUsers(data || [])
      setLoading(false)
    }
    load()
  }, [router, supabase])

  const handleTemplateChange = (key: string) => {
    setSelectedTemplate(key)
    setSubject(TEMPLATES[key as keyof typeof TEMPLATES].subject)
    setMessage(TEMPLATES[key as keyof typeof TEMPLATES].message)
    setResult(null)
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject || !message) return showToast('Sujet et message requis.', 'error')
    
    // Déterminer les destinataires
    let recipients: string[] = []
    if (selectedUser === 'all') {
      recipients = users.map(u => u.email).filter(Boolean)
    } else {
      const user = users.find(u => u.id === selectedUser)
      if (user?.email) recipients = [user.email]
    }

    if (recipients.length === 0) return showToast('Aucun destinataire valide.', 'error')
    if (recipients.length > 100) return showToast('Limite : 100 emails max par envoi.', 'error')

    if (!confirm(`Envoyer cet email à ${recipients.length} destinataire(s) ?\n\nCela peut prendre quelques minutes pour Gmail.`)) return

    setIsSending(true)
    setResult(null)

    try {
      // 🔒 Récupérer le token de session
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Session expirée')

      const res = await fetch('/api/admin/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ subject, message, recipients })
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Erreur lors de l\'envoi')

      setResult({ sent: data.sent, total: data.total, failed: data.failed })
      
      if (data.failed > 0) {
        showToast(`${data.sent}/${data.total} envoyés. ${data.failed} échec(s).`, 'error')
      } else {
        showToast(`✅ ${data.sent} emails envoyés avec succès !`, 'success')
      }

      // Ajouter à l'historique local
      setHistory(prev => [{
        date: new Date().toISOString(),
        subject,
        recipients: data.sent,
        failed: data.failed
      }, ...prev].slice(0, 10))

    } catch (err: any) {
      showToast('Erreur: ' + err.message, 'error')
    }
    setIsSending(false)
  }

  if (loading) return <div className="p-20 text-center text-slate-500">Chargement...</div>
  if (!isAdmin) return null

  return (
    <main className="p-4 md:p-6 max-w-3xl mx-auto pb-24">
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-bold ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}>
          {toast.message}
        </div>
      )}

      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/admin" className="text-slate-500 bg-slate-100 p-2 rounded-full">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <div>
          <h1 className="text-2xl font-black text-slate-900">Envoyer un email</h1>
          <p className="text-sm text-slate-500">{users.filter(u => u.email).length} destinataires disponibles</p>
        </div>
      </div>

      <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-lg mb-6">
        <form onSubmit={handleSend} className="space-y-4">
          
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Modèle rapide</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.entries(TEMPLATES).map(([key, tpl]) => (
                <button 
                  key={key} 
                  type="button" 
                  onClick={() => handleTemplateChange(key)} 
                  className={`px-3 py-2 rounded-lg text-xs font-bold transition text-left truncate ${selectedTemplate === key ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                >
                  {tpl.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Destinataire</label>
            <select 
              value={selectedUser} 
              onChange={e => setSelectedUser(e.target.value)} 
              className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white"
            >
              <option value="all">📢 Tous les utilisateurs ({users.filter(u => u.email).length})</option>
              {users.filter(u => u.email).map(u => (
                <option key={u.id} value={u.id}>{u.full_name || u.email} ({u.email})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Sujet</label>
            <input 
              type="text" 
              value={subject} 
              onChange={e => setSubject(e.target.value)} 
              className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white" 
              placeholder="Sujet..." 
              required 
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Message</label>
            <textarea 
              value={message} 
              onChange={e => setMessage(e.target.value)} 
              rows={10} 
              className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white resize-none font-mono" 
              placeholder="Message..." 
              required 
            />
            <p className="text-[10px] text-slate-500 mt-1">Le message sera envoyé dans un template XAFEARN automatiquement.</p>
          </div>

          {result && (
            <div className={`p-3 rounded-xl border ${result.failed > 0 ? 'bg-amber-900/30 border-amber-700' : 'bg-emerald-900/30 border-emerald-700'}`}>
              <p className={`text-xs font-bold ${result.failed > 0 ? 'text-amber-300' : 'text-emerald-300'}`}>
                {result.failed > 0 
                  ? `⚠️ ${result.sent}/${result.total} emails envoyés. ${result.failed} échec(s).`
                  : `✅ ${result.sent} emails envoyés avec succès !`
                }
              </p>
            </div>
          )}

          <button 
            type="submit" 
            disabled={isSending} 
            className="w-full py-4 bg-sky-500 text-white font-bold rounded-xl disabled:opacity-50 shadow-md active:scale-[0.98] transition flex items-center justify-center gap-2"
          >
            {isSending ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                Envoi en cours...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                Envoyer l'email
              </>
            )}
          </button>
        </form>
      </div>

      {history.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <h3 className="font-bold text-slate-700 text-sm mb-3">Historique (session actuelle)</h3>
          <div className="space-y-2">
            {history.map((h, i) => (
              <div key={i} className="flex justify-between items-center text-xs bg-slate-50 p-2.5 rounded-lg">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-900 truncate">{h.subject}</p>
                  <p className="text-[10px] text-slate-500">{new Date(h.date).toLocaleString('fr-FR')}</p>
                </div>
                <span className={`font-bold px-2 py-1 rounded-md ml-2 ${h.failed > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {h.recipients} envoyés
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  )
}
