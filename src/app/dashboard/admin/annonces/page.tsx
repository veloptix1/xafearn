import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function approveCampaign(formData: FormData) {
  'use server'
  const supabase = await createClient()
  await supabase.from('campaigns').update({ status: 'active' }).eq('id', formData.get('id') as string)
  revalidatePath('/dashboard/admin/annonces')
}

async function rejectCampaign(formData: FormData) {
  'use server'
  const supabase = await createClient()
  await supabase.from('campaigns').update({ status: 'rejected' }).eq('id', formData.get('id') as string)
  revalidatePath('/dashboard/admin/annonces')
}

async function deleteCampaign(formData: FormData) {
  'use server'
  const supabase = await createClient()
  await supabase.from('campaigns').delete().eq('id', formData.get('id') as string)
  revalidatePath('/dashboard/admin/annonces')
}

export default async function AdminAnnoncesPage() {
  const supabase = await createClient()
  const { data: campaigns } = await supabase.from('campaigns').select('*').order('created_at', { ascending: false })
  const { data: users } = await supabase.from('profiles').select('*')
  const usersMap = new Map(users?.map(u => [u.id, u]) || [])

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-black text-slate-900">📢 Modération des campagnes</h2>
      
      {campaigns?.length === 0 ? (
        <div className="bg-white border border-slate-200 p-8 rounded-2xl text-center text-slate-500">Aucune campagne.</div>
      ) : (
        campaigns?.map((c: any) => (
          <div key={c.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 flex flex-col md:flex-row gap-4 items-start md:items-center">
            {c.image_url && <img src={c.image_url} className="w-20 h-20 object-cover rounded-xl" />}
            <div className="flex-1">
              <h3 className="font-bold text-slate-900">{c.title}</h3>
              <p className="text-xs text-slate-500">{usersMap.get(c.user_id)?.full_name}</p>
              <p className="text-xs text-slate-400 mt-1">Budget : {c.budget} F</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
              c.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 
              c.status === 'pending' ? 'bg-amber-100 text-amber-700' : 
              'bg-red-100 text-red-700'
            }`}>{c.status}</span>
            
            <div className="flex gap-2">
              {c.status === 'pending' && (
                <>
                  <form action={approveCampaign}>
                    <input type="hidden" name="id" value={c.id} />
                    <button type="submit" className="px-4 py-2 bg-emerald-500 text-white font-bold text-xs rounded-lg hover:bg-emerald-400">Approuver</button>
                  </form>
                  <form action={rejectCampaign}>
                    <input type="hidden" name="id" value={c.id} />
                    <button type="submit" className="px-4 py-2 bg-amber-100 text-amber-700 font-bold text-xs rounded-lg">Rejeter</button>
                  </form>
                </>
              )}
              <form action={deleteCampaign}>
                <input type="hidden" name="id" value={c.id} />
                <button type="submit" className="px-4 py-2 bg-red-100 text-red-700 font-bold text-xs rounded-lg">Suppr.</button>
              </form>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
