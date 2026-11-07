'use client'

import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="w-24 h-24 bg-sky-100 text-sky-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <h1 className="text-4xl font-black text-slate-900 mb-2">404</h1>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Page introuvable</h2>
        <p className="text-slate-500 mb-6 text-sm">Désolé, la page que tu cherches n'existe pas ou a été déplacée.</p>
        <Link href="/dashboard" className="inline-block px-6 py-3 bg-sky-500 text-white font-bold rounded-xl shadow-md active:scale-95 transition">
          Retour à l'accueil
        </Link>
      </div>
    </main>
  )
}
