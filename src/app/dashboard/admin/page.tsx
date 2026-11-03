import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// --- ACTIONS ADMIN ---

async function deleteCampaign(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const id = formData.get('id') as string
  await supabase.from('campaigns').delete().eq('id', id)
  revalidatePath('/dashboard/admin')
}

async function toggleBlockUser(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const id = formData.get('id') as string
  const currentStatus = formData.get('currentStatus') === 'true'
  await supabase.from('profiles').update({ is_blocked: !currentStatus }).eq('id', id)
  revalidatePath('/dashboard/admin')
}

async function deleteUser(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const id = formData.get('id') as string
  // Supprimer le profil (la suppression de auth.users est gérée par la cascade)
  await supabase.from('profiles').delete().eq('id', id)
  revalidatePath('/dashboard/admin')
}

async function deleteSubmission(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const id = formData.get('id') as string
  const videoUrl = formData.get('videoUrl') as string
  
  // Supprimer le fichier vidéo du storage si existant
  if (videoUrl) {
    const fileName = videoUrl.split('/').pop()
    if (fileName) await supabase.storage.from('proof-videos').remove([fileName])
  }
  
  await supabase.from('ad_submissions').delete().eq('id', id)
  revalidatePath('/dashboard/admin')
}

async function updateSubmissionStatus(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const id = formData.get('id') as string
  const status = formData.get('status') as string
  
  if (status === 'validated') {
    const { data: sub } = await supabase.from('ad_submissions').select('*, profiles(balance, level, email, full_name), campaigns(views_purchased)').eq('id', id).single()
    
    if (sub && sub.profiles) {
      const gainPerView = sub.profiles.level === 1 ? 0.50 : sub.profiles.level === 2 ? 1.25 : 1.75
      const views = parseInt(formData.get('views') as string) || 0
      const totalGain = gainPerView * views
      
      await supabase.from('profiles').update({
        balance: (sub.profiles.balance || 0) + totalGain
      }).eq('id', sub.user_id)
      
      // Envoi email
      const { sendValidationEmail } = await import('@/lib/email/send')
      await sendValidationEmail(sub.profiles.email, sub.profiles.full_name, views, totalGain)
    }
  }

  await supabase.from('ad_submissions').update({ status }).eq('id', id)
  revalidatePath('/dashboard/admin')
}

// --- COMPOSANTS ---

async function AdminContent() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: campaigns } = await supabase.from('campaigns').select('*, profiles!fk_campaigns_profiles(full_name, email)').order('created_at', { ascending: false })
  const { data: submissions } = await supabase.from('ad_submissions').select('*, profiles(full_name, email, level, balance), campaigns(title)').order('created_at', { ascending: false })
  const { data: users } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })

  return (
    <div className="space-y-8">
      
      {/* --- SECTION 1 : UTILISATEURS --- */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
          Gestion des Utilisateurs ({users?.length || 0})
        </h2>
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3">Utilisateur</th>
                  <th className="px-4 py-3">Rôle</th>
                  <th className="px-4 py-3">Niveau</th>
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
                    <td className="px-4 py-3 capitalize">{u.role} {u.is_admin && <span className="bg-amber-100 text-amber-700 text-[10px] px-1 rounded ml-1">ADMIN</span>}</td>
                    <td className="px-4 py-3">Niveau {u.level}</td>
                    <td className="px-4 py-3 font-bold text-emerald-600">{u.balance} F</td>
                    <td className="px-4 py-3 text-right flex justify-end gap-2">
                      <form action={toggleBlockUser}>
                        <input type="hidden" name="id" value={u.id} />
                        <input type="hidden" name="currentStatus" value={u.is_blocked ? 'true' : 'false'} />
                        <button type="submit" className={`px-2 py-1 text-xs font-bold rounded ${u.is_blocked ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {u.is_blocked ? 'Débloquer' : 'Bloquer'}
                        </button>
                      </form>
                      <form action={deleteUser} onSubmit={(e) => { if(!confirm('Supprimer cet utilisateur ?')) e.preventDefault() }}>
                        <input type="hidden" name="id" value={u.id} />
                        <button type="submit" className="px-2 py-1 text-xs font-bold rounded bg-red-100 text-red-700">Supprimer</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* --- SECTION 2 : PREUVES --- */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Preuves de diffusion ({submissions?.length || 0})
        </h2>
        <div className="grid grid-cols-1 gap-4">
          {submissions?.map((s: any) => {
            const gainPerView = s.profiles?.level === 1 ? 0.50 : s.profiles?.level === 2 ? 1.25 : 1.75
            return (
              <div key={s.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-slate-900">{s.campaigns?.title}</h3>
                    <p className="text-xs text-slate-500">Par : {s.profiles?.full_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-200">Niveau {s.profiles?.level}</span>
                      <span className="text-[10px] text-slate-500 font-medium">Taux : {gainPerView.toFixed(2)} F/vue</span>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${s.status === 'validated' ? 'bg-emerald-100 text-emerald-700' : s.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                    {s.status}
                  </span>
                </div>

                {s.proof_type === 'video' && s.proof_video_url && (
                  <video src={s.proof_video_url} controls className="w-full max-h-40 rounded-lg bg-black mb-3" />
                )}
                {s.proof_type === 'qr_code' && (
                  <div className="bg-slate-50 p-2 rounded-lg text-xs text-slate-600 mb-3 font-mono">Token QR : {s.qr_scan_token}</div>
                )}

                <div className="flex flex-wrap gap-2 mt-3">
                  {s.status !== 'validated' && s.status !== 'rejected' && (
                    <form action={updateSubmissionStatus} className="flex gap-2 flex-1">
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="status" value="validated" />
                      <input type="number" name="views" required defaultValue={1000} className="w-20 p-1.5 text-xs border border-slate-300 rounded focus:border-emerald-500 outline-none" placeholder="Vues" />
                      <button type="submit" className="flex-1 py-1.5 bg-emerald-500 text-white font-bold text-xs rounded hover:bg-emerald-400">Valider</button>
                    </form>
                  )}
                  {s.status !== 'rejected' && s.status !== 'validated' && (
                    <form action={updateSubmissionStatus} className="flex-1">
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="status" value="rejected" />
                      <input type="hidden" name="views" value="0" />
                      <button type="submit" className="w-full py-1.5 bg-red-50 text-red-600 border border-red-200 font-bold text-xs rounded hover:bg-red-100">Rejeter</button>
                    </form>
                  )}
                  <form action={deleteSubmission} onSubmit={(e) => { if(!confirm('Supprimer définitivement cette preuve ?')) e.preventDefault() }}>
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="videoUrl" value={s.proof_video_url || ''} />
                    <button type="submit" className="px-3 py-1.5 bg-slate-100 text-slate-600 font-bold text-xs rounded hover:bg-slate-200">Supprimer</button>
                  </form>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* --- SECTION 3 : CAMPAGNES --- */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
          Campagnes ({campaigns?.length || 0})
        </h2>
        <div className="grid grid-cols-1 gap-4">
          {campaigns?.map((c: any) => (
            <div key={c.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 flex flex-col md:flex-row gap-4">
              {c.image_url && <img src={c.image_url} className="w-full md:w-32 h-24 object-cover rounded-lg" />}
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-900">{c.title}</h3>
                    <p className="text-xs text-slate-500">Par : {c.profiles?.full_name}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${c.status === 'active' ? 'bg-emerald-100 text-emerald-700' : c.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                    {c.status}
                  </span>
                </div>
                <div className="flex gap-2 mt-3">
                  {c.status === 'pending' && (
                    <form action={async (fd) => { 'use server'; const s = await createClient(); await s.from('campaigns').update({ status: 'active' }).eq('id', fd.get('id') as string); revalidatePath('/dashboard/admin') }}>
                      <input type="hidden" name="id" value={c.id} />
                      <button type="submit" className="px-3 py-1 bg-emerald-500 text-white text-xs font-bold rounded">Approuver</button>
                    </form>
                  )}
                  <form action={deleteCampaign} onSubmit={(e) => { if(!confirm('Supprimer cette campagne ?')) e.preventDefault() }}>
                    <input type="hidden" name="id" value={c.id} />
                    <button type="submit" className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded">Supprimer</button>
                  </form>
                </div>
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
        <Link href="/dashboard/admin/annonce-test" className="px-4 py-2 bg-sky-500 text-white text-xs font-bold rounded-xl hover:bg-sky-400 transition shadow-sm">
          Annonce test
        </Link>
      </header>

      <div className="p-4 md:p-8 max-w-6xl mx-auto mt-2">
        <Suspense fallback={<div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin"></div></div>}>
          <AdminContent />
        </Suspense>
      </div>
    </main>
  )
}
