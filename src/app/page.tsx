import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col bg-slate-50">
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="text-2xl font-black tracking-tighter text-slate-900">
          XAF<span className="text-sky-500">ERAN</span>
        </div>
        <div className="flex gap-3">
          <Link href="/login" className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition">
            Connexion
          </Link>
          <Link href="/signup" className="px-5 py-2 text-sm font-bold bg-sky-500 text-white rounded-full hover:bg-sky-400 transition shadow-sm">
            S'inscrire
          </Link>
        </div>
      </nav>

      <section className="flex flex-col items-center justify-center text-center px-6 py-32 flex-1">
        <div className="inline-block mb-6 px-4 py-1.5 rounded-full border border-sky-200 bg-sky-50 text-sky-600 text-sm font-semibold tracking-wide">
          Le réseau social qui te paie
        </div>
        <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight tracking-tight text-slate-900">
          Ton statut,<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-blue-600">
            tes gains.
          </span>
        </h1>
        <p className="text-lg text-slate-500 max-w-2xl mb-10">
          Publie les annonces des annonceurs sur ton statut et gagne de l'argent à chaque vue. Progresse, crée ton équipe, deviens Expert.
        </p>
        <div className="flex gap-4">
          <Link href="/signup" className="px-8 py-4 bg-sky-500 text-white font-bold rounded-full hover:bg-sky-400 transition shadow-md">
            Commencer maintenant
          </Link>
        </div>
      </section>
    </main>
  )
}
