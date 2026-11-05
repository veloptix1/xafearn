import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function approveSubmission(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const id = formData.get('id') as string
  const views = parseInt(formData.get('views') as string) || 0
  if (views <= 0) return

  const { data: sub } = await supabase.from('ad_submissions').select('*').eq('id', id).single()
  if (!sub) return

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', sub.user_id).single()
  const { data: campaign } = await supabase.from('campaigns').select('*').eq('id', sub.campaign_id).single()
  if (!profile || !campaign) return

  await supabase.from('ad_submissions').update({ status: 'validated', views_count: views }).eq('id', id)

  if (campaign.is_welcome_campaign) {
    await supabase.from('profiles').update({ is_test_mode: false }).eq('id', sub.user_id)
  } else {
    const gainPerView = campaign.custom_gain_per_view || (profile.level === 1 ? 0.50 : profile.level === 2 ? 1.25 : 1.75)
    await supabase.from('profiles').update({ balance: (profile.balance || 0) + (gainPerView * views) }).eq('id', sub.user_id)
  }
  revalidatePath('/dashboard/admin/preuves')
}

async function rejectSubmission(formData: FormData) {
  'use server'
  const supabase = await createClient()
  await supabase.from('ad_submissions').update({ status: 'rejected' }).eq('id', formData.get('id') as string)
  revalidatePath('/dashboard/admin/preuves')
}

export default async function AdminPreuvesPage() {
  const supabase = await createClient()
  const { data: submissions } = await supabase.from('ad_submissions').select('*').eq('status', 'pending').order('created_at', { ascending: true })
  const { data: users } = await supabase.from('profiles').select('*')
  const { data: campaigns } = await supabase.from('campaigns').select('*')
  const usersMap = new Map(users?.map(u => [u.id, u]) || [])
  const campaignsMap = new Map(campaigns?.map(c => [c.id, c]) || [])

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-black text-slate-900">📸 Preuves à valider ({submissions?.length || 0})</h2>
      
      {submissions?.length === 0 ? (
        <div className="bg-white border border-slate-200 p-8 rounded-2xl text-center text-slate-500">Aucune preuve en attente.</div>
      ) : (
        submissions?.map((s: any) => {
          const camp = campaignsMap.get(s.campaign_id)
          const u = usersMap.get(s.user_id)
          const isTest = camp?.is_welcome_campaign
          
          return (
            <div key={s.id} className={`bg-white border-2 rounded-2xl shadow-sm p-4 ${isTest ? 'border-purple-300' : 'border-amber-200'}`}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-slate-900">{camp?.title}</h3>
                  <p className="text-xs text-slate-500">{u?.full_name} ({u?.email})</p>
                  {isTest && <span className="bg-purple-50 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded">TEST</span>}
                </div>
              </div>
              {s.proof_video_url && <video src={s.proof_video_url} controls className="w-full max-h-48 rounded-lg bg-black mb-3" />
              }
              
              <form action={approveSubmission} className="flex gap-2 items-end mt-2">
                <input type="hidden" name="id" value={s.id} />
                <div className="flex-1">
                  <input type="number" name="views" required defaultValue={1000} className="w-full p-2 border border-slate-300 rounded-lg text-sm" placeholder="Vues" />
                </div>
                <button type="submit" className="px-4 py-2 bg-emerald-500 text-white font-bold text-sm rounded-lg hover:bg-emerald-400">
                  {isTest ? 'Valider test' : 'Payer'}
                </button>
              </form>
              <form action={rejectSubmission} className="mt-2">
                <input type="hidden" name="id" value={s.id} />
                <button type="submit" className="w-full py-1.5 bg-red-50 text-red-600 border border-red-200 font-bold text-xs rounded-lg">Rejeter</button>
              </form>
            </div>
          )
        })
      )}
    </div>
  )
}
