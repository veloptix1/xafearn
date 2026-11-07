'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Toast from '@/components/Toast'

export default function WelcomeCampaignPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null)

  const [campaignId, setCampaignId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [whatsapp, setWhatsapp] = useState('')

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ message: msg, type })
  }

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return router.push('/login')

        // 🔒 Vérification stricte admin
        const { data: profile } = await supabase.from('profiles').select('role, is_admin').eq('id', user.id).single()
        if (!profile || (profile.role !== 'admin' && !profile.is_admin)) {
          return router.push('/dashboard')
        }
        setIsAdmin(true)

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
      } catch (err: any) {
        showToast('Erreur : ' + err.message, 'error')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [supabase, router])

  // 🖼️ Compression de l'image pour économiser la bande passante
  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = (event) => {
        const img = new Image()
        img.src = event.target?.result as string
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height
          const MAX_SIZE = 800
          
          if (width > height && width > MAX_SIZE) {
            height *= MAX_SIZE / width
            width = MAX_SIZE
          } else if (height > MAX_SIZE) {
            width *= MAX_SIZE / height
            height = MAX_SIZE
          }
          
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          ctx?.drawImage(img, 0, 0, width, height)
          canvas.toBlob((blob) => {
            if (blob) resolve(blob)
            else reject('Erreur de compression')
          }, 'image/jpeg', 0.8)
        }
      }
      reader.onerror = reject
    })
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    if (file.size > 5 * 1024 * 1024) {
      return showToast('L\'image ne doit pas dépasser 5 MB.', 'error')
    }
    
    if (!file.type.startsWith('image/')) {
      return showToast('Le fichier doit être une image.', 'error')
    }

    setUploading(true)
    try {
      const compressedBlob = await compressImage(file)
      const fileName = `welcome-${Date.now()}.jpg`
      
      const { error } = await supabase.storage.from('campaign-images').upload(fileName, compressedBlob, { contentType: 'image/jpeg' })
      
      if (error) throw error
      
      const { data } = supabase.storage.from('campaign-images').getPublicUrl(fileName)
      setImageUrl(data.publicUrl)
      showToast('Image uploadée avec succès !', 'success')
    } catch (err: any) {
      showToast('Erreur upload : ' + err.message, 'error')
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !description.trim() || !whatsapp.trim()) {
      return showToast('Tous les champs sont requis.', 'error')
    }
    if (!imageUrl) {
      return showToast('L\'image est requise.', 'error')
    }

    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Session expirée')

      const campaignData = {
        user_id: user.id,
        title: title.trim(),
        description: description.trim(),
        image_url: imageUrl,
        whatsapp_number: whatsapp.replace(/\D/g, ''),
        price: 0,
        views_purchased: 1000,
        budget: 0,
        duration_days: 1,
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

      if (error) throw error

      showToast('Annonce test sauvegardée avec succès !', 'success')
      router.refresh()
    } catch (err: any) {
      showToast('Erreur : ' + err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-medium">Chargement...</p>
      </div>
    )
  }

  if (!isAdmin) return null

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/admin" className="text-slate-500 hover:text-slate-900 bg-slate-100 p-2 rounded-full transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Annonce de bienvenue</h1>
            <p className="text-xs text-slate-500">Débloque les nouveaux utilisateurs</p>
          </div>
        </div>
        {campaignId && (
          <Link href="/dashboard/annonces" target="_blank" className="px-3 py-2 bg-sky-50 text-sky-600 border border-sky-200 rounded-lg text-xs font-bold hover:bg-sky-100 transition">
            Voir l'aperçu
          </Link>
        )}
      </header>

      <div className="p-4 md:p-8 max-w-2xl mx-auto mt-4">
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl mb-6">
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <h3 className="font-bold text-amber-900 text-sm">À quoi sert cette annonce ?</h3>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                Cette annonce est affichée en priorité aux nouveaux utilisateurs. Ils doivent la publier pour débloquer les campagnes payantes. Elle ne rapporte pas d'argent.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-5">
          
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Image de l'annonce</label>
            <div className="border-2 border-dashed border-slate-200 hover:border-sky-400 rounded-2xl p-6 text-center transition relative">
              <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={uploading} />
              {imageUrl ? (
                <div>
                  <img src={imageUrl} alt="Aperçu" className="max-h-48 mx-auto rounded-xl object-contain mb-3 shadow-sm" />
                  <p className="text-xs text-emerald-600 font-bold">Image prête</p>
                </div>
              ) : (
                <div>
                  <svg className="w-10 h-10 text-slate-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <p className="text-sm text-slate-500 font-medium">Clique pour uploader une image</p>
                  <p className="text-[10px] text-slate-400 mt-1">JPG, PNG • Max 5 Mo</p>
                </div>
              )}
            </div>
            {uploading && <p className="text-sm text-sky-500 mt-2 text-center font-medium">Upload en cours...</p>}
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Titre</label>
            <input 
              type="text" 
              required 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              placeholder="Ex: Apprends à créer des films avec l'IA"
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900" 
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Description</label>
            <textarea 
              required 
              rows={4} 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              placeholder="Décris brièvement l'offre..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900 resize-none" 
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Numéro WhatsApp de contact</label>
            <input 
              type="tel" 
              required 
              value={whatsapp} 
              onChange={e => setWhatsapp(e.target.value)} 
              placeholder="Ex: 690000000"
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900" 
            />
            <p className="text-[10px] text-slate-500 mt-1">L'indicatif du pays (ex: 237) sera ajouté automatiquement.</p>
          </div>

          <button 
            type="submit" 
            disabled={saving || uploading} 
            className="w-full py-4 bg-sky-500 text-white font-bold rounded-xl hover:bg-sky-400 transition shadow-md disabled:opacity-50 active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                Sauvegarde...
              </>
            ) : (
              'Sauvegarder l\'annonce'
            )}
          </button>
        </form>
      </div>
    </main>
  )
}
