import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function ProfilPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-lg mx-auto">
        <Link href="/dashboard" className="inline-flex items-center text-slate-500 hover:text-slate-900 mb-6 font-medium">
          ← Retour au tableau de bord
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Mon Profil</h1>
        
        <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm space-y-4 mb-6">
          <div>
            <p className="text-sm text-slate-500">Nom complet</p>
            <p className="font-bold text-slate-900">{profile?.full_name}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Email</p>
            <p className="font-bold text-slate-900">{profile?.email}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Téléphone / WhatsApp</p>
            <p className="font-bold text-slate-900">{profile?.phone || profile?.whatsapp}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Localisation</p>
            <p className="font-bold text-slate-900">{profile?.city}, {profile?.neighborhood}</p>
          </div>
        </div>

        <form action="/auth/signout" method="post">
          <button type="submit" className="w-full py-3 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition border border-red-100">
            Se déconnecter
          </button>
        </form>
      </div>
    </main>
  )
}
