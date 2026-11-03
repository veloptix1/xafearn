'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function WelcomeCampaignPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  
  const [campaignId, setCampaignId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [whatsapp, setWhatsapp] = useState('')

  useEffect(() => {
    async function loadWelcome() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')

      // Vérifier admin
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (profile?.role !== 'admin') return router.push('/dashboard')

      // Charger l'annonce de bienvenue existante
      const { data: welcome } = await supabase
        .from('campaigns')
        .select('*')
        .eq('is_welcome_campaign', true)
        .single()

      if (welcome) {
        setCampaignId(welcome.id)
        setTitle(welcome.title)
        setDescription(welcome.description)
        setImageUrl(welcome.image_url || '')
        setWhatsapp(welcome.whatsapp_number)
      }
      setLoading(false)
    }
    loadWelcome()
  }, [router, supabase])

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const campaignData = {
      user_id: user.id,
      title,
      description,
      image_url: imageUrl,
      whatsapp_number: whatsapp,
      price: 0,
      views_purchased: 1000,
      budget: 0,
      duration_days: 365,
      status: 'active',
      is_welcome_campaign: true,
      target_country: 'CM',
      target_city: 'Toutes'
    }

    let error
    if (campaignId) {
      // Mise à jour
      const { error: updateError } = await supabase.from('campaigns').update(campaignData).eq('id', campaignId)
      error = updateError
    } else {
      // Création
      const { error: insertError } = await supabase.from('campaigns').insert(campaignData)
      error = insertError
    }

    if (error) {
      showToast('Erreur : ' + error.message)
    } else {
      showToast('Annonce test sauvegardée !')
      router.refresh()
    }
    setSaving(false)
  }

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">Chargement...</div>

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex items-center gap-4">
        <Link href="/dashboard/admin" className="text-slate-500 hover:text-slate-900">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-lg font-bold text-slate-900">Annonce de bienvenue</h1>
      </header>

      <div className="p-4 md:p-8 max-w-2xl mx-auto mt-4">
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl mb-6">
          <p className="text-sm text-amber-800">
            <strong>Cette annonce est affichée en priorité à tous les nouveaux utilisateurs en mode test.</strong> Modifiez-la quand vous voulez.
          </p>
        </div>

        <form onSubmit={handleSave} className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Titre</label>
            <input type="text" required value={title} onChange={e => setTitle(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900" />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea required rows={3} value={description} onChange={e => setDescription(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900 resize-none" />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">URL de l'image</label>
            <input type="url" required value={imageUrl} onChange={e => setImageUrl(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900" placeholder="https://..." />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Numéro WhatsApp de contact (Système)</label>
            <input type="tel" required value={whatsapp} onChange={e => setWhatsapp(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900" />
          </div>

          {toastMessage && <div className="text-emerald-600 text-sm font-medium text-center">{toastMessage}</div>}

          <button type="submit" disabled={saving} className="w-full py-3 bg-sky-500 text-white font-bold rounded-xl hover:bg-sky-400 transition shadow-sm">
            {saving ? 'Sauvegarde...' : 'Sauvegarder l\'annonce'}
          </button>
        </form>
      </div>
    </main>
  )
}
