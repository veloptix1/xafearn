'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({ error, reset }: { error: Error & { digest?: string }, reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="w-24 h-24 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        </div>
        <h1 className="text-4xl font-black text-slate-900 mb-2">Oups !</h1>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Une erreur est survenue</h2>
        <p className="text-slate-500 mb-6 text-sm">Un problème technique a empêché le chargement. Réessaie ou retourne à l'accueil.</p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => reset()} className="px-6 py-3 bg-slate-900 text-white font-bold rounded-xl shadow-md active:scale-95 transition">
            Réessayer
          </button>
          <Link href="/dashboard" className="px-6 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl shadow-sm active:scale-95 transition">
            Accueil
          </Link>
        </div>
      </div>
    </main>
  )
}
