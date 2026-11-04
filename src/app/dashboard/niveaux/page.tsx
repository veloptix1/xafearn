import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'

async function NiveauxContent() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const currentLevel = profile?.level || 1

  const levels = [
    {
      id: 1,
      name: 'Débutant',
      rate: '0,50 F / vue',
      color: 'from-orange-400 to-orange-600',
      badge: '🥉',
      conditions: ['Inscription validée', 'Profil complété à 100%', 'Numéro WhatsApp vérifié'],
      advantages: ['Accès aux annonces standards', 'Retrait à partir de 2 000 F', 'Support par email (48h)'],
    },
    {
      id: 2,
      name: 'Confirmé',
      rate: '1,25 F / vue',
      color: 'from-slate-400 to-slate-600',
      badge: '🥈',
      conditions: ['5 000 vues cumulées validées', '10 annonces diffusées avec succès', 'Taux de validation ≥ 90%', 'Aucun signalement', 'Compte actif depuis 14 jours'],
      advantages: ['Accès aux annonces premium', 'Retrait à partir de 1 000 F (48h)', 'Bonus mensuel si > 10 000 vues', 'Support chat prioritaire'],
    },
    {
      id: 3,
      name: 'Expert',
      rate: '1,75 F / vue',
      color: 'from-amber-400 to-amber-600',
      badge: '🥇',
      conditions: ['25 000 vues cumulées validées', '50 annonces diffusées avec succès', 'Taux de validation ≥ 95%', 'Compte actif depuis 30 jours', 'Avoir complété 1 défi de qualité'],
      advantages: ['Accès aux campagnes exclusives', 'Retrait à partir de 500 F (24h)', 'Création d\'équipe (jusqu\'à 5 employés)', 'Commission sur les gains de l\'équipe', 'Support WhatsApp dédié', 'Badge Expert vérifié'],
    },
  ]

  return (
    <div className="max-w-lg mx-auto space-y-6">
      
      {/* Carte du niveau actuel */}
      <div className={`bg-gradient-to-br ${levels[currentLevel - 1].color} rounded-3xl p-6 text-white shadow-lg relative overflow-hidden`}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-10 -translate-y-10"></div>
        <div className="relative z-10 text-center">
          <div className="text-5xl mb-2">{levels[currentLevel - 1].badge}</div>
          <p className="text-white/80 text-sm font-semibold uppercase tracking-wider mb-1">Ton niveau actuel</p>
          <h1 className="text-3xl font-black mb-2">{levels[currentLevel - 1].name}</h1>
          <div className="inline-block bg-white/20 backdrop-blur-sm px-4 py-1 rounded-full font-bold">
            {levels[currentLevel - 1].rate}
          </div>
        </div>
      </div>

      {/* Liste des niveaux */}
      {levels.map((lvl) => {
        const isCurrent = lvl.id === currentLevel
        const isLocked = lvl.id > currentLevel

        return (
          <div key={lvl.id} className={`bg-white border rounded-3xl shadow-sm overflow-hidden transition ${isCurrent ? 'border-sky-400 ring-2 ring-sky-400/20' : 'border-slate-200'}`}>
            
            {/* En-tête du niveau */}
            <div className={`p-5 flex items-center justify-between ${isCurrent ? 'bg-sky-50' : 'bg-slate-50'}`}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl bg-gradient-to-br ${lvl.color} shadow-sm text-white`}>
                  {lvl.badge}
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900">Niveau {lvl.id} • {lvl.name}</h2>
                  <p className="text-sm font-bold text-slate-600">{lvl.rate}</p>
                </div>
              </div>
              {isCurrent && <span className="bg-sky-500 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase">Actuel</span>}
              {isLocked && (
                <div className="text-slate-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                </div>
              )}
            </div>

            {/* Conditions */}
            <div className="p-5 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Conditions à remplir</h3>
              <ul className="space-y-2">
                {lvl.conditions.map((c, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <svg className={`w-4 h-4 mt-0.5 shrink-0 ${isCurrent || lvl.id < currentLevel ? 'text-emerald-500' : 'text-slate-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {c}
                  </li>
                ))}
              </ul>
            </div>

            {/* Avantages */}
            <div className="p-5 bg-emerald-50/30">
              <h3 className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-3">Avantages débloqués</h3>
              <ul className="space-y-2">
                {lvl.advantages.map((a, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <svg className="w-4 h-4 mt-0.5 shrink-0 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                    {a}
                  </li>
                ))}
              </ul>
            </div>

          </div>
        )
      })}

      {/* Note de bas de page */}
      <div className="bg-slate-100 p-4 rounded-2xl text-center">
        <p className="text-xs text-slate-500">
          💡 Le passage au niveau suivant est automatique dès que toutes les conditions sont remplies.
        </p>
      </div>

    </div>
  )
}

export default function NiveauxPage() {
  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex items-center gap-4">
        <Link href="/dashboard" className="text-slate-500 hover:text-slate-900 bg-slate-100 p-2 rounded-full">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <img src="/logo.png" alt="XAFEARN" className="h-6 w-auto object-contain" />
      </header>

      <div className="p-4 md:p-8 mt-2">
        <Suspense fallback={<div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin"></div></div>}>
          <NiveauxContent />
        </Suspense>
      </div>
    </main>
  )
}
