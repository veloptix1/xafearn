'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { EmailForm } from '../EmailComponents'

export default function AdminEmailsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!prof || (prof.role !== 'admin' && !prof.is_admin)) return router.push('/dashboard')

      const { data } = await supabase.from('profiles').select('*')
      setUsers(data || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="p-20 text-center text-slate-500">Chargement...</div>

  return (
    <main className="p-4 md:p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-black text-slate-900 mb-6">Envoyer un email</h1>
      <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-lg">
        <EmailForm users={users} />
      </div>
    </main>
  )
}
