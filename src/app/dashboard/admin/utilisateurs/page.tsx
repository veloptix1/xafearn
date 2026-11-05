import { createClient } from '@/lib/supabase/server'
import { AdminUserRow } from '../EmailComponents'

export default async function AdminUsersPage() {
  const supabase = await createClient()
  const { data: users } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-black text-slate-900">👥 Utilisateurs ({users?.length || 0})</h2>
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
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
              {users?.map((u: any) => <AdminUserRow key={u.id} user={u} />)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
