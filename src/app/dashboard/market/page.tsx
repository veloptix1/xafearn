'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Toast from '@/components/Toast'

export default function MarketPage() {
  const supabase = createClient()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [isSellOpen, setIsSellOpen] = useState(false)
  const [sellStep, setSellStep] = useState<'choice' | 'form'>('choice')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null)
  
  // Formulaire de vente
  const [formData, setFormData] = useState({
    name: '', description: '', category: 'site_web', price_fcfa: '', 
    contact_whatsapp: '', contact_telegram: '', demo_url: '', preview_image: ''
  })

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => setToast({ message: msg, type })

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)

      const { data: prods } = await supabase.from('digital_products').select('*, profiles:seller_id(full_name)').eq('is_active', true).eq('is_approved', true).order('created_at', { ascending: false })
      setProducts(prods || [])

      setLoading(false)
    }
    load()
  }, [supabase, router])

  // 🖼️ Compression d'image
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
          if (width > height && width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE }
          else if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE }
          canvas.width = width; canvas.height = height
          const ctx = canvas.getContext('2d')
          ctx?.drawImage(img, 0, 0, width, height)
          canvas.toBlob((blob) => { if (blob) resolve(blob); else reject('Erreur') }, 'image/jpeg', 0.8)
        }
      }
      reader.onerror = reject
    })
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) return showToast('Image max 5 Mo.', 'error')

    setIsUploading(true)
    try {
      const blob = await compressImage(file)
      const fileName = `market-${profile.id}-${Date.now()}.jpg`
      const { error } = await supabase.storage.from('campaign-images').upload(fileName, blob, { contentType: 'image/jpeg' })
      if (error) throw error
      const { data } = supabase.storage.from('campaign-images').getPublicUrl(fileName)
      setFormData({ ...formData, preview_image: data.publicUrl })
      showToast('Image uploadée !', 'success')
    } catch (err: any) {
      showToast('Erreur : ' + err.message, 'error')
    }
    setIsUploading(false)
  }

  const handleSellChoice = (choice: 'pay' | 'contact') => {
    if (choice === 'pay') {
      if ((profile?.coins_balance || 0) < 50) return showToast('Tu as besoin de 50 jetons.', 'error')
      setSellStep('form')
    } else {
      router.push('/dashboard/profil/support')
      setIsSellOpen(false)
    }
  }

  const submitProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.price_fcfa) return showToast('Remplis les champs obligatoires.', 'error')
    
    setIsProcessing(true)
    try {
      const { error } = await supabase.rpc('publish_product_with_coins', {
        p_user_id: profile.id, p_name: formData.name, p_description: formData.description,
        p_category: formData.category, p_price_fcfa: parseFloat(formData.price_fcfa),
        p_contact_whatsapp: formData.contact_whatsapp, p_contact_telegram: formData.contact_telegram,
        p_demo_url: formData.demo_url, p_preview_image: formData.preview_image
      })

      if (error) throw error

      showToast('Produit publié !', 'success')
      setIsSellOpen(false); setSellStep('choice')
      setFormData({ name: '', description: '', category: 'site_web', price_fcfa: '', contact_whatsapp: '', contact_telegram: '', demo_url: '', preview_image: '' })
      
      const { data: prods } = await supabase.from('digital_products').select('*, profiles:seller_id(full_name)').eq('is_active', true).eq('is_approved', true).order('created_at', { ascending: false })
      setProducts(prods || [])
      const { data: newProf } = await supabase.from('profiles').select('*').eq('id', profile.id).single()
      setProfile(newProf)

    } catch (err: any) {
      showToast('Erreur : ' + err.message, 'error')
    }
    setIsProcessing(false)
  }

  const handleContact = async (method: 'whatsapp' | 'telegram' | 'message') => {
    if (!selectedProduct || !profile) return
    setIsProcessing(true)
    try {
      await fetch('/api/market/notify-seller', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: selectedProduct.id, buyer_id: profile.id, contact_method: method })
      })
      if (method === 'whatsapp' && selectedProduct.contact_whatsapp) window.open(`https://wa.me/${selectedProduct.contact_whatsapp.replace(/\D/g, '')}`, '_blank')
      else if (method === 'telegram' && selectedProduct.contact_telegram) window.open(selectedProduct.contact_telegram, '_blank')
      else router.push('/dashboard/messages')
      showToast('Vendeur notifié.', 'success')
      setSelectedProduct(null)
    } catch (err: any) { showToast('Erreur : ' + err.message, 'error') }
    setIsProcessing(false)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-slate-500 bg-slate-100 p-2 rounded-full">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <div><h1 className="text-lg font-bold text-slate-900">Market</h1><p className="text-xs text-slate-500">Achète et vends des sites web</p></div>
        </div>
        <button onClick={() => { setIsSellOpen(true); setSellStep('choice') }} className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg> Vendre
        </button>
      </header>

      <div className="p-4 max-w-5xl mx-auto mt-4">
        <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-lg mb-6">
          <h2 className="text-2xl font-black mb-1">Développez votre activité</h2>
          <p className="text-slate-400 text-sm">Contactez directement les vendeurs pour acquérir des outils professionnels.</p>
        </div>

        {products.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-slate-200"><p className="text-slate-500">Aucun produit disponible.</p></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map(product => (
              <div key={product.id} className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm flex flex-col">
                {product.preview_image && <img src={product.preview_image} alt={product.name} className="w-full h-40 object-cover bg-slate-100" />}
                <div className="p-4 flex-1 flex flex-col">
                  <span className="text-[10px] font-bold uppercase text-slate-600 bg-slate-100 px-2 py-1 rounded w-fit mb-2">{product.category}</span>
                  <h3 className="font-bold text-slate-900 mb-1">{product.name}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mb-3 flex-1">{product.description}</p>
                  <p className="text-lg font-black text-slate-900 mb-3">{product.price_fcfa.toLocaleString('fr-FR')} F</p>
                  <button onClick={() => setSelectedProduct(product)} className="w-full py-2.5 bg-slate-900 text-white font-bold text-sm rounded-xl active:scale-95 transition">Contacter le vendeur</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Contact */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md p-6">
            <h2 className="font-bold text-lg mb-2">Contacter le vendeur</h2>
            <p className="text-sm text-slate-500 mb-4">Choisissez votre méthode de contact.</p>
            <div className="space-y-2">
              <button onClick={() => handleContact('whatsapp')} disabled={isProcessing || !selectedProduct.contact_whatsapp} className="w-full py-3 bg-emerald-500 text-white font-bold rounded-xl disabled:opacity-50">WhatsApp</button>
              <button onClick={() => handleContact('telegram')} disabled={isProcessing || !selectedProduct.contact_telegram} className="w-full py-3 bg-sky-500 text-white font-bold rounded-xl disabled:opacity-50">Telegram</button>
              <button onClick={() => handleContact('message')} disabled={isProcessing} className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl disabled:opacity-50">Message interne</button>
              <button onClick={() => setSelectedProduct(null)} className="w-full py-3 bg-slate-100 text-slate-700 font-bold rounded-xl mt-2">Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Vendre */}
      {isSellOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            {sellStep === 'choice' ? (
              <>
                <h2 className="font-bold text-lg mb-2">Vendre un produit</h2>
                <p className="text-sm text-slate-500 mb-4">Pour publier votre site ou application, vous avez deux options.</p>
                <div className="space-y-3">
                  <button onClick={() => handleSellChoice('pay')} className="w-full p-4 border-2 border-amber-200 bg-amber-50 rounded-2xl text-left hover:border-amber-400 transition">
                    <div className="flex items-center gap-3 mb-1">
                      <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <div><p className="font-bold text-slate-900">Payer 50 jetons</p><p className="text-xs text-slate-600">Publication immédiate</p></div>
                    </div>
                    <p className="text-[10px] text-amber-700">Solde : {profile?.coins_balance || 0} jetons</p>
                  </button>
                  <button onClick={() => handleSellChoice('contact')} className="w-full p-4 border-2 border-slate-200 rounded-2xl text-left hover:border-slate-400 transition">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                      </div>
                      <div><p className="font-bold text-slate-900">Contacter l'admin</p><p className="text-xs text-slate-600">Parler à un humain</p></div>
                    </div>
                  </button>
                </div>
                <button onClick={() => setIsSellOpen(false)} className="w-full py-3 bg-slate-100 text-slate-700 font-bold rounded-xl mt-4">Annuler</button>
              </>
            ) : (
              <>
                <h2 className="font-bold text-lg mb-2">Publier mon produit</h2>
                <form onSubmit={submitProduct} className="space-y-3">
                  <input type="text" required placeholder="Nom du produit" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                  <textarea required placeholder="Description" rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none" />
                  <input type="number" required placeholder="Prix en FCFA" value={formData.price_fcfa} onChange={e => setFormData({...formData, price_fcfa: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                  <input type="tel" placeholder="Numéro WhatsApp" value={formData.contact_whatsapp} onChange={e => setFormData({...formData, contact_whatsapp: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                  <input type="url" placeholder="Lien Telegram" value={formData.contact_telegram} onChange={e => setFormData({...formData, contact_telegram: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                  <input type="url" placeholder="URL de démonstration" value={formData.demo_url} onChange={e => setFormData({...formData, demo_url: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                  
                  {/* 🖼️ UPLOAD IMAGE */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Image d'aperçu</label>
                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center relative">
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={isUploading} />
                      {formData.preview_image ? (
                        <img src={formData.preview_image} alt="Aperçu" className="max-h-32 mx-auto rounded-lg object-contain" />
                      ) : (
                        <div>
                          <svg className="w-8 h-8 text-slate-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          <p className="text-xs text-slate-500">Clique pour uploader</p>
                        </div>
                      )}
                    </div>
                    {isUploading && <p className="text-xs text-sky-500 mt-1">Upload...</p>}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button type="button" onClick={() => setSellStep('choice')} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl">Retour</button>
                    <button type="submit" disabled={isProcessing || isUploading} className="flex-1 py-3 bg-slate-900 text-white font-bold rounded-xl disabled:opacity-50">
                      {isProcessing ? 'Publication...' : 'Publier (50 jetons)'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  )
}
