import Link from 'next/link'
export default function EquipePage() {
  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-lg mx-auto">
        <Link href="/dashboard" className="inline-flex items-center text-slate-500 hover:text-slate-900 mb-6 font-medium">
          ← Retour au tableau de bord
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Mon Équipe</h1>
        <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm text-center text-slate-500">
          Vous devez atteindre le Niveau 3 pour créer une équipe.
        </div>
      </div>
    </main>
  )
}
