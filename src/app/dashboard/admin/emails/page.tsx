import { createClient } from '@/lib/supabase/server'
import { EmailForm } from '../EmailComponents'

export default async function AdminEmailsPage() {
  const supabase = await createClient()
  const { data: users } = await supabase.from('profiles').select('*')
  return (
    <div>
      <h2 className="text-xl font-black text-slate-900 mb-4">📧 Envoyer un email</h2>
      <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-lg">
        <EmailForm users={users || []} />
      </div>
    </div>
  )
}
