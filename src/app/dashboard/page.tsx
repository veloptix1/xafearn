import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col">
      <nav className="border-b border-white/5 bg-slate-950/80 backdrop-blur-md px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="text-xl font-black text-white">XAF<span className="text-cyan-400">ERAN</span></div>
        <form action="/auth/signout" method="post">
          <button type="submit" className="text-sm font-medium text-slate-400 hover:text-white transition px-4 py-2 rounded-full hover:bg-white/5">
            Déconnexion
          </button>
        </form>
      </nav>
      
      <div className="p-6 max-w-5xl mx-auto w-full mt-8 flex-1">
        <h1 className="text-3xl font-bold mb-1 text-white">Bonjour, {profile?.full_name?.split(' ')[0] || 'Utilisateur'} 👋</h1>
        <p className="text-slate-400 mb-8 flex items-center gap-2">
          Statut : <span className="text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded text-sm font-semibold capitalize border border-cyan-400/20">{profile?.role}</span>
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Carte Solde (Couleur Verte comme capture 1) */}
          <div className="bg-[#5c9e2f] p-8 rounded-3xl shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-20">
              <svg className="w-24 h-24 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"/></svg>
            </div>
            <p className="text-white/90 font-semibold mb-2 text-sm uppercase tracking-wider">Solde disponible</p>
            <div className="flex items-baseline gap-2 mb-6">
              <span className="text-5xl font-black text-white">{(profile?.balance || 0).toLocaleString('fr-FR')}</span>
              <span className="text-xl font-bold text-white/90">FCFA</span>
            </div>
            <div className="flex gap-3 relative z-10">
              <button className="flex-1 py-3 bg-white text-[#5c9e2f] font-bold rounded-xl shadow-sm hover:bg-slate-50 transition text-center">Retirer</button>
              <button className="flex-1 py-3 bg-black/20 text-white font-bold rounded-xl hover:bg-black/30 transition text-center">Historique</button>
            </div>
          </div>

          {/* Carte Niveau (Couleur Cyan comme capture 2) */}
          <div className="bg-slate-900 border border-white/5 p-8 rounded-3xl shadow-lg flex flex-col justify-center">
            <p className="text-slate-400 font-semibold mb-2 text-sm uppercase tracking-wider">Votre Niveau Actuel</p>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center text-4xl shadow-inner border border-white/5">
                {profile?.level === 1 ? '🥉' : profile?.level === 2 ? '🥈' : '🥇'}
              </div>
              <div>
                <div className="text-2xl font-bold text-white">Niveau {profile?.level || 1}</div>
                <div className="text-cyan-400 font-medium">{profile?.level === 1 ? '0,50' : profile?.level === 2 ? '1,25' : '1,75'} F / vue</div>
              </div>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 mt-2">
              <div className="bg-cyan-400 h-2 rounded-full" style={{ width: '35%' }}></div>
            </div>
            <p className="text-xs text-slate-500 mt-2">Prochain niveau dans 3 500 vues</p>
          </div>
        </div>
      </div>
    </main>
  )
}
