'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const TEMPLATES = [
  {
    name: 'Nouvelle campagne',
    subject: 'Nouvelle campagne disponible sur XAFERAN',
    message: "Bonjour,\n\nUne nouvelle campagne est disponible dans votre catalogue. Connectez-vous dès maintenant pour la découvrir et commencer à gagner.\n\nL'équipe XAFERAN"
  },
  {
    name: 'Rappel de vérification',
    subject: 'Rappel : Vérifiez votre annonce',
    message: "Bonjour,\n\nVous avez publié une annonce il y a quelques jours. N'oubliez pas de vérifier votre statut pour valider vos gains.\n\nL'équipe XAFERAN"
  },
  {
    name: 'Mise à jour importante',
    subject: 'Information importante concernant XAFERAN',
    message: "Bonjour,\n\nNous avons le plaisir de vous annoncer de nouvelles fonctionnalités sur la plateforme. Découvrez-les dès maintenant.\n\nL'équipe XAFERAN"
  },
  {
    name: 'Relance inactifs',
    subject: 'Vous nous manquez sur XAFERAN',
    message: "Bonjour,\n\nCela fait un moment que vous ne vous êtes pas connecté. De nouvelles campagnes vous attendent. Revenez vite pour ne pas manquer de gains.\n\nL'équipe XAFERAN"
  }
]

export function SendSingleEmail({ email, name }: { email: string, name: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const router = useRouter()

  const handleTemplate = (tpl: any) => {
    setSubject(tpl.subject)
    setMessage(tpl.message)
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/admin/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails: [email], subject, message })
      })
      const data = await res.json()
      if (res.ok) {
        setToast('Email envoyé !')
        setTimeout(() => { setIsOpen(false); setToast(null); router.refresh() }, 1500)
      } else {
        setToast('Erreur: ' + data.error)
      }
    } catch (err) {
      setToast('Erreur réseau')
    }
    setLoading(false)
  }

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="px-2 py-1 bg-sky-100 text-sky-700 text-xs font-bold rounded hover:bg-sky-200">Email</button>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden p-6">
            <h3 className="font-bold text-lg mb-1">Envoyer un email</h3>
            <p className="text-xs text-slate-500 mb-4">À : {name} ({email})</p>
            
            <div className="flex flex-wrap gap-1 mb-3">
              {TEMPLATES.map(t => (
                <button key={t.name} onClick={() => handleTemplate(t)} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded hover:bg-slate-200">{t.name}</button>
              ))}
            </div>

            <form onSubmit={handleSend} className="space-y-3">
              <input type="text" required placeholder="Sujet de l'email" value={subject} onChange={e => setSubject(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm" />
              <textarea required rows={5} placeholder="Votre message..." value={message} onChange={e => setMessage(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm resize-none" />
              {toast && <div className={`text-sm font-medium ${toast.includes('Erreur') ? 'text-red-500' : 'text-emerald-500'}`}>{toast}</div>}
              <div className="flex gap-2">
                <button type="button" onClick={() => setIsOpen(false)} className="flex-1 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg text-sm">Annuler</button>
                <button type="submit" disabled={loading} className="flex-1 py-2 bg-sky-500 text-white font-bold rounded-lg text-sm disabled:opacity-50">{loading ? 'Envoi...' : 'Envoyer'}</button>
              </div>
            </form>
          </div>
        </div>
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

  const handleTemplate = (tpl: any) => {
    setSubject(tpl.subject)
    setMessage(tpl.message)
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
        setToast(`${data.count} email(s) envoyé(s) avec succès !`)
        setSelected([])
        setSubject('')
        setMessage('')
        router.refresh()
      } else {
        setToast('Erreur: ' + data.error)
      }
    } catch (err) {
      setToast('Erreur réseau')
    }
    setLoading(false)
    setTimeout(() => setToast(null), 4000)
  }

  return (
    <form onSubmit={handleSend} className="bg-white rounded-2xl p-4 text-slate-900 shadow-md">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        <div className="border border-slate-200 rounded-xl overflow-hidden flex flex-col h-72">
          <div className="p-2 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <input type="text" placeholder="Rechercher un utilisateur..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1 p-1.5 text-xs border border-slate-200 rounded" />
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
          <div className="p-2 border-t border-slate-100 bg-slate-50 text-[10px] font-bold text-sky-600 text-center">
            {selected.length} sélectionné(s)
          </div>
        </div>

        <div className="space-y-2">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Modèles rapides :</p>
            <div className="flex flex-wrap gap-1">
              {TEMPLATES.map(t => (
                <button key={t.name} type="button" onClick={() => handleTemplate(t)} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded hover:bg-slate-200">{t.name}</button>
              ))}
            </div>
          </div>
          <input type="text" required placeholder="Sujet de l'email" value={subject} onChange={e => setSubject(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-sm" />
          <textarea required rows={5} placeholder="Écrivez votre message ici..." value={message} onChange={e => setMessage(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-sm resize-none" />
          {toast && <div className={`text-xs font-medium ${toast.includes('Erreur') ? 'text-red-500' : 'text-emerald-500'}`}>{toast}</div>}
          <button type="submit" disabled={loading || selected.length === 0} className="w-full py-2 bg-sky-500 text-white font-bold rounded-lg text-sm disabled:opacity-50">
            {loading ? 'Envoi en cours...' : `Envoyer à ${selected.length} personne(s)`}
          </button>
        </div>
      </div>
    </form>
  )
}
