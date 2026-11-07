'use client'
import Link from 'next/link'
export default function WebhooksPage() {
  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex items-center gap-4">
        <Link href="/dashboard/partenaire" className="text-slate-500 bg-slate-100 p-2 rounded-full">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-lg font-bold text-slate-900">Webhooks</h1>
      </header>
      <div className="p-4 max-w-2xl mx-auto mt-4">
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 text-center">
          <p className="text-slate-500">Configuration des webhooks (bientôt disponible).</p>
        </div>
      </div>
    </main>
  )
}
