'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import NotificationBell from '@/components/NotificationBell'
import WelcomePopup from '@/components/WelcomePopup'
import BottomNav from '@/components/BottomNav'

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isAnnonceurMode, setIsAnnonceurMode] = useState(false)
  const [showSeriesPopup, setShowSeriesPopup] = useState(false)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [showReferralPopup, setShowReferralPopup] = useState(false)

  useEffect(() => {
    async function loadData() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/login'); return }

        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        
        if (data) {
          if (!data.is_onboarded) { router.push('/onboarding'); return }
          setProfile(data)
          setIsAnnonceurMode(data.role === 'annonceur')

          const { data: convs } = await supabase.from('conversations').select('id').or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
          if (convs && convs.length > 0) {
            const convIds = convs.map(c => c.id)
            const { count } = await supabase.from('messages').select('*', { count: 'exact', head: true }).in('conversation_id', convIds).eq('is_read', false).neq('sender_id', user.id)
            setUnreadMessages(count || 0)
          }
        }

        const hasSeenPopup = sessionStorage.getItem('hasSeenSeriesPopup')
        if (!hasSeenPopup) {
          setTimeout(() => {
            setShowSeriesPopup(true)
            sessionStorage.setItem('hasSeenSeriesPopup', 'true')
          }, 1500)
        }

        const hasSeenReferralPopup = sessionStorage.getItem('hasSeenReferralPopup')
        if (!hasSeenReferralPopup) {
          setTimeout(() => {
            setShowReferralPopup(true)
            sessionStorage.setItem('hasSeenReferralPopup', 'true')
          }, 2500)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [router, supabase])

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin"></div>
    </div>
  )

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <WelcomePopup />

      {showReferralPopup && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[150] w-[calc(100%-2rem)] max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="bg-gradient-to-br from-sky-500 to-blue-600 rounded-3xl p-5 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/20 rounded-full blur-2xl transform translate-x-8 -translate-y-8"></div>
            <button onClick={() => setShowReferralPopup(false)} className="absolute top-3 right-3 w-7 h-7 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30 transition z-20">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div className="relative z-10">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mb-3 backdrop-blur-sm">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <h3 className="font-black text-lg mb-1 leading-tight">Gagne 500 F par personne invitée ! 🎉</h3>
              <p className="text-sky-100 text-xs mb-4 leading-relaxed">Tu peux désormais gagner de l'argent en partageant ton lien de parrainage.</p>
              <Link href="/dashboard/mon-lien" onClick={() => setShowReferralPopup(false)} className="block w-full py-3 bg-white text-sky-600 font-bold rounded-xl text-center shadow-md active:scale-95 transition text-sm">
                Tester maintenant
              </Link>
            </div>
          </div>
        </div>
      )}

      {showSeriesPopup && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 relative shadow-2xl overflow-hidden">
            <button onClick={() => setShowSeriesPopup(false)} className="absolute top-4 right-4 z-20 text-slate-400 hover:text-slate-700 bg-slate-100 p-1.5 rounded-full transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-100 rounded-full blur-2xl transform translate-x-10 -translate-y-10"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-100 rounded-full blur-xl transform -translate-x-10 translate-y-10"></div>
            <div className="relative z-10 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/30 transform rotate-3">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
              </div>
              <h2 className="text-xl font-black text-slate-900 mb-2">Gagne de l'argent avec tes idées !</h2>
              <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                Crée des histoires captivantes, publie tes épisodes et sois rémunéré à chaque lecture.
              </p>
              <div className="space-y-3">
                <Link href="/series" onClick={() => setShowSeriesPopup(false)} className="block w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl shadow-md active:scale-95 transition">
                  Voir les séries
                </Link>
                <Link href="/dashboard/studio" onClick={() => setShowSeriesPopup(false)} className="block w-full py-3.5 bg-slate-100 text-slate-700 font-bold rounded-xl active:scale-95 transition">
                  Mon Studio Créateur
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 px-5 py-3 sticky top-0 z-50 flex justify-between items-center">
        <img src="/logo.png" alt="XAFEARN" className="h-7 w-auto object-contain" />
        <div className="flex items-center gap-2">
          <NotificationBell userId={profile.id} />
          <Link href="/dashboard/profil" className="w-9 h-9 bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center text-slate-600 active:bg-slate-200 transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          </Link>
        </div>
      </header>

      <div className="p-4 md:p-8 max-w-5xl mx-auto w-full mt-4">
        {!isAnnonceurMode ? (
          <div className="space-y-4">
            
            {!profile?.is_premium && (
              <Link href="/dashboard/activation" className="block bg-gradient-to-r from-amber-400 to-orange-500 rounded-2xl p-4 shadow-md active:scale-[0.98] transition relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-white/20 rounded-full blur-xl transform translate-x-6 -translate-y-6"></div>
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white backdrop-blur-sm">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    </div>
                    <div>
                      <p className="font-black text-white text-sm">Active ton compte Premium</p>
                      <p className="text-[10px] text-amber-100 font-medium">Débloque les tâches exclusives et le parrainage</p>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                </div>
              </Link>
            )}

            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 rounded-full blur-2xl transform translate-x-10 -translate-y-10"></div>
              <div className="relative z-10 flex justify-between items-start">
                <div>
                  <p className="text-slate-400 text-xs font-medium mb-1">Solde disponible</p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-black">{profile?.balance?.toLocaleString('fr-FR') || '0'}</span>
                    <span className="text-sm font-bold text-slate-400">FCFA</span>
                  </div>
                </div>
              </div>
              <div className="relative z-10 mt-4 flex gap-2">
                <Link href="/dashboard/retrait" className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm rounded-lg text-center transition">Retirer</Link>
                <Link href="/dashboard/historique" className="flex-1 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-sm rounded-lg text-center transition border border-white/5">Historique</Link>
              </div>
            </div>

            <Link href="/dashboard/niveaux" className="block bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex items-center justify-between active:bg-slate-50 transition">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Niveau Actuel</p>
                  <p className="text-lg font-black text-slate-900">Niveau {profile?.level || 1}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100">
                  {profile?.level === 1 ? '0,50 F/vue' : profile?.level === 2 ? '1,25 F/vue' : '1,75 F/vue'}
                </span>
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
              </div>
            </Link>

            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider px-1 pt-2">Services</h2>
            <div className="grid grid-cols-2 gap-3">
              
              <Link href="/dashboard/messages" className="block bg-white border border-slate-200 p-4 rounded-2xl shadow-sm active:bg-slate-50 transition relative">
                {unreadMessages > 0 && (
                  <div className="absolute -top-2 -right-2 bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md z-10">{unreadMessages}</div>
                )}
                <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center text-sky-500 mb-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Messages</h3>
                <p className="text-[10px] text-slate-500">Discuter en privé</p>
              </Link>

              <Link href="/dashboard/reseau" className="block bg-white border border-slate-200 p-4 rounded-2xl shadow-sm active:bg-slate-50 transition">
                <div className="w-10 h-10 bg-cyan-50 rounded-xl flex items-center justify-center text-cyan-500 mb-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Réseau</h3>
                <p className="text-[10px] text-slate-500">Publications</p>
              </Link>

              <Link href="/dashboard/mon-lien" className="block bg-white border border-slate-200 p-4 rounded-2xl shadow-sm active:bg-slate-50 transition">
                <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500 mb-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Mon Lien</h3>
                <p className="text-[10px] text-slate-500">Parrainage & gains</p>
              </Link>

              {/* 🔥 NOUVELLE CARTE ROUE */}
              <Link href="/dashboard/roue" className="block bg-gradient-to-br from-pink-500 to-rose-600 p-4 rounded-2xl shadow-md relative overflow-hidden active:scale-95 transition text-white">
                <div className="absolute top-0 right-0 bg-white/20 text-white text-[8px] font-bold px-2 py-0.5 rounded-bl-lg">NEW</div>
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <h3 className="font-bold text-sm">Roue</h3>
                <p className="text-[10px] text-pink-100">Tente ta chance</p>
              </Link>

              <Link href="/dashboard/activation" className="block bg-white border border-slate-200 p-4 rounded-2xl shadow-sm active:bg-slate-50 transition">
                <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-500 mb-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Premium</h3>
                <p className="text-[10px] text-slate-500">Activer mon compte</p>
              </Link>

              <Link href="/dashboard/annonces" className="block bg-white border border-slate-200 p-4 rounded-2xl shadow-sm active:bg-slate-50 transition">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500 mb-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Diffuser</h3>
                <p className="text-[10px] text-slate-500">Gagner de l'argent</p>
              </Link>

              <Link href="/dashboard/studio" className="block bg-white border border-slate-200 p-4 rounded-2xl shadow-sm active:bg-slate-50 transition">
                <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-500 mb-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Studio</h3>
                <p className="text-[10px] text-slate-500">Créer des séries</p>
              </Link>

              <Link href="/dashboard/taches" className="block bg-white border border-slate-200 p-4 rounded-2xl shadow-sm active:bg-slate-50 transition">
                <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500 mb-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Tâches</h3>
                <p className="text-[10px] text-slate-500">Missions rémunérées</p>
              </Link>

              <Link href="/dashboard/jetons/acheter" className="block bg-white border border-slate-200 p-4 rounded-2xl shadow-sm active:bg-slate-50 transition">
                <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-500 mb-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Jetons</h3>
                <p className="text-[10px] text-slate-500">Recharger</p>
              </Link>

            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg">
              <p className="text-amber-100 text-xs font-bold uppercase tracking-wider mb-1">Espace Annonceur</p>
              <h1 className="text-2xl font-black mb-4">Développe ton business</h1>
              <Link href="/dashboard/annonces/creer" className="inline-block px-6 py-3 bg-white text-amber-700 font-bold rounded-xl active:scale-95 transition shadow-md">
                + Créer une campagne
              </Link>
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </main>
  )
}
