import Link from 'next/link'

export default function StatutFlashPage() {
  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex items-center gap-4">
        <Link href="/dashboard" className="text-slate-500 hover:text-slate-900 bg-slate-100 p-2 rounded-full">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-lg font-bold text-slate-900">Statuts Flash ⚡</h1>
      </header>

      <div className="p-4 md:p-8 max-w-lg mx-auto mt-4">
        <div className="bg-rose-500 rounded-3xl p-6 text-white shadow-lg mb-6 text-center">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <h2 className="text-xl font-bold mb-1">Gagne le double. Vite.</h2>
          <p className="text-rose-100 text-sm">Les annonces ci-dessous expirent dans quelques heures. Diffuse-les maintenant pour toucher un bonus x2 !</p>
        </div>

        <div className="space-y-4">
          {/* Carte Flash Fictive */}
          <div className="bg-white border-2 border-rose-400 rounded-2xl p-4 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-rose-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg">EXPIRE DANS 02:45:10</div>
            <div className="flex gap-4 items-center">
              <img src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=150&q=80" className="w-16 h-16 rounded-xl object-cover" />
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Menu Midi Express</h3>
                <p className="text-xs text-slate-500 mt-1">Gain : <strong className="text-rose-600">1,00 F / vue (x2)</strong></p>
              </div>
            </div>
            <button className="w-full mt-4 py-2 bg-rose-50 text-rose-600 font-bold text-sm rounded-xl hover:bg-rose-100 transition border border-rose-200">
              Diffuser avant expiration
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm relative overflow-hidden opacity-50">
            <div className="absolute top-0 right-0 bg-slate-400 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg">TERMINÉ</div>
            <div className="flex gap-4 items-center">
              <div className="w-16 h-16 rounded-xl bg-slate-200"></div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Promo Matinale</h3>
                <p className="text-xs text-slate-500 mt-1">Cette offre a expiré.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
