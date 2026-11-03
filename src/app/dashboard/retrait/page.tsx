import Link from 'next/link'
export default function RetraitPage() {
  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-lg mx-auto">
        <Link href="/dashboard" className="inline-flex items-center text-slate-500 hover:text-slate-900 mb-6 font-medium">
          ← Retour au tableau de bord
        </Link>
        <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Retirer des fonds</h1>
          <p className="text-slate-500 mb-6">Le système de retrait Mobile Money sera bientôt disponible.</p>
          <button className="w-full py-3 bg-sky-500 text-white font-bold rounded-xl opacity-50 cursor-not-allowed">Bientôt disponible</button>
        </div>
      </div>
    </main>
  )
}
