'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isAnnonceurMode, setIsAnnonceurMode] = useState(false)

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      
      if (profileData) {
        if (!profileData.is_onboarded) {
          router.push('/onboarding')
          return
        }
        setProfile(profileData)
        setIsAnnonceurMode(profileData.role === 'annonceur')
      }
      setLoading(false)
    }
    loadData()
  }, [router, supabase])

  const toggleMode = async () => {
    const newMode = !isAnnonceurMode
    setIsAnnonceurMode(newMode)
    const newRole = newMode ? 'annonceur' : 'diffuseur'
    await supabase.from('profiles').update({ role: newRole }).eq('id', profile.id)
    setProfile({ ...profile, role: newRole })
  }

  if (loading) {
    return <main className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">Chargement...</main>
  }

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col">
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <div className="text-xl font-black text-slate-900">XAF<span className="text-sky-500">ERAN</span></div>
        <div className="flex items-center gap-4">
          <button 
            onClick={toggleMode}
            className="flex items-center gap-2 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-full hover:bg-slate-200 transition"
          >
            <span className="text-xs text-slate-500 font-medium">Mode :</span>
            <span className={`text-xs font-bold ${isAnnonceurMode ? 'text-amber-500' : 'text-emerald-600'}`}>
              {isAnnonceurMode ? '📢 Annonceur' : '💰 Diffuseur'}
            </span>
          </button>

          <form action="/auth/signout" method="post">
            <button type="submit" className="text-sm font-medium text-slate-500 hover:text-slate-900 transition px-4 py-2 rounded-full hover:bg-slate-100">
              Déconnexion
            </button>
          </form>
        </div>
      </nav>
      
      <div className="p-6 max-w-5xl mx-auto w-full mt-8 flex-1">
        <h1 className="text-3xl font-bold mb-1 text-slate-900">
          {isAnnonceurMode ? 'Espace Annonceur' : `Bonjour, ${profile?.full_name?.split(' ')[0] || 'Utilisateur'} 👋`}
        </h1>
        <p className="text-slate-500 mb-8 flex items-center gap-2">
          {isAnnonceurMode ? 'Gère tes campagnes publicitaires.' : 'Diffuse les annonces et gagne de l\'argent.'}
          {profile?.city && <span className="text-slate-400 text-sm bg-slate-100 px-2 py-1 rounded-md border border-slate-200">📍 {profile.city}, {profile.neighborhood}</span>}
        </p>

        {/* VUE DIFFUSEUR */}
        {!isAnnonceurMode && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Carte Solde - Vert WhatsApp */}
            <div className="bg-[#25D366] p-8 rounded-3xl shadow-sm relative overflow-hidden text-white">
              <p className="font-semibold mb-2 text-sm uppercase tracking-wider text-emerald-950/70">Solde disponible</p>
              <div className="flex items-baseline gap-2 mb-6">
                <span className="text-5xl font-black">{(profile?.balance || 0).toLocaleString('fr-FR')}</span>
                <span className="text-xl font-bold text-emerald-950/70">FCFA</span>
              </div>
              <div className="flex gap-3 relative z-10">
                <button className="flex-1 py-3 bg-white text-[#128C7E] font-bold rounded-xl shadow-sm hover:bg-slate-50 transition text-center">Retirer</button>
                <button className="flex-1 py-3 bg-[#128C7E]/30 text-white font-bold rounded-xl hover:bg-[#128C7E]/50 transition text-center">Historique</button>
              </div>
            </div>

            {/* Carte Niveau - Or / Jaune */}
            <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm flex flex-col justify-center">
              <p className="text-slate-500 font-semibold mb-2 text-sm uppercase tracking-wider">Votre Niveau Actuel</p>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-4xl border border-amber-200">
                  {profile?.level === 1 ? '🥉' : profile?.level === 2 ? '🥈' : '🥇'}
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">Niveau {profile?.level || 1}</div>
                  <div className="text-amber-600 font-bold">{profile?.level === 1 ? '0,50' : profile?.level === 2 ? '1,25' : '1,75'} F / vue</div>
                </div>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 mt-2">
                <div className="bg-amber-400 h-2 rounded-full" style={{ width: '35%' }}></div>
              </div>
              <p className="text-xs text-slate-500 mt-2">Prochain niveau dans 3 500 vues</p>
            </div>
          </div>
        )}

        {/* VUE ANNONCEUR */}
        {isAnnonceurMode && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm flex flex-col justify-center">
              <p className="text-slate-500 font-semibold mb-2 text-sm uppercase tracking-wider">Mon Business</p>
              <div className="text-2xl font-bold text-slate-900 mb-1">{profile?.business_name || 'Non renseigné'}</div>
              <div className="text-sky-600 text-sm font-semibold capitalize bg-sky-50 inline-block px-2 py-1 rounded-md w-max">{profile?.activity_sector || 'Secteur non défini'}</div>
            </div>

            <div className="bg-sky-500 p-8 rounded-3xl shadow-sm relative overflow-hidden text-white">
              <p className="font-semibold mb-2 text-sm uppercase tracking-wider text-sky-900/70">Lancer une campagne</p>
              <p className="text-sky-100 text-sm mb-6">Touche des milliers de clients dans ta ville.</p>
              <button className="w-full py-3 bg-white text-sky-600 font-bold rounded-xl shadow-sm hover:bg-slate-50 transition text-center">Créer une publicité</button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
