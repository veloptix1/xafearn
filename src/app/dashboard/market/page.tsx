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
  const [contactMethod, setContactMethod] = useState<'whatsapp' | 'telegram' | 'message'>('message')
  const [isProcessing, setIsProcessing] = useState(false)
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => setToast({ message: msg, type })

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)

      const { data: prods } = await supabase.from('digital_products').select('*, profiles:seller_id(full_name)').eq('is_active', true).order('created_at', { ascending: false })
      setProducts(prods || [])

      setLoading(false)
    }
    load()
  }, [supabase, router])

  const handleContact = async (method: 'whatsapp' | 'telegram' | 'message') => {
    if (!selectedProduct || !profile) return
    setIsProcessing(true)
    
    try {
      // 1. Envoyer la notification par email
      await fetch('/api/market/notify-seller', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: selectedProduct.id,
          buyer_id: profile.id,
          contact_method: method
        })
      })

      // 2. Rediriger selon la méthode
      if (method === 'whatsapp' && selectedProduct.contact_whatsapp) {
        const cleanNumber = selectedProduct.contact_whatsapp.replace(/\D/g, '')
        window.open(`https://wa.me/${cleanNumber}`, '_blank')
      } else if (method === 'telegram' && selectedProduct.contact_telegram) {
        window.open(selectedProduct.contact_telegram, '_blank')
      } else {
        // Pour le message interne, on redirige vers la messagerie
        router.push('/dashboard/messages')
      }

      showToast('Le vendeur a été notifié par email.', 'success')
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

      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex items-center gap-4">
        <Link href="/dashboard" className="text-slate-500 bg-slate-100 p-2 rounded-full">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Market</h1>
          <p className="text-xs text-slate-500">Sites web et applications prêts à l'emploi</p>
        </div>
      </header>

      <div className="p-4 max-w-5xl mx-auto mt-4">
        
        <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-lg mb-6 relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-2xl font-black mb-1">Développez votre activité</h2>
            <p className="text-slate-400 text-sm">Contactez directement les vendeurs pour acquérir des outils professionnels.</p>
          </div>
        </div>

        {products.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-slate-200">
            <p className="text-slate-500">Aucun produit disponible pour le moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map(product => (
              <div key={product.id} className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition flex flex-col">
                {product.preview_image && (
                  <img src={product.preview_image} alt={product.name} className="w-full h-40 object-cover bg-slate-100" />
                )}
                <div className="p-4 flex-1 flex flex-col">
                  <span className="text-[10px] font-bold uppercase text-slate-600 bg-slate-100 px-2 py-1 rounded w-fit mb-2">{product.category}</span>
                  <h3 className="font-bold text-slate-900 mb-1">{product.name}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mb-3 flex-1">{product.description}</p>
                  
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-lg font-black text-slate-900">{product.price_fcfa.toLocaleString('fr-FR')} F</p>
                  </div>

                  <button onClick={() => setSelectedProduct(product)} className="w-full py-2.5 bg-slate-900 text-white font-bold text-sm rounded-xl active:scale-95 transition flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    Contacter le vendeur
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de contact */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md p-6">
            <h2 className="font-bold text-lg mb-2">Contacter le vendeur</h2>
            <p className="text-sm text-slate-500 mb-4">Choisissez votre méthode de contact préférée. Le vendeur sera notifié par email.</p>
            
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
    </main>
  )
}
