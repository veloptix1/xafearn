import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'

async function ProfilData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) redirect('/login')
  
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  return (
    <>
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 bg-sky-100 border border-sky-200 rounded-full flex items-center justify-center text-sky-600 text-2xl font-bold">
          {profile?.full_name?.charAt(0) || 'U'}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{profile?.full_name || 'Utilisateur'}</h1>
          <p className="text-sm text-slate-500">{profile?.email || 'Email non renseigné'}</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mb-6">
        <div className="p-4 border-b border-slate-100">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Téléphone</p>
          <p className="font-medium text-slate-900">{profile?.phone || 'Non renseigné'}</p>
        </div>
        <div className="p-4 border-b border-slate-100">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Localisation</p>
          <p className="font-medium text-slate-900">{profile?.city || 'Ville'}, {profile?.neighborhood || 'Quartier'}</p>
        </div>
        <div className="p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Type de compte</p>
          <p className="font-medium text-slate-900 capitalize">{profile?.role || 'Diffuseur'}</p>
        </div>
      </div>
    </>
  )
}

export default function ProfilPage() {
  return (
    <main className="min-h-screen bg-slate-50 p-6 pb-24">
      <div className="max-w-lg mx-auto">
        <Link href="/dashboard" className="inline-flex items-center text-slate-500 hover:text-slate-900 mb-6 font-medium text-sm">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          Retour
        </Link>
        
        <Suspense fallback={
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin"></div>
            <p className="text-slate-400 mt-4 text-sm font-medium">Chargement du profil...</p>
          </div>
        }>
          <ProfilData />
        </Suspense>

        <form action="/auth/signout" method="post" className="mt-6">
          <button type="submit" className="w-full py-3 bg-white border border-red-200 text-red-600 font-bold rounded-xl hover:bg-red-50 transition flex justify-center items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            Se déconnecter
          </button>
        </form>
      </div>
    </main>
  )
}
