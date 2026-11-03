import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col relative overflow-hidden bg-slate-950">
      <div className="absolute top-0 inset-x-0 h-[500px] bg-gradient-to-b from-cyan-600/20 to-transparent pointer-events-none" />

      <nav className="relative z-10 border-b border-white/5 bg-slate-950/50 backdrop-blur-md px-6 py-4 flex justify-between items-center">
        <div className="text-2xl font-black tracking-tighter text-white">
          XAF<span className="text-cyan-400">ERAN</span>
        </div>
        <div className="flex gap-3">
          <Link href="/login" className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition">
            Connexion
          </Link>
          <Link href="/signup" className="px-5 py-2 text-sm font-bold bg-cyan-500 text-white rounded-full hover:bg-cyan-400 transition">
            S'inscrire
          </Link>
        </div>
      </nav>

      <section className="relative z-10 flex flex-col items-center justify-center text-center px-6 py-32 flex-1">
        <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight tracking-tight text-white">
          Ton statut,<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
            tes gains.
          </span>
        </h1>
        <p className="text-lg text-slate-400 max-w-2xl mb-10">
          Publie les annonces des annonceurs sur ton statut et gagne de l'argent à chaque vue. Progresse, crée ton équipe, deviens Expert.
        </p>
        <div className="flex gap-4">
          <Link href="/signup" className="px-8 py-4 bg-cyan-500 text-white font-bold rounded-full hover:bg-cyan-400 transition">
            Commencer maintenant
          </Link>
        </div>
      </section>
    </main>
  )
}
