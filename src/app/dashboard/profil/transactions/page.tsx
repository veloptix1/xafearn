import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'

async function TransactionsList() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (!transactions || transactions.length === 0) {
    return (
      <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm text-center">
        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-1">Aucune transaction</h3>
        <p className="text-slate-500 text-sm">Vos gains et retraits apparaîtront ici.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {transactions.map((tx: any) => (
        <div key={tx.id} className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === 'gain' ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-500'}`}>
              {tx.type === 'gain' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" /></svg>
              )}
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm capitalize">{tx.description || tx.type}</p>
              <p className="text-xs text-slate-500">{new Date(tx.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
          <span className={`font-black ${tx.type === 'gain' ? 'text-emerald-600' : 'text-red-500'}`}>
            {tx.type === 'gain' ? '+' : '-'}{tx.amount?.toLocaleString('fr-FR')} F
          </span>
        </div>
      ))}
    </div>
  )
}

export default function TransactionsPage() {
  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex items-center gap-4">
        <Link href="/dashboard/profil" className="text-slate-500 hover:text-slate-900 bg-slate-100 p-2 rounded-full">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-lg font-bold text-slate-900">Mes transactions</h1>
      </header>
      <div className="p-4 md:p-8 max-w-lg mx-auto mt-4">
        <Suspense fallback={<div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin"></div></div>}>
          <TransactionsList />
        </Suspense>
      </div>
    </main>
  )
}
