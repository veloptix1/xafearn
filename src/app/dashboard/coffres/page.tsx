'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Toast from '@/components/Toast'

export default function TreasuresPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [treasures, setTreasures] = useState<any[]>([])
  const [links, setLinks] = useState<Record<string, any[]>>({})
  const [profile, setProfile] = useState<any>(null)
  
  // Système de toast professionnel
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' | 'warning' } | null>(null)
  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setToast({ message, type })
  }

  // État pour le modal de jeu
  const [activeTreasure, setActiveTreasure] = useState<any>(null)
  const [code, setCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [winResult, setWinResult] = useState<any>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)

      const { data: t } = await supabase.from('treasures').select('*').eq('status', 'active').order('created_at', { ascending: false })
      setTreasures(t || [])

      if (t && t.length > 0) {
        const ids = t.map(x => x.id)
        const { data: l } = await supabase.from('treasure_links').select('*').in('treasure_id', ids)
        
        const grouped: Record<string, any[]> = {}
        l?.forEach(link => {
          if (!grouped[link.treasure_id]) grouped[link.treasure_id] = []
          grouped[link.treasure_id].push(link)
        })
        setLinks(grouped)
      }
      setLoading(false)
    }
    load()
  }, [router, supabase])

  const handleClaim = async () => {
    if (!code) return showToast('Veuillez entrer le code secret.', 'warning')
    setIsSubmitting(true)
    setWinResult(null)

    try {
      const res = await fetch('/api/treasures/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ treasureId: activeTreasure.id, code })
      })
      const data = await res.json()

      if (!res.ok) {
        showToast(data.error, 'error')
      } else {
        setWinResult(data)
        showToast('Félicitations ! Tu as gagné.', 'success')
        setTimeout(() => { setActiveTreasure(null); window.location.reload() }, 5000)
      }
    } catch (err) {
      showToast('Une erreur est survenue. Veuillez réessayer.', 'error')
    }
    setIsSubmitting(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
      <div className="w-10 h-10 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin mb-4"></div>
      <p className="text-slate-500 font-medium">Chargement des trésors...</p>
    </div>
  )

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex items-center gap-4">
        <Link href="/dashboard" className="text-slate-500 hover:text-slate-900 bg-slate-100 p-2 rounded-full">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-lg font-bold text-slate-900">Coffres-forts aux Trésors</h1>
      </header>

      <div className="p-4 md:p-8 max-w-lg mx-auto mt-4 space-y-4">
        
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl p-6 text-white shadow-lg mb-6">
          <h2 className="text-xl font-bold mb-2">Trouve le code, gagne le trésor !</h2>
          <p className="text-amber-100 text-sm leading-relaxed">
            Observe les indices cachés dans les vidéos des annonceurs et sois le premier à ouvrir le coffre.
          </p>
        </div>

        {treasures.length === 0 ? (
          <div className="bg-white border border-slate-200 p-8 rounded-3xl text-center shadow-sm">
            <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h3 className="font-bold text-slate-900 mb-1">Aucun trésor disponible</h3>
            <p className="text-slate-500 text-sm">Reviens plus tard, de nouveaux coffres sont ajoutés régulièrement.</p>
          </div>
        ) : (
          treasures.map(t => {
            const treasureLinks = links[t.id] || []
            const timeLeft = new Date(t.expires_at).getTime() - Date.now()
            const hoursLeft = Math.floor(timeLeft / 3600000)
            const minsLeft = Math.floor((timeLeft % 3600000) / 60000)

            return (
              <div key={t.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-4 text-white flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sponsorisé par</p>
                    <p className="font-bold text-sm">{t.sponsor_name}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase bg-${t.tier === 'diamant' ? 'purple' : t.tier === 'or' ? 'amber' : t.tier === 'argent' ? 'slate' : 'orange'}-500 text-white`}>{t.tier}</span>
                </div>
                <div className="p-5 text-center">
                  <div className="text-4xl mb-2">💰</div>
                  <p className="text-xs text-slate-500 font-bold uppercase mb-1">Cagnotte à gagner</p>
                  <p className="text-3xl font-black text-amber-600 mb-4">{t.prize_pool.toLocaleString('fr-FR')} FCFA</p>
                  
                  <div className="flex justify-center gap-4 text-xs font-bold text-slate-500 mb-4">
                    <span>⏱ {hoursLeft}h {minsLeft}m restantes</span>
                    <span>🎁 {t.tier === 'diamant' ? '5 gagnants' : t.tier === 'or' ? '3 gagnants' : t.tier === 'argent' ? '2 gagnants' : '1 gagnant'}</span>
                  </div>

                  <button onClick={() => { setActiveTreasure(t); setCode(''); setWinResult(null); }} className="w-full py-3 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-400 transition">
                    Participer
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* MODAL DE PARTICIPATION */}
      {activeTreasure && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            
            {!winResult ? (
              <>
                <div className="text-center mb-6">
                  <h2 className="font-bold text-lg mb-1">Trouve le code secret</h2>
                  <p className="text-xs text-slate-500">Sponsorisé par {activeTreasure.sponsor_name}</p>
                </div>

                {/* Liste des indices */}
                <div className="space-y-2 mb-6">
                  <p className="text-xs font-bold text-slate-500 uppercase mb-2">Indices à trouver :</p>
                  {(links[activeTreasure.id] || []).map((link, idx) => (
                    <a key={idx} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition">
                      <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm shrink-0 text-sm font-bold text-slate-400">#{idx + 1}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900 capitalize">{link.platform}</p>
                        <p className="text-xs text-slate-500 truncate">{link.hint}</p>
                      </div>
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    </a>
                  ))}
                </div>

                <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl mb-4">
                  <p className="text-xs text-amber-800 font-medium text-center">⚠️ Tu as droit à 3 tentatives maximum. Assemble les indices pour former le code.</p>
                </div>

                <input 
                  type="text" 
                  placeholder="Entre le code secret..." 
                  value={code} 
                  onChange={e => setCode(e.target.value.toUpperCase())} 
                  className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-xl text-center font-black text-lg tracking-widest focus:border-amber-500 outline-none mb-4" 
                />

                <div className="flex gap-2">
                  <button onClick={() => setActiveTreasure(null)} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl">Annuler</button>
                  <button onClick={handleClaim} disabled={isSubmitting} className="flex-1 py-3 bg-amber-500 text-white font-bold rounded-xl disabled:opacity-50">
                    {isSubmitting ? 'Vérification...' : 'Ouvrir le coffre'}
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-6">
                <div className="text-6xl mb-4">🏆</div>
                <h2 className="text-2xl font-black text-emerald-600 mb-2">Félicitations !</h2>
                <p className="text-slate-600 mb-4">{winResult.message}</p>
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl mb-6">
                  <p className="text-xs text-emerald-700 font-bold uppercase mb-1">Gains crédités</p>
                  <p className="text-3xl font-black text-emerald-600">{winResult.prize.toFixed(2)} F</p>
                </div>
                <button onClick={() => { setActiveTreasure(null); window.location.reload(); }} className="w-full py-3 bg-emerald-500 text-white font-bold rounded-xl">Retour aux coffres</button>
              </div>
            )}

          </div>
        </div>
      )}
    </main>
  )
}
