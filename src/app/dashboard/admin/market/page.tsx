'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Toast from '@/components/Toast'

export default function AdminMarketPage() {
  const supabase = createClient()
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [products, setProducts] = useState<any[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null)
  
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('site_web')
  const [priceFcfa, setPriceFcfa] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [telegram, setTelegram] = useState('')
  const [demoUrl, setDemoUrl] = useState('')
  const [previewImage, setPreviewImage] = useState('')
  const [sellerId, setSellerId] = useState('')
  const [users, setUsers] = useState<any[]>([])
  const [saving, setSaving] = useState(false)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => setToast({ message: msg, type })

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')

      const { data: prof } = await supabase.from('profiles').select('role, is_admin').eq('id', user.id).single()
      if (!prof || (prof.role !== 'admin' && !prof.is_admin)) return router.push('/dashboard')
      setIsAdmin(true)

      const { data } = await supabase.from('digital_products').select('*, profiles:seller_id(full_name)').order('created_at', { ascending: false })
      setProducts(data || [])

      const { data: allUsers } = await supabase.from('profiles').select('id, full_name').order('full_name')
      setUsers(allUsers || [])
      
      setLoading(false)
    }
    load()
  }, [supabase, router])

  const createProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !priceFcfa || !sellerId) return showToast('Remplis les champs obligatoires.', 'error')

    setSaving(true)
    try {
      const { data, error } = await supabase.from('digital_products').insert({
        seller_id: sellerId,
        name: name.trim(),
        description: description.trim(),
        category,
        price_fcfa: parseInt(priceFcfa),
        contact_whatsapp: whatsapp.trim(),
        contact_telegram: telegram.trim(),
        demo_url: demoUrl.trim(),
        preview_image: previewImage.trim(),
        is_active: true
      }).select('*, profiles:seller_id(full_name)').single()

      if (error) throw error

      setProducts([data, ...products])
      setIsCreating(false)
      setName(''); setDescription(''); setPriceFcfa(''); setWhatsapp(''); setTelegram(''); setDemoUrl(''); setPreviewImage(''); setSellerId('')
      showToast('Produit ajouté !', 'success')
    } catch (err: any) {
      showToast('Erreur : ' + err.message, 'error')
    }
    setSaving(false)
  }

  const toggleActive = async (product: any) => {
    await supabase.from('digital_products').update({ is_active: !product.is_active }).eq('id', product.id)
    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_active: !product.is_active } : p))
    showToast(product.is_active ? 'Produit désactivé.' : 'Produit activé.', 'success')
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>
  if (!isAdmin) return null

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/admin" className="text-slate-500 bg-slate-100 p-2 rounded-full">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <h1 className="text-lg font-bold text-slate-900">Market (Admin)</h1>
        </div>
        <button onClick={() => setIsCreating(true)} className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl">+ Ajouter</button>
      </header>

      <div className="p-4 max-w-4xl mx-auto mt-4 space-y-4">
        {isCreating && (
          <form onSubmit={createProduct} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
            <h3 className="font-bold text-slate-900">Ajouter un produit au Market</h3>
            
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Vendeur (utilisateur)</label>
              <select required value={sellerId} onChange={e => setSellerId(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm">
                <option value="">Sélectionner un vendeur</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Nom du produit</label>
                <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Catégorie</label>
                <select value={category} onChange={e => setCategory(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm">
                  <option value="site_web">Site Web</option>
                  <option value="application">Application</option>
                  <option value="template">Template</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Description</label>
              <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Prix FCFA</label>
                <input type="number" required value={priceFcfa} onChange={e => setPriceFcfa(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">WhatsApp</label>
                <input type="tel" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Telegram (lien)</label>
                <input type="url" value={telegram} onChange={e => setTelegram(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Lien démo</label>
                <input type="url" value={demoUrl} onChange={e => setDemoUrl(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Image d'aperçu (URL)</label>
                <input type="url" value={previewImage} onChange={e => setPreviewImage(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
              </div>
            </div>

            <div className="flex gap-2">
              <button type="button" onClick={() => setIsCreating(false)} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl">Annuler</button>
              <button type="submit" disabled={saving} className="flex-1 py-3 bg-slate-900 text-white font-bold rounded-xl disabled:opacity-50">
                {saving ? 'Ajout...' : 'Ajouter'}
              </button>
            </div>
          </form>
        )}

        <div className="space-y-3">
          {products.map(product => (
            <div key={product.id} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex gap-4 items-center">
              {product.preview_image && <img src={product.preview_image} className="w-16 h-16 rounded-xl object-cover" alt="" />}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-900 truncate">{product.name}</h3>
                <p className="text-xs text-slate-500">{product.profiles?.full_name} • {product.price_fcfa.toLocaleString('fr-FR')} F</p>
              </div>
              <button onClick={() => toggleActive(product)} className={`px-3 py-2 text-xs font-bold rounded-lg ${product.is_active ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                {product.is_active ? 'Désactiver' : 'Activer'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
