'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Toast from '@/components/Toast'

export default function AdminTreasuresPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [treasures, setTreasures] = useState<any[]>([])
  const [winners, setWinners] = useState<any[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  // Déclaration correcte de deleteConfirm
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' | 'warning' } | null>(null)
  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => setToast({ message, type })

  const [sponsorName, setSponsorName] = useState('')
  const [sponsorLogo, setSponsorLogo] = useState('')
  const [totalAmount, setTotalAmount] = useState('')
  const [secretCode, setSecretCode] = useState('')
  const [links, setLinks] = useState<any[]>([])

  const getTier = (amount: number) => {
    if (amount >= 50000) return { name: 'diamant', fee: 0.15, winners: [0.40, 0.25, 0.15, 0.10, 0.10], time: 72, color: 'purple' }
    if (amount >= 10000) return { name: 'or', fee: 0.20, winners: [0.50, 0.30, 0.20], time: 48, color: 'amber' }
    if (amount >= 5000) return { name: 'argent', fee: 0.25, winners: [0.70, 0.30], time: 36, color: 'slate' }
    return { name: 'bronze', fee: 0.30, winners: [1.0], time: 24, color: 'orange' }
  }

  const amount = parseFloat(totalAmount) || 0
  const tierInfo = getTier(amount)
  const platformFee = amount * tierInfo.fee
  const prizePool = amount - platformFee

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.push('/login')
    
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (!profile || (profile.role !== 'admin' && !profile.is_admin)) return router.push('/dashboard')
    
    const { data: t } = await supabase.from('treasures').select('*').order('created_at', { ascending: false })
    setTreasures(t || [])

    if (t && t.length > 0) {
      const { data: w } = await supabase
        .from('treasure_winners')
        .select('*, profiles(full_name, email)')
        .in('treasure_id', t.map(x => x.id))
      setWinners(w || [])
    }
    
    setLoading(false)
  }

  const addLink = () => {
    setLinks([...links, { platform: 'youtube', url: '', hint: '' }])
  }

  const updateLink = (index: number, field: string, value: string) => {
    const newLinks = [...links]
    newLinks[index][field] = value
    setLinks(newLinks)
  }

  const removeLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (amount < 1000) return showToast('Le montant minimum est de 1000 FCFA.', 'warning')
    if (links.length === 0) return showToast('Ajoute au moins un lien.', 'warning')

    const expiresAt = new Date(Date.now() + tierInfo.time * 60 * 60 * 1000).toISOString()

    const { data: treasure, error } = await supabase.from('treasures').insert({
      sponsor_name: sponsorName,
      sponsor_logo_url: sponsorLogo,
      total_amount: amount,
      platform_fee: platformFee,
      prize_pool: prizePool,
      tier: tierInfo.name,
      secret_code: secretCode.trim().toUpperCase(),
      expires_at: expiresAt,
      status: 'active'
    }).select().single()

    if (error) return showToast('Erreur: ' + error.message, 'error')

    const linksToInsert = links.map(l => ({ treasure_id: treasure.id, platform: l.platform, url: l.url, hint: l.hint }))
    await supabase.from('treasure_links').insert(linksToInsert)

    showToast('Coffre-fort créé avec succès !', 'success')
    setIsModalOpen(false)
    setSponsorName(''); setSponsorLogo(''); setTotalAmount(''); setSecretCode(''); setLinks([])
    loadData()
  }

  // Correction de la fonction : elle ne prend plus de paramètre 'id'
  const deleteTreasure = async () => {
    if (!deleteConfirm) return
    await supabase.from('treasures').delete().eq('id', deleteConfirm)
    setDeleteConfirm(null)
    showToast('Coffre supprimé avec succès.', 'success')
    loadData()
  }

  const closeTreasure = async (id: string) => {
    await supabase.from('treasures').update({ status: 'completed' }).eq('id', id)
    showToast('Coffre clôturé avec succès.', 'success')
    loadData()
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/admin" className="text-slate-500 hover:text-slate-900 bg-slate-100 p-2 rounded-full">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <h1 className="text-lg font-bold text-slate-900">Gestion des Coffres</h1>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 bg-amber-500 text-white text-sm font-bold rounded-xl hover:bg-amber-400">+ Nouveau Coffre</button>
      </header>

      <div className="p-4 md:p-8 max-w-4xl mx-auto mt-2 space-y-4">
        {treasures.length === 0 ? (
          <div className="bg-white border border-slate-200 p-8 rounded-3xl text-center text-slate-500">Aucun coffre créé pour le moment.</div>
        ) : (
          treasures.map(t => {
            const treasureWinners = winners.filter(w => w.treasure_id === t.id)
            const isExpired = new Date(t.expires_at) < new Date()
            
            return (
              <div key={t.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-lg text-slate-900">{t.sponsor_name}</h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-slate-100 text-slate-600">{t.tier}</span>
                      {t.status === 'active' && !isExpired ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Actif</span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Terminé</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600">Trésor : <strong className="text-amber-600">{t.prize_pool.toLocaleString('fr-FR')} F</strong> • Total payé : {t.total_amount.toLocaleString('fr-FR')} F</p>
                    <p className="text-xs text-slate-400 mt-1">Code : <strong>{t.secret_code}</strong> • Expire le {new Date(t.expires_at).toLocaleString('fr-FR')}</p>
                  </div>
                  <div className="flex gap-2">
                    {t.status === 'active' && (
                      <button onClick={() => closeTreasure(t.id)} className="px-3 py-1.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-lg">Clôturer</button>
                    )}
                    <button onClick={() => setDeleteConfirm(t.id)} className="px-3 py-1.5 bg-red-100 text-red-700 text-xs font-bold rounded-lg">Supprimer</button>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase mb-2">Gagnants ({treasureWinners.length})</p>
                  {treasureWinners.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Aucun gagnant pour le moment.</p>
                  ) : (
                    <div className="space-y-1">
                      {treasureWinners.sort((a, b) => a.rank - b.rank).map(w => (
                        <div key={w.id} className="flex justify-between items-center bg-slate-50 p-2 rounded-lg text-sm">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-[10px] font-bold">{w.rank}</span>
                            <span className="font-medium text-slate-700">{w.profiles?.full_name}</span>
                          </div>
                          <span className="font-bold text-emerald-600">{w.prize_amount.toFixed(0)} F</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* MODAL DE CONFIRMATION DE SUPPRESSION */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-6 text-center">
            <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </div>
            <h3 className="font-bold text-lg mb-2">Supprimer ce coffre ?</h3>
            <p className="text-sm text-slate-500 mb-6">Cette action est irréversible. Toutes les données associées seront perdues.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl">Annuler</button>
              <button onClick={deleteTreasure} className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl">Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CRÉATION */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl p-6 my-8">
            <h2 className="font-bold text-lg mb-4">Créer un Coffre-fort</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              
              <div className="grid grid-cols-2 gap-3">
                <input type="text" required placeholder="Nom de l'annonceur" value={sponsorName} onChange={e => setSponsorName(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                <input type="url" placeholder="Logo (URL)" value={sponsorLogo} onChange={e => setSponsorLogo(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Montant total (Min. 1000 FCFA)</label>
                <input type="number" required min="1000" placeholder="Ex: 5000" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" />
              </div>

              {amount >= 1000 && (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-sm">
                  <p className="font-bold text-amber-800 mb-2">Palier : {tierInfo.name.toUpperCase()} ({tierInfo.time}h)</p>
                  <p className="text-amber-700">Commission plateforme : <strong>{platformFee.toFixed(0)} F ({tierInfo.fee * 100}%)</strong></p>
                  <p className="text-amber-700">Cagnotte pour les gagnants : <strong>{prizePool.toFixed(0)} F</strong></p>
                  <p className="text-amber-700 mt-1">Répartition : {tierInfo.winners.length} gagnant(s) ({tierInfo.winners.map(w => `${w * 100}%`).join(' / ')})</p>
                </div>
              )}

              <input type="text" required placeholder="Code secret (ex: XAFEARN2026)" value={secretCode} onChange={e => setSecretCode(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm uppercase font-bold" />

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase">Liens & Indices</label>
                  <button type="button" onClick={addLink} className="text-xs font-bold text-sky-600">+ Ajouter un lien</button>
                </div>
                {links.map((link, i) => (
                  <div key={i} className="bg-slate-50 p-3 rounded-xl mb-2 space-y-2 relative">
                    <button type="button" onClick={() => removeLink(i)} className="absolute top-2 right-2 text-red-500 text-xs font-bold">X</button>
                    <select value={link.platform} onChange={e => updateLink(i, 'platform', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-sm">
                      <option value="youtube">YouTube</option>
                      <option value="tiktok">TikTok</option>
                      <option value="instagram">Instagram</option>
                      <option value="facebook">Facebook</option>
                    </select>
                    <input type="url" required placeholder="URL de la vidéo" value={link.url} onChange={e => updateLink(i, 'url', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-sm" />
                    <input type="text" required placeholder="Indice caché" value={link.hint} onChange={e => updateLink(i, 'hint', e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-sm" />
                  </div>
                ))}
              </div>

              <div className="flex gap-2 mt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl">Annuler</button>
                <button type="submit" className="flex-1 py-3 bg-amber-500 text-white font-bold rounded-xl">Créer le coffre</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
