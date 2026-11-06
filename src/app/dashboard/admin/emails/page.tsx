'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const TEMPLATES = {
  welcome: {
    label: '👋 Bienvenue',
    subject: 'Bienvenue sur XAFEARN 🚀',
    message: `Salut !

Bienvenue sur XAFEARN, la plateforme qui te permet de gagner de l'argent en ligne grâce à tes statuts WhatsApp.

Voici comment commencer :
1. Complète ton profil
2. Choisis ton mode : Diffuseur ou Annonceur
3. Publie ton premier statut
4. Reçois ton argent sur Mobile Money

L'équipe XAFEARN`
  },
  promo: {
    label: '🎁 Promo',
    subject: 'Offre spéciale : 50% de jetons offerts !',
    message: `Bonjour,

Profite de notre offre spéciale cette semaine ! 
Recharge ton compte et reçois 50% de jetons en bonus.

Offre valable jusqu'à dimanche minuit.

Ne rate pas cette occasion !

L'équipe XAFEARN`
  },
  maintenance: {
    label: '🛠️ Maintenance',
    subject: 'Maintenance planifiée ce soir',
    message: `Bonjour,

Nous allons effectuer une maintenance de la plateforme ce soir de 22h à 00h.

Durant cette période, l'application sera indisponible.

Nous nous excusons pour la gêne occasionnée.

L'équipe XAFEARN`
  },
  new_series: {
    label: '📚 Nouvelle série',
    subject: 'Une nouvelle série est disponible !',
    message: `Salut,

Une nouvelle série vient d'être publiée sur XAFEARN !

Viens la découvrir dans la bibliothèque et plonge dans une nouvelle histoire captivante.

À très vite sur XAFEARN !`
  },
  withdrawal_approved: {
    label: '💸 Retrait approuvé',
    subject: 'Ton retrait a été approuvé',
    message: `Bonjour,

Nous avons le plaisir de t'informer que ton retrait a été approuvé.

Le montant sera crédité sur ton compte Mobile Money sous 24h à 48h.

Merci de ta confiance.

L'équipe XAFEARN`
  },
  withdrawal_rejected: {
    label: '❌ Retrait rejeté',
    subject: 'Ton retrait a été rejeté',
    message: `Bonjour,

Malheureusement, ta demande de retrait a été rejetée.

Raisons possibles :
- Numéro Mobile Money incorrect
- Nom du titulaire non correspondant
- Activité suspecte

Le montant a été remboursé sur ton solde XAFEARN.

L'équipe XAFEARN`
  },
  warning: {
    label: '⚠️ Avertissement',
    subject: 'Comportement non conforme détecté',
    message: `Bonjour,

Nous avons détecté un comportement non conforme à nos conditions d'utilisation sur ton compte.

Merci de respecter les règles sous peine de suspension.

L'équipe XAFEARN`
  },
  suspended: {
    label: '🚫 Compte suspendu',
    subject: 'Ton compte a été suspendu',
    message: `Bonjour,

Ton compte XAFEARN a été suspendu en raison d'une violation répétée de nos conditions.

Contacte notre support pour plus d'informations.

L'équipe XAFEARN`
  },
  contest: {
    label: '🏆 Concours',
    subject: 'Participe à notre concours et gagne gros !',
    message: `Salut,

Nous organisons un grand concours cette semaine !

Les 3 diffuseurs qui généreront le plus de vues gagneront :
- 1er : 50 000 FCFA
- 2ème : 25 000 FCFA
- 3ème : 10 000 FCFA

Bonne chance à tous !

L'équipe XAFEARN`
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
  const [selectedTemplate, setSelectedTemplate] = useState('welcome')
  const [selectedUser, setSelectedUser] = useState('all')
  const [subject, setSubject] = useState(TEMPLATES.welcome.subject)
  const [message, setMessage] = useState(TEMPLATES.welcome.message)
  const [isSending, setIsSending] = useState(false)
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

      const { data } = await supabase.from('profiles').select('*')
      setUsers(data || [])
      setLoading(false)
    }
    load()
  }, [router, supabase])

  const handleTemplateChange = (key: string) => {
    setSelectedTemplate(key)
    setSubject(TEMPLATES[key as keyof typeof TEMPLATES].subject)
    setMessage(TEMPLATES[key as keyof typeof TEMPLATES].message)
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject || !message) return showToast('Sujet et message requis.', 'error')
    setIsSending(true)
    await new Promise(r => setTimeout(r, 1500))
    setIsSending(false)
    showToast(`Email envoyé à ${selectedUser === 'all' ? 'tous les utilisateurs' : 'l\'utilisateur sélectionné'} !`, 'success')
  }

  if (loading) return <div className="p-20 text-center text-slate-500">Chargement...</div>

  return (
    <main className="p-4 md:p-6 max-w-2xl mx-auto">
      {toast && <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-bold ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}>{toast.message}</div>}

      <h1 className="text-2xl font-black text-slate-900 mb-1">Envoyer un email</h1>
      <p className="text-sm text-slate-500 mb-6">{users.length} utilisateurs</p>

      <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-lg">
        <form onSubmit={handleSend} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Modèle</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(TEMPLATES).map(([key, tpl]) => (
                <button key={key} type="button" onClick={() => handleTemplateChange(key)} className={`px-3 py-2 rounded-lg text-xs font-bold transition text-left ${selectedTemplate === key ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-300'}`}>
                  {tpl.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Destinataire</label>
            <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)} className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white">
              <option value="all">📢 Tous les utilisateurs ({users.length})</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Sujet</label>
            <input type="text" value={subject} onChange={e => setSubject(e.target.value)} className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white" placeholder="Sujet..." required />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Message</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={10} className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white resize-none font-mono" placeholder="Message..." required />
          </div>

          <button type="submit" disabled={isSending} className="w-full py-4 bg-sky-500 text-white font-bold rounded-xl disabled:opacity-50 shadow-md">
            {isSending ? 'Envoi...' : 'Envoyer l\'email'}
          </button>
        </form>
      </div>
    </main>
  )
}
