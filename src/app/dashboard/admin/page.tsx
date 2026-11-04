import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// --- ACTIONS ADMIN ---

async function updateCampaignStatus(formData: FormData) {
  'use server'
  const supabase = await createClient()
  await supabase.from('campaigns').update({ status: formData.get('status') as string }).eq('id', formData.get('id') as string)
  revalidatePath('/dashboard/admin')
  revalidatePath('/dashboard/annonces')
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
  const viewsStr = formData.get('views') as string
  const views = parseInt(viewsStr) || 0

  if (views <= 0) return

  const { data: sub } = await supabase
    .from('ad_submissions')
    .select('*, profiles(balance, level, email, full_name), campaigns(is_welcome_campaign, title)')
    .eq('id', id)
    .single()
  
  if (sub && sub.profiles) {
    // 1. On valide la soumission
    await supabase.from('ad_submissions').update({ 
      status: 'validated',
      views_count: views
    }).eq('id', id)

    // 2. Si c'est l'annonce test : on débloque le compte, mais ON NE PAIE PAS
    if (sub.campaigns?.is_welcome_campaign) {
      // Désactiver le mode test
      await supabase.from('profiles').update({ is_test_mode: false }).eq('id', sub.user_id)
      
      // Notification spéciale
      await supabase.from('notifications').insert({
        user_id: sub.user_id,
        title: 'Mode test terminé 🚀',
        message: 'Félicitations ! Tu as validé ton annonce test. Toutes les campagnes payantes sont maintenant débloquées.',
        link: '/dashboard/annonces'
      })
    } else {
      // 3. Si c'est une annonce PAYANTE : on calcule et crédite le solde
      const gainPerView = sub.profiles.level === 1 ? 0.50 : sub.profiles.level === 2 ? 1.25 : 1.75
      const totalGain = gainPerView * views
      
      await supabase.from('profiles').update({
        balance: (sub.profiles.balance || 0) + totalGain
      }).eq('id', sub.user_id)

      // Notification de gain
      await supabase.from('notifications').insert({
        user_id: sub.user_id,
        title: 'Diffusion validée ✅',
        message: `Ta diffusion pour "${sub.campaigns?.title}" a été validée. Tu as gagné ${totalGain.toFixed(2)} FCFA.`,
        link: '/dashboard'
      })

      // Email de gain
      try {
        const { sendValidationEmail } = await import('@/lib/email/send')
        await sendValidationEmail(sub.profiles.email, sub.profiles.full_name, views, totalGain)
      } catch (e) { console.log('Email non envoyé', e) }
    }
  }

  revalidatePath('/dashboard/admin')
  revalidatePath('/dashboard')
}

async function rejectSubmission(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const id = formData.get('id') as string
  
  const { data: sub } = await supabase.from('ad_submissions').select('user_id, campaigns(title)').eq('id', id).single()
  
  await supabase.from('ad_submissions').update({ status: 'rejected' }).eq('id', id)
  
  if (sub) {
    await supabase.from('notifications').insert({
      user_id: sub.user_id,
      title: 'Preuve rejetée ❌',
      message: `Ta preuve pour "${sub.campaigns?.title}" a été rejetée. Vérifie qu'elle est bien conforme.`,
      link: '/dashboard/annonces'
    })
  }
  
  revalidatePath('/dashboard/admin')
}

// --- COMPOSANTS ---

async function AdminContent() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role, is_admin').eq('id', user.id).single()
  if (!profile || (profile.role !== 'admin' && !profile.is_admin)) {
    return <div className="text-center py-20 text-red-500 font-bold">Accès refusé</div>
  }

  const { data: campaigns } = await supabase.from('campaigns').select('*, profiles!fk_campaigns_profiles(full_name, email)').order('created_at', { ascending: false })
  const { data: submissions } = await supabase.from('ad_submissions').select('*, profiles(full_name, email, level, balance), campaigns(title, is_welcome_campaign)').order('created_at', { ascending: false })
  const { data: users } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })

  return (
    <div className="space-y-10">
      
      {/* 1. PREUVES EN ATTENTE */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4">Preuves en attente ({submissions?.filter((s: any) => s.status === 'pending').length || 0})</h2>
        
        {submissions?.filter((s: any) => s.status === 'pending').length === 0 ? (
          <div className="bg-white border border-slate-200 p-6 rounded-2xl text-center text-slate-500 text-sm">Aucune preuve en attente.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {submissions?.filter((s: any) => s.status === 'pending').map((s: any) => {
              const gainPerView = s.profiles?.level === 1 ? 0.50 : s.profiles?.level === 2 ? 1.25 : 1.75
              const isTest = s.campaigns?.is_welcome_campaign
              
              return (
                <div key={s.id} className={`bg-white border-2 rounded-2xl shadow-sm p-4 ${isTest ? 'border-purple-300' : 'border-amber-200'}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{s.campaigns?.title}</h3>
                      <p className="text-xs text-slate-500">{s.profiles?.full_name}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-200">
                          Niveau {s.profiles?.level}
                        </span>
                        {isTest ? (
                          <span className="bg-purple-50 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded border border-purple-200">
                            ANNONCE TEST (Sans paiement)
                          </span>
                        ) : (
                          <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-200">
                            {gainPerView.toFixed(2)} F/vue
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {s.proof_video_url && (
                    <video src={s.proof_video_url} controls className="w-full max-h-48 rounded-lg bg-black mb-3" />
                  )}

                  <form action={validateSubmission} className="flex gap-2 items-end mt-2">
                    <input type="hidden" name="id" value={s.id} />
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Vues vérifiées</label>
                      <input type="number" name="views" required defaultValue={1000} className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:border-emerald-500 outline-none" />
                    </div>
                    <button type="submit" className="px-4 py-2 bg-emerald-500 text-white font-bold text-sm rounded-lg hover:bg-emerald-400 transition">
                      {isTest ? 'Valider le test' : 'Valider & Payer'}
                    </button>
                  </form>
                  
                  <form action={rejectSubmission} className="mt-2">
                    <input type="hidden" name="id" value={s.id} />
                    <button type="submit" className="w-full py-1.5 bg-red-50 text-red-600 border border-red-200 font-bold text-xs rounded-lg hover:bg-red-100 transition">
                      Rejeter la preuve
                    </button>
                  </form>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 2. UTILISATEURS */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4">Utilisateurs ({users?.length || 0})</h2>
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3">Utilisateur</th>
                  <th className="px-4 py-3">Rôle</th>
                  <th className="px-4 py-3">Mode Test</th>
                  <th className="px-4 py-3">Solde</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users?.map((u: any) => (
                  <tr key={u.id} className={`hover:bg-slate-50 ${u.is_blocked ? 'opacity-50 bg-red-50' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{u.full_name || 'Inconnu'}</div>
                      <div className="text-xs text-slate-500">{u.email}</div>
                    </td>
                    <td className="px-4 py-3 capitalize">
                      {u.role} 
                      {u.is_admin && <span className="bg-amber-100 text-amber-700 text-[10px] px-1 rounded ml-1">ADMIN</span>}
                    </td>
                    <td className="px-4 py-3">
                      {u.is_test_mode ? (
                        <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-1 rounded">Actif</span>
                      ) : (
                        <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded">Terminé</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-bold text-emerald-600">{u.balance} F</td>
                    <td className="px-4 py-3 text-right flex justify-end gap-2">
                      <form action={toggleBlockUser}>
                        <input type="hidden" name="id" value={u.id} />
                        <input type="hidden" name="currentStatus" value={u.is_blocked ? 'true' : 'false'} />
                        <button type="submit" className={`px-2 py-1 text-xs font-bold rounded ${u.is_blocked ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {u.is_blocked ? 'Débloquer' : 'Bloquer'}
                        </button>
                      </form>
                      <form action={deleteUser}>
                        <input type="hidden" name="id" value={u.id} />
                        <button type="submit" className="px-2 py-1 text-xs font-bold rounded bg-red-100 text-red-700">Suppr.</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 3. CAMPAGNES */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4">Campagnes ({campaigns?.length || 0})</h2>
        <div className="grid grid-cols-1 gap-3">
          {campaigns?.map((c: any) => (
            <div key={c.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-3 flex flex-col md:flex-row gap-4 items-start md:items-center">
              {c.image_url && <img src={c.image_url} className="w-16 h-16 object-cover rounded-lg shrink-0" />}
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 text-sm">{c.title}</h3>
                <p className="text-xs text-slate-500">{c.profiles?.full_name}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${c.status === 'active' ? 'bg-emerald-100 text-emerald-700' : c.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{c.status}</span>
                {c.is_welcome_campaign && <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-1 rounded">TEST</span>}
                {c.status === 'pending' && (
                  <form action={updateCampaignStatus}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="status" value="active" />
                    <button type="submit" className="px-3 py-1 bg-emerald-500 text-white text-xs font-bold rounded hover:bg-emerald-400">Approuver</button>
                  </form>
                )}
                <form action={deleteCampaign}>
                  <input type="hidden" name="id" value={c.id} />
                  <button type="submit" className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded hover:bg-red-200">Suppr.</button>
                </form>
              </div>
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
          <img src="/logo.png" alt="XAFERAN" className="h-6 w-auto object-contain" />
        </div>
        <Link href="/dashboard/admin/annonce-test" className="px-3 py-1.5 bg-sky-500 text-white text-xs font-bold rounded-lg hover:bg-sky-400 transition">
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
