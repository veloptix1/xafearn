'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function WelcomeCampaignPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  
  const [campaignId, setCampaignId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [whatsapp, setWhatsapp] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Vérifier si admin (role ou is_admin)
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!profile || (profile.role !== 'admin' && !profile.is_admin)) {
        router.push('/dashboard')
        return
      }

      // Charger l'annonce test existante
      const { data: welcome } = await supabase
        .from('campaigns')
        .select('*')
        .eq('is_welcome_campaign', true)
        .maybeSingle()

      if (welcome) {
        setCampaignId(welcome.id)
        setTitle(welcome.title || '')
        setDescription(welcome.description || '')
        setImageUrl(welcome.image_url || '')
        setWhatsapp(welcome.whatsapp_number || '')
      }
      setLoading(false)
    }
    load()
  }, [router, supabase])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    
    const fileName = `welcome-${Date.now()}.jpg`
    const { error } = await supabase.storage.from('campaign-images').upload(fileName, file)
    
    if (error) {
      showToast('Erreur upload')
    } else {
      const { data } = supabase.storage.from('campaign-images').getPublicUrl(fileName)
      setImageUrl(data.publicUrl)
      showToast('Image uploadée !')
    }
    setUploading(false)
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
      duration_days: 1, // 1 jour comme demandé
      status: 'active',
      is_welcome_campaign: true,
      target_country: 'CM',
      target_city: 'Toutes'
    }

    let error
    if (campaignId) {
      const { error: updateError } = await supabase.from('campaigns').update(campaignData).eq('id', campaignId)
      error = updateError
    } else {
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
        <Link href="/dashboard/admin" className="text-slate-500 hover:text-slate-900 bg-slate-100 p-2 rounded-full">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-lg font-bold text-slate-900">Annonce de bienvenue</h1>
      </header>

      <div className="p-4 md:p-8 max-w-2xl mx-auto mt-4">
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl mb-6">
          <p className="text-sm text-amber-800">
            <strong>Cette annonce est affichée en priorité aux nouveaux utilisateurs.</strong> Elle ne rapporte pas d'argent mais débloque les campagnes payantes.
          </p>
        </div>

        <form onSubmit={handleSave} className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-4">
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Image de l'annonce</label>
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:bg-slate-50 transition relative">
              <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              {imageUrl ? (
                <div>
                  <img src={imageUrl} alt="Aperçu" className="max-h-40 mx-auto rounded-lg object-contain mb-2" />
                  <p className="text-xs text-emerald-600 font-medium">Image prête</p>
                </div>
              ) : (
                <div>
                  <svg className="w-8 h-8 text-slate-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <p className="text-sm text-slate-500 font-medium">Cliquez pour uploader</p>
                </div>
              )}
            </div>
            {uploading && <p className="text-sm text-sky-500 mt-2">Upload en cours...</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Titre</label>
            <input type="text" required value={title} onChange={e => setTitle(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900" />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea required rows={3} value={description} onChange={e => setDescription(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900 resize-none" />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Numéro WhatsApp de contact</label>
            <input type="tel" required value={whatsapp} onChange={e => setWhatsapp(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900" />
          </div>

          {toast && <div className="text-emerald-600 text-sm font-medium text-center">{toast}</div>}

          <button type="submit" disabled={saving || uploading} className="w-full py-3 bg-sky-500 text-white font-bold rounded-xl hover:bg-sky-400 transition shadow-sm">
            {saving ? 'Sauvegarde...' : 'Sauvegarder l\'annonce'}
          </button>
        </form>
      </div>
    </main>
  )
}
