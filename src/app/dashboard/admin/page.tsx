import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Server Action pour changer le statut de la campagne
async function updateCampaignStatus(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const id = formData.get('id') as string
  const status = formData.get('status') as string

  await supabase.from('campaigns').update({ status }).eq('id', id)
  
  // On force le rafraîchissement des pages
  revalidatePath('/dashboard/admin')
  revalidatePath('/dashboard/annonces')
}

async function AdminContent() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  // Récupérer les campagnes en attente ET actives
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('*, profiles(full_name, email)')
    .in('status', ['pending', 'active', 'rejected'])
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Modération des annonces</h1>
        <span className="bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1 rounded-full border border-amber-200">Mode Admin</span>
      </div>

      {!campaigns || campaigns.length === 0 ? (
        <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm text-center text-slate-500">
          Aucune annonce à modérer pour le moment.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {campaigns.map((c: any) => (
            <div key={c.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col md:flex-row">
              {c.image_url && (
                <div className="w-full md:w-64 h-48 md:h-auto bg-slate-100 shrink-0">
                  <img src={c.image_url} alt={c.title} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-lg text-slate-900">{c.title}</h3>
                    <p className="text-xs text-slate-500">Par : {c.profiles?.full_name} ({c.profiles?.email})</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                    c.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                    c.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {c.status === 'pending' ? 'En attente' : c.status === 'active' ? 'En ligne' : 'Rejetée'}
                  </span>
                </div>
                
                <p className="text-sm text-slate-600 mb-4 line-clamp-2">{c.description}</p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-slate-600 mb-4 bg-slate-50 p-3 rounded-lg">
                  <div><span className="font-semibold">Prix:</span> {c.price} F</div>
                  <div><span className="font-semibold">Budget:</span> {c.budget} F</div>
                  <div><span className="font-semibold">Vues:</span> {c.views_purchased}</div>
                  <div><span className="font-semibold">Cible:</span> {c.target_city}</div>
                </div>

                <div className="mt-auto flex gap-3">
                  {c.status !== 'active' && (
                    <form action={updateCampaignStatus} className="flex-1">
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="status" value="active" />
                      <button type="submit" className="w-full py-2.5 bg-emerald-500 text-white font-bold text-sm rounded-xl hover:bg-emerald-400 transition">
                        Approuver & Publier
                      </button>
                    </form>
                  )}
                  {c.status !== 'rejected' && (
                    <form action={updateCampaignStatus} className="flex-1">
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="status" value="rejected" />
                      <button type="submit" className="w-full py-2.5 bg-red-50 text-red-600 border border-red-200 font-bold text-sm rounded-xl hover:bg-red-100 transition">
                        Rejeter
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex items-center gap-4">
        <Link href="/dashboard" className="text-slate-500 hover:text-slate-900">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-lg font-bold text-slate-900">Administration</h1>
      </header>

      <div className="p-4 md:p-8 max-w-4xl mx-auto mt-2">
        <Suspense fallback={<div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin"></div></div>}>
          <AdminContent />
        </Suspense>
      </div>
    </main>
  )
}
