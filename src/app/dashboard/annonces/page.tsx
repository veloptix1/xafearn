import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import DiffusionModal from './DiffusionModal'

async function CatalogueContent() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Catalogue</h1>
        <Link href="/dashboard/annonces/creer" className="px-4 py-2 bg-sky-500 text-white text-sm font-bold rounded-xl hover:bg-sky-400 transition shadow-sm flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
          Créer
        </Link>
      </div>

      {profile?.is_test_mode && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl mb-6 flex gap-3">
          <div className="text-amber-500">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div>
            <h3 className="font-bold text-amber-800 text-sm">Mode Test Actif (2 jours)</h3>
            <p className="text-amber-700 text-xs mt-1">Publie des annonces pour prouver que tu es un bon diffuseur. Après 2 jours et quelques vues validées, tu débloqueras les campagnes payantes.</p>
          </div>
        </div>
      )}

      {!campaigns || campaigns.length === 0 ? (
        <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm text-center">
          <p className="text-slate-500 text-sm">Aucune annonce active pour le moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {campaigns.map((campaign) => (
            <div key={campaign.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col hover:shadow-md transition">
              {campaign.image_url && (
                <div className="h-40 w-full bg-slate-100 relative">
                  <img src={campaign.image_url} alt={campaign.title} className="w-full h-full object-cover" />
                  <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-bold text-slate-900 shadow-sm">
                    {campaign.views_purchased?.toLocaleString('fr-FR')} vues
                  </div>
                </div>
              )}
              <div className="p-4 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-slate-900 line-clamp-1">{campaign.title}</h3>
                  {campaign.price > 0 && <span className="font-black text-emerald-600 whitespace-nowrap ml-2">{campaign.price} F</span>}
                </div>
                <p className="text-sm text-slate-500 line-clamp-2 mb-4 flex-1">{campaign.description}</p>
                
                <DiffusionModal campaign={campaign} userId={user.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

export default function AnnoncesPage() {
  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex items-center gap-4">
        <Link href="/dashboard" className="text-slate-500 hover:text-slate-900">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-lg font-bold text-slate-900">Annonces</h1>
      </header>

      <div className="p-4 md:p-8 max-w-4xl mx-auto mt-2">
        <Suspense fallback={<div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin"></div></div>}>
          <CatalogueContent />
        </Suspense>
      </div>
    </main>
  )
}
