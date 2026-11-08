'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Toast from '@/components/Toast'

export default function MarketPage() {
  const supabase = createClient()
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [isSellOpen, setIsSellOpen] = useState(false)
  const [sellStep, setSellStep] = useState<'choice' | 'form'>('choice')
  const [isProcessing, setIsProcessing] = useState(false)
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

  const handleSellChoice = (choice: 'pay' | 'contact') => {
    if (choice === 'pay') {
      if ((profile?.coins_balance || 0) < 50) {
        return showToast('Tu as besoin de 50 jetons. Recharge ton compte.', 'error')
      }
      setSellStep('form')
    } else {
      // Contacter l'admin : on redirige vers la messagerie ou on ouvre un ticket
      router.push('/dashboard/profil/support')
      setIsSellOpen(false)
    }
  }

  const submitProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.price_fcfa) return showToast('Remplis les champs obligatoires.', 'error')
    
    setIsProcessing(true)
    try {
      const { data, error } = await supabase.rpc('publish_product_with_coins', {
        p_user_id: profile.id,
        p_name: formData.name,
        p_description: formData.description,
        p_category: formData.category,
        p_price_fcfa: parseFloat(formData.price_fcfa),
        p_contact_whatsapp: formData.contact_whatsapp,
        p_contact_telegram: formData.contact_telegram,
        p_demo_url: formData.demo_url,
        p_preview_image: formData.preview_image
      })

      if (error) throw error

      showToast('Produit publié avec succès !', 'success')
      setIsSellOpen(false)
      setSellStep('choice')
      setFormData({ name: '', description: '', category: 'site_web', price_fcfa: '', contact_whatsapp: '', contact_telegram: '', demo_url: '', preview_image: '' })
      
      // Recharger les produits
      const { data: prods } = await supabase.from('digital_products').select('*, profiles:seller_id(full_name)').eq('is_active', true).eq('is_approved', true).order('created_at', { ascending: false })
      setProducts(prods || [])
      
      // Mettre à jour le profil
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: selectedProduct.id, buyer_id: profile.id, contact_method: method })
      })

      if (method === 'whatsapp' && selectedProduct.contact_whatsapp) {
        const cleanNumber = selectedProduct.contact_whatsapp.replace(/\D/g, '')
        window.open(`https://wa.me/${cleanNumber}`, '_blank')
      } else if (method === 'telegram' && selectedProduct.contact_telegram) {
        window.open(selectedProduct.contact_telegram, '_blank')
      } else {
        router.push('/dashboard/messages')
      }

      showToast('Le vendeur a été notifié.', 'success')
      setSelectedProduct(null)
    } catch (err: any) {
      showToast('Erreur : ' + err.message, 'error')
    }
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
          <div>
            <h1 className="text-lg font-bold text-slate-900">Market</h1>
            <p className="text-xs text-slate-500">Achète et vends des sites web</p>
          </div>
        </div>
        <button onClick={() => { setIsSellOpen(true); setSellStep('choice') }} className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
          Vendre
        </button>
      </header>

      <div className="p-4 max-w-5xl mx-auto mt-4">
        
        <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-lg mb-6">
          <h2 className="text-2xl font-black mb-1">Développez votre activité</h2>
          <p className="text-slate-400 text-sm">Contactez directement les vendeurs pour acquérir des outils professionnels.</p>
        </div>

        {products.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-slate-200">
            <p className="text-slate-500">Aucun produit disponible pour le moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map(product => (
              <div key={product.id} className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm flex flex-col">
                {product.preview_image && <img src={product.preview_image} alt={product.name} className="w-full h-40 object-cover bg-slate-100" />}
                <div className="p-4 flex-1 flex flex-col">
                  <span className="text-[10px] font-bold uppercase text-slate-600 bg-slate-100 px-2 py-1 rounded w-fit mb-2">{product.category}</span>
                  <h3 className="font-bold text-slate-900 mb-1">{product.name}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mb-3 flex-1">{product.description}</p>
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-lg font-black text-slate-900">{product.price_fcfa.toLocaleString('fr-FR')} F</p>
                  </div>
                  <button onClick={() => setSelectedProduct(product)} className="w-full py-2.5 bg-slate-900 text-white font-bold text-sm rounded-xl active:scale-95 transition">
                    Contacter le vendeur
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Contacter le vendeur */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md p-6">
            <h2 className="font-bold text-lg mb-2">Contacter le vendeur</h2>
            <p className="text-sm text-slate-500 mb-4">Choisissez votre méthode de contact.</p>
            <div className="space-y-2">
              <button onClick={() => handleContact('whatsapp')} disabled={isProcessing || !selectedProduct.contact_whatsapp} className="w-full py-3 bg-emerald-500 text-white font-bold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                WhatsApp
              </button>
              <button onClick={() => handleContact('telegram')} disabled={isProcessing || !selectedProduct.contact_telegram} className="w-full py-3 bg-sky-500 text-white font-bold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                Telegram
              </button>
              <button onClick={() => handleContact('message')} disabled={isProcessing} className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                Message interne
              </button>
              <button onClick={() => setSelectedProduct(null)} className="w-full py-3 bg-slate-100 text-slate-700 font-bold rounded-xl mt-2">Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Vendre un produit */}
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
                      <div>
                        <p className="font-bold text-slate-900">Payer 50 jetons</p>
                        <p className="text-xs text-slate-600">Publication immédiate</p>
                      </div>
                    </div>
                    <p className="text-[10px] text-amber-700 ml-13">Solde actuel : {profile?.coins_balance || 0} jetons</p>
                  </button>

                  <button onClick={() => handleSellChoice('contact')} className="w-full p-4 border-2 border-slate-200 rounded-2xl text-left hover:border-slate-400 transition">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">Contacter l'admin</p>
                        <p className="text-xs text-slate-600">Parler à un humain</p>
                      </div>
                    </div>
                  </button>
                </div>
                
                <button onClick={() => setIsSellOpen(false)} className="w-full py-3 bg-slate-100 text-slate-700 font-bold rounded-xl mt-4">Annuler</button>
              </>
            ) : (
              <>
                <h2 className="font-bold text-lg mb-2">Publier mon produit</h2>
                <p className="text-sm text-slate-500 mb-4">Remplissez les informations de votre site/app.</p>
                
                <form onSubmit={submitProduct} className="space-y-3">
                  <input type="text" required placeholder="Nom du produit" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                  <textarea required placeholder="Description" rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none" />
                  <input type="number" required placeholder="Prix en FCFA" value={formData.price_fcfa} onChange={e => setFormData({...formData, price_fcfa: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                  <input type="tel" placeholder="Numéro WhatsApp" value={formData.contact_whatsapp} onChange={e => setFormData({...formData, contact_whatsapp: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                  <input type="url" placeholder="Lien Telegram" value={formData.contact_telegram} onChange={e => setFormData({...formData, contact_telegram: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                  <input type="url" placeholder="URL de démonstration" value={formData.demo_url} onChange={e => setFormData({...formData, demo_url: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                  <input type="url" placeholder="Image d'aperçu (URL)" value={formData.preview_image} onChange={e => setFormData({...formData, preview_image: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                  
                  <div className="flex gap-2 pt-2">
                    <button type="button" onClick={() => setSellStep('choice')} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl">Retour</button>
                    <button type="submit" disabled={isProcessing} className="flex-1 py-3 bg-slate-900 text-white font-bold rounded-xl disabled:opacity-50">
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
