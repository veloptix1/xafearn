'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { WithdrawalAdminSection } from '../EmailComponents'

export default function AdminWithdrawalsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!prof || (prof.role !== 'admin' && !prof.is_admin)) return router.push('/dashboard')
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="p-20 text-center text-slate-500">Chargement...</div>

  return (
    <main className="p-4 md:p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-black text-slate-900 mb-6">Retraits</h1>
      <WithdrawalAdminSection />
    </main>
  )
}
