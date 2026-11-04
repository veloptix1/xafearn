import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white overflow-hidden selection:bg-emerald-500/30">
      
      {/* Effet de lumière d'arrière-plan */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-emerald-500/20 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="fixed bottom-0 right-0 w-[600px] h-[600px] bg-sky-500/20 blur-[120px] rounded-full pointer-events-none"></div>

      {/* NAVBAR */}
      <nav className="relative z-50 border-b border-white/10 bg-slate-950/50 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <img src="/logo.png" alt="XAFEARN" className="h-8 w-auto object-contain" />
          <div className="flex gap-4 items-center">
            <Link href="/login" className="text-sm font-semibold text-slate-300 hover:text-white transition">Connexion</Link>
            <Link href="/signup" className="px-6 py-2.5 bg-emerald-500 text-slate-950 font-bold text-sm rounded-full hover:bg-emerald-400 transition shadow-[0_0_20px_rgba(16,185,129,0.4)]">
              Créer un compte
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="relative z-10 pt-32 pb-24 px-6 text-center max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-emerald-400 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          La plateforme N°1 pour monétiser ses statuts
        </div>
        
        <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.1] mb-6 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
          Transforme tes <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-400 to-sky-400">
            statuts WhatsApp
          </span> <br className="hidden md:block" />
          en argent réel.
        </h1>
        
        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
          Publie les annonces de nos partenaires, prouve ta diffusion, et reçois tes gains directement sur Mobile Money. Simple, rapide, sans arnaque.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300">
          <Link href="/signup" className="px-8 py-4 bg-emerald-500 text-slate-950 font-bold text-lg rounded-full hover:bg-emerald-400 transition w-full sm:w-auto shadow-[0_0_30px_rgba(16,185,129,0.3)]">
            Commencer à gagner
          </Link>
          <Link href="#how-it-works" className="px-8 py-4 bg-white/5 text-white font-bold text-lg rounded-full border border-white/10 hover:bg-white/10 transition w-full sm:w-auto">
            Comment ça marche ?
          </Link>
        </div>

        {/* Preuve sociale rapide */}
        <div className="mt-16 flex flex-wrap justify-center gap-8 opacity-70">
          <div className="flex items-center gap-2 text-sm font-medium"><span className="text-emerald-400 text-xl">✓</span> Paiement Mobile Money</div>
          <div className="flex items-center gap-2 text-sm font-medium"><span className="text-emerald-400 text-xl">✓</span> Retrait dès 500 FCFA</div>
          <div className="flex items-center gap-2 text-sm font-medium"><span className="text-emerald-400 text-xl">✓</span> 100% Gratuit</div>
        </div>
      </section>

      {/* SECTION COMMENT ÇA MARCHE */}
      <section id="how-it-works" className="relative z-10 py-24 px-6 bg-slate-900/50 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black mb-4">Comment ça marche ?</h2>
            <p className="text-slate-400 text-lg">Gagne de l'argent en 3 étapes simples.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Etape 1 */}
            <div className="bg-white/5 border border-white/10 p-8 rounded-3xl relative group hover:border-emerald-500/50 transition duration-300">
              <div className="text-4xl font-black text-white/10 absolute top-4 right-6 group-hover:text-emerald-500/20 transition">01</div>
              <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              </div>
              <h3 className="text-xl font-bold mb-3">1. Choisis une annonce</h3>
              <p className="text-slate-400 text-sm leading-relaxed">Parcours le catalogue et sélectionne l'annonce qui te plaît. Télécharge l'image et copie le texte.</p>
            </div>

            {/* Etape 2 */}
            <div className="bg-white/5 border border-white/10 p-8 rounded-3xl relative group hover:border-emerald-500/50 transition duration-300">
              <div className="text-4xl font-black text-white/10 absolute top-4 right-6 group-hover:text-emerald-500/20 transition">02</div>
              <div className="w-12 h-12 bg-sky-500/20 text-sky-400 rounded-2xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
              </div>
              <h3 className="text-xl font-bold mb-3">2. Publie sur ton statut</h3>
              <p className="text-slate-400 text-sm leading-relaxed">Poste l'image et le texte sur ton statut WhatsApp. N'oublie pas d'inclure ton lien de suivi unique.</p>
            </div>

            {/* Etape 3 */}
            <div className="bg-white/5 border border-white/10 p-8 rounded-3xl relative group hover:border-emerald-500/50 transition duration-300">
              <div className="text-4xl font-black text-white/10 absolute top-4 right-6 group-hover:text-emerald-500/20 transition">03</div>
              <div className="w-12 h-12 bg-purple-500/20 text-purple-400 rounded-2xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <h3 className="text-xl font-bold mb-3">3. Reçois ton argent</h3>
              <p className="text-slate-400 text-sm leading-relaxed">Envoie ta preuve de diffusion. Une fois validée, ton solde est crédité et tu peux retirer via Mobile Money.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION AVANTAGES */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-16">
          <div className="flex-1">
            <h2 className="text-3xl md:text-5xl font-black mb-6 leading-tight">
              Pourquoi choisir <br />
              <span className="text-emerald-400">XAFEARN ?</span>
            </h2>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                </div>
                <div>
                  <h4 className="font-bold text-lg">Paiements rapides et sécurisés</h3>
                  <p className="text-slate-400 text-sm mt-1">Retire tes gains directement sur Orange Money, MTN MoMo, Wave ou Moov.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-sky-500/20 rounded-full flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <div>
                  <h4 className="font-bold text-lg">Gagne de plus en plus</h3>
                  <p className="text-slate-400 text-sm mt-1">Passe de 0,50 F à 1,75 F par vue en montant de niveau.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                </div>
                <div>
                  <h4 className="font-bold text-lg">Crée ton équipe</h3>
                  <p className="text-slate-400 text-sm mt-1">Deviens Expert, recrute des agents et touche des commissions sur leurs gains.</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex-1 w-full max-w-md">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500 to-sky-500 rounded-3xl blur-2xl opacity-30 animate-pulse"></div>
              <div className="relative bg-slate-900 border border-white/10 p-8 rounded-3xl shadow-2xl">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 bg-emerald-500 rounded-full flex items-center justify-center text-2xl font-black text-slate-950">A</div>
                  <div>
                    <p className="font-bold text-lg">Amadou D.</p>
                    <p className="text-xs text-slate-400">Expert à Douala</p>
                  </div>
                </div>
                <div className="bg-white/5 rounded-2xl p-4 mb-4">
                  <p className="text-xs text-slate-400 mb-1">Gains ce mois-ci</p>
                  <p className="text-3xl font-black text-emerald-400">45 500 FCFA</p>
                </div>
                <p className="text-sm text-slate-300 italic">"Grâce à XAFEARN, j'arrondis mes fins de mois en publiant simplement sur mon statut. Les retraits sont rapides."</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-4xl mx-auto bg-gradient-to-br from-emerald-600 to-teal-800 rounded-[3rem] p-12 text-center relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
          <div className="relative z-10">
            <h2 className="text-3xl md:text-5xl font-black mb-4">Prêt à commencer ?</h2>
            <p className="text-emerald-100 text-lg mb-8 max-w-xl mx-auto">Rejoins des milliers d'utilisateurs qui gagnent déjà de l'argent avec leurs statuts WhatsApp.</p>
            <Link href="/signup" className="inline-block px-10 py-4 bg-white text-emerald-800 font-black text-lg rounded-full hover:bg-slate-50 transition shadow-xl">
              Créer mon compte gratuitement
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-white/10 bg-slate-950 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <img src="/logo.png" alt="XAFEARN" className="h-6 w-auto object-contain grayscale opacity-50" />
            <span className="text-sm text-slate-500">© 2026 XAFEARN. Tous droits réservés.</span>
          </div>
          <div className="flex gap-6 text-sm text-slate-400">
            <Link href="/conditions" className="hover:text-white transition">Conditions</Link>
            <Link href="/confidentialite" className="hover:text-white transition">Confidentialité</Link>
            <a href="https://whatsapp.com/channel/0029VbDw8vXFi8xYpnZtJ93x" target="_blank" rel="noopener noreferrer" className="hover:text-emerald-400 transition">Support</a>
          </div>
        </div>
      </footer>

    </main>
  )
}
