import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { EmailForm, SendSingleEmail } from './EmailComponents'

// --- ACTIONS ---
async function updateCampaignStatus(formData: FormData) {
  'use server'
  const supabase = await createClient()
  await supabase.from('campaigns').update({ status: formData.get('status') as string }).eq('id', formData.get('id') as string)
  revalidatePath('/dashboard/admin')
}

async function deleteCampaign(formData: FormData) {
  'use server'
  const supabase = await createClient()
  await supabase.from('campaigns').delete().eq('id', formData.get('id') as string)
  revalidatePath('/dashboard/admin')
}

async function toggleBlockUser(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const currentStatus = formData.get('currentStatus') === 'true'
  await supabase.from('profiles').update({ is_blocked: !currentStatus }).eq('id', formData.get('id') as string)
  revalidatePath('/dashboard/admin')
}

async function deleteUser(formData: FormData) {
  'use server'
  const supabase = await createClient()
  await supabase.from('profiles').delete().eq('id', formData.get('id') as string)
  revalidatePath('/dashboard/admin')
}

async function validateSubmission(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const id = formData.get('id') as string
  const views = parseInt(formData.get('views') as string) || 0
  if (views <= 0) return

  // 1. Récupérer la soumission
  const { data: sub } = await supabase.from('ad_submissions').select('*').eq('id', id).single()
  if (!sub) return

  // 2. Récupérer le profil
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', sub.user_id).single()
  if (!profile) return

  // 3. Récupérer la campagne
  const { data: campaign } = await supabase.from('campaigns').select('*').eq('id', sub.campaign_id).single()
  if (!campaign) return

  // 4. Mettre à jour la soumission
  await supabase.from('ad_submissions').update({ status: 'validated', views_count: views }).eq('id', id)

  if (campaign.is_welcome_campaign) {
    // Test : débloquer sans payer
    await supabase.from('profiles').update({ is_test_mode: false }).eq('id', sub.user_id)
    await supabase.from('notifications').insert({
      user_id: sub.user_id,
      title: 'Mode test terminé 🚀',
      message: 'Félicitations ! Toutes les campagnes payantes sont débloquées.',
      link: '/dashboard/annonces'
    })
  } else {
    // Payant : créditer
    const gainPerView = profile.level === 1 ? 0.50 : profile.level === 2 ? 1.25 : 1.75
    const totalGain = gainPerView * views
    
    await supabase.from('profiles').update({ balance: (profile.balance || 0) + totalGain }).eq('id', sub.user_id)
    
    await supabase.from('notifications').insert({
      user_id: sub.user_id,
      title: 'Diffusion validée ✅',
      message: `Tu as gagné ${totalGain.toFixed(2)} FCFA pour "${campaign.title}".`,
      link: '/dashboard'
    })
  }

  revalidatePath('/dashboard/admin')
}

async function rejectSubmission(formData: FormData) {
  'use server'
  const supabase = await createClient()
  await supabase.from('ad_submissions').update({ status: 'rejected' }).eq('id', formData.get('id') as string)
  revalidatePath('/dashboard/admin')
}

// --- COMPOSANT ---
async function AdminContent() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || (profile.role !== 'admin' && !profile.is_admin)) {
    return <div className="text-center py-20 text-red-500 font-bold">Accès refusé (Rôle: {profile?.role})</div>
  }

  // Requêtes simples, sans jointure complexe
  const { data: campaigns } = await supabase.from('campaigns').select('*').order('created_at', { ascending: false })
  const { data: submissions } = await supabase.from('ad_submissions').select('*').order('created_at', { ascending: false })
  const { data: users } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })

  // On crée un dictionnaire pour retrouver les infos rapidement
  const usersMap = new Map(users?.map(u => [u.id, u]) || [])
  const campaignsMap = new Map(campaigns?.map(c => [c.id, c]) || [])

  const pendingSubmissions = submissions?.filter(s => s.status === 'pending') || []

  return (
    <div className="space-y-10">
      
      {/* 1. EMAILS */}
      <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-lg">
        <h2 className="text-xl font-bold mb-2">📧 Communication</h2>
        <p className="text-slate-400 text-sm mb-4">Envoie un email à tes utilisateurs.</p>
        <EmailForm users={users || []} />
      </div>

      {/* 2. PREUVES */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4">Preuves en attente ({pendingSubmissions.length})</h2>
        {pendingSubmissions.length === 0 ? (
          <div className="bg-white border border-slate-200 p-6 rounded-2xl text-center text-slate-500 text-sm">Aucune preuve en attente.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingSubmissions.map((s: any) => {
              const camp = campaignsMap.get(s.campaign_id)
              const userProfile = usersMap.get(s.user_id)
              const isTest = camp?.is_welcome_campaign
              const gainPerView = userProfile?.level === 1 ? 0.50 : userProfile?.level === 2 ? 1.25 : 1.75
              
              return (
                <div key={s.id} className={`bg-white border-2 rounded-2xl shadow-sm p-4 ${isTest ? 'border-purple-300' : 'border-amber-200'}`}>
                  <div className="mb-3">
                    <h3 className="font-bold text-slate-900 text-sm">{camp?.title || 'Campagne inconnue'}</h3>
                    <p className="text-xs text-slate-500">{userProfile?.full_name}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-200">Niveau {userProfile?.level}</span>
                      {isTest ? (
                        <span className="bg-purple-50 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded border border-purple-200">TEST (Sans paiement)</span>
                      ) : (
                        <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-200">{gainPerView.toFixed(2)} F/vue</span>
                      )}
                    </div>
                  </div>
                  
                  {s.proof_video_url && <video src={s.proof_video_url} controls className="w-full max-h-40 rounded-lg bg-black mb-3" />}
                  
                  <form action={validateSubmission} className="flex gap-2 items-end mt-2">
                    <input type="hidden" name="id" value={s.id} />
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Vues</label>
                      <input type="number" name="views" required defaultValue={1000} className="w-full p-2 border border-slate-300 rounded-lg text-sm" />
                    </div>
                    <button type="submit" className="px-4 py-2 bg-emerald-500 text-white font-bold text-sm rounded-lg hover:bg-emerald-400">
                      {isTest ? 'Valider test' : 'Valider & Payer'}
                    </button>
                  </form>
                  
                  <form action={rejectSubmission} className="mt-2">
                    <input type="hidden" name="id" value={s.id} />
                    <button type="submit" className="w-full py-1.5 bg-red-50 text-red-600 border border-red-200 font-bold text-xs rounded-lg">Rejeter</button>
                  </form>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 3. UTILISATEURS */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4">Utilisateurs ({users?.length || 0})</h2>
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3">Utilisateur</th>
                <th className="px-4 py-3">Rôle</th>
                <th className="px-4 py-3">Solde</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users?.map((u: any) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-900">{u.full_name}</div>
                    <div className="text-xs text-slate-500">{u.email}</div>
                  </td>
                  <td className="px-4 py-3">{u.role}</td>
                  <td className="px-4 py-3 font-bold text-emerald-600">{u.balance} F</td>
                  <td className="px-4 py-3 text-right flex justify-end gap-1">
                    <SendSingleEmail email={u.email} name={u.full_name} />
                    <form action={toggleBlockUser}>
                      <input type="hidden" name="id" value={u.id} />
                      <input type="hidden" name="currentStatus" value={u.is_blocked ? 'true' : 'false'} />
                      <button className={`px-2 py-1 text-xs font-bold rounded ${u.is_blocked ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{u.is_blocked ? 'Débloquer' : 'Bloquer'}</button>
                    </form>
                    <form action={deleteUser}>
                      <input type="hidden" name="id" value={u.id} />
                      <button className="px-2 py-1 text-xs font-bold rounded bg-red-100 text-red-700">Suppr.</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. CAMPAGNES */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4">Campagnes ({campaigns?.length || 0})</h2>
        <div className="space-y-2">
          {campaigns?.map((c: any) => (
            <div key={c.id} className="bg-white border border-slate-200 rounded-xl shadow-sm p-3 flex gap-3 items-center">
              {c.image_url && <img src={c.image_url} className="w-12 h-12 object-cover rounded-lg" />}
              <div className="flex-1">
                <h3 className="font-bold text-sm">{c.title}</h3>
                <p className="text-xs text-slate-500">{usersMap.get(c.user_id)?.full_name}</p>
              </div>
              <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${c.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{c.status}</span>
              {c.status === 'pending' && (
                <form action={updateCampaignStatus}>
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="status" value="active" />
                  <button className="px-2 py-1 bg-emerald-500 text-white text-xs font-bold rounded">Approuver</button>
                </form>
              )}
              <form action={deleteCampaign}>
                <input type="hidden" name="id" value={c.id} />
                <button className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded">Suppr.</button>
              </form>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-slate-500 hover:text-slate-900 bg-slate-100 p-2 rounded-full">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <h1 className="text-lg font-bold text-slate-900">Administration</h1>
        </div>
        <Link href="/dashboard/admin/annonce-test" className="px-3 py-1.5 bg-sky-500 text-white text-xs font-bold rounded-lg hover:bg-sky-400">
          Annonce test
        </Link>
      </header>
      <div className="p-4 md:p-8 max-w-5xl mx-auto mt-2">
        <Suspense fallback={<div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin"></div></div>}>
          <AdminContent />
        </Suspense>
      </div>
    </main>
  )
}
