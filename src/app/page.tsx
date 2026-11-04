import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-slate-900 font-sans selection:bg-emerald-200">
      
      {/* NAVBAR */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <img src="/logo.png" alt="XAFEARN" className="h-8 w-auto object-contain" />
          <div className="hidden md:flex gap-8 items-center text-sm font-medium text-slate-600">
            <a href="#comment-ca-marche" className="hover:text-emerald-600 transition">Comment ça marche</a>
            <a href="#avantages" className="hover:text-emerald-600 transition">Avantages</a>
            <a href="#temoignages" className="hover:text-emerald-600 transition">Témoignages</a>
          </div>
          <div className="flex gap-3 items-center">
            <Link href="/login" className="text-sm font-semibold text-slate-700 hover:text-emerald-600 transition hidden sm:block">Connexion</Link>
            <Link href="/signup" className="px-5 py-2.5 bg-emerald-500 text-white font-bold text-sm rounded-full hover:bg-emerald-600 transition shadow-lg shadow-emerald-500/30">
              S'inscrire
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 px-6 overflow-hidden">
        {/* Formes animées en arrière-plan */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-sky-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-40 w-72 h-72 bg-yellow-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-4000"></div>

        <div className="relative max-w-5xl mx-auto text-center z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-xs font-bold text-emerald-600 mb-8 animate-fade-in-up">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500"></span>
            Nouvelle façon de gagner de l'argent
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-tight mb-6 text-slate-900 animate-fade-in-up delay-100">
            Gagne de l'argent avec tes <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-500">
              statuts WhatsApp
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto mb-10 animate-fade-in-up delay-200">
            Publie les annonces de nos partenaires sur ton statut, prouve ta diffusion, et reçois tes gains directement sur Mobile Money. Simple, rapide, 100% gratuit.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in-up delay-300">
            <Link href="/signup" className="px-8 py-4 bg-emerald-500 text-white font-bold text-lg rounded-full hover:bg-emerald-600 transition w-full sm:w-auto shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-2 group">
              Commencer gratuitement
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </Link>
            <a href="#comment-ca-marche" className="px-8 py-4 bg-white text-slate-700 font-bold text-lg rounded-full border-2 border-slate-200 hover:border-emerald-500 hover:text-emerald-600 transition w-full sm:w-auto">
              Voir comment ça marche
            </a>
          </div>

          {/* Mockup / Image de prévisualisation */}
          <div className="mt-16 relative animate-fade-in-up delay-500 max-w-4xl mx-auto">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-sky-500 rounded-3xl blur-2xl opacity-20 transform scale-105"></div>
            <div className="relative bg-white border border-slate-200 rounded-[2rem] shadow-2xl overflow-hidden p-2">
               {/* On simule une interface de dashboard */}
               <div className="bg-slate-50 rounded-2xl p-6 md:p-10 flex flex-col md:flex-row gap-6 items-center">
                  <div className="flex-1 space-y-4">
                    <div className="h-4 bg-slate-200 rounded-full w-3/4"></div>
                    <div className="h-4 bg-slate-200 rounded-full w-1/2"></div>
                    <div className="h-10 bg-emerald-500 rounded-xl w-40 mt-6"></div>
                  </div>
                  <div className="w-full md:w-64 h-48 bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col items-center justify-center">
                    <span className="text-3xl font-black text-slate-800">+ 2 500 F</span>
                    <span className="text-xs text-slate-400 mt-1">Gains cette semaine</span>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION COMMENT ÇA MARCHE */}
      <section id="comment-ca-marche" className="py-24 px-6 bg-slate-50 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black mb-4 text-slate-900">C'est aussi simple que 1, 2, 3</h2>
            <p className="text-slate-500 text-lg">Gagne de l'argent en quelques minutes par jour.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Carte 1 */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-2 transition-all duration-300 relative group">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-900">1. Choisis une annonce</h3>
              <p className="text-slate-500 text-sm leading-relaxed">Parcours le catalogue, télécharge l'image et copie le texte de l'annonce qui te plaît.</p>
            </div>

            {/* Carte 2 */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-2 transition-all duration-300 relative group">
              <div className="w-14 h-14 bg-sky-50 text-sky-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-900">2. Publie sur ton statut</h3>
              <p className="text-slate-500 text-sm leading-relaxed">Poste l'image et le texte sur ton statut WhatsApp avec ton lien de suivi unique.</p>
            </div>

            {/* Carte 3 */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-2 transition-all duration-300 relative group">
              <div className="w-14 h-14 bg-purple-50 text-purple-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-900">3. Reçois ton argent</h3>
              <p className="text-slate-500 text-sm leading-relaxed">Envoie ta preuve, fais-la valider et retire tes gains sur Mobile Money.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION AVANTAGES */}
      <section id="avantages" className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-16">
          <div className="flex-1">
            <h2 className="text-3xl md:text-5xl font-black mb-8 leading-tight text-slate-900">
              Pourquoi ils nous font <br />
              <span className="text-emerald-500">confiance ?</span>
            </h2>
            <div className="space-y-8">
              <div className="flex gap-5">
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                </div>
                <div>
                  <h4 className="font-bold text-lg text-slate-900">Paiements rapides et sécurisés</h4>
                  <p className="text-slate-500 text-sm mt-2">Retire tes gains directement sur Orange Money, MTN MoMo, Wave ou Moov en quelques clics.</p>
                </div>
              </div>
              <div className="flex gap-5">
                <div className="w-12 h-12 bg-sky-50 rounded-2xl flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <div>
                  <h4 className="font-bold text-lg text-slate-900">Gagne de plus en plus</h4>
                  <p className="text-slate-500 text-sm mt-2">Passe de 0,50 F à 1,75 F par vue en montant de niveau. Plus tu publies, plus tu gagnes.</p>
                </div>
              </div>
              <div className="flex gap-5">
                <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                </div>
                <div>
                  <h4 className="font-bold text-lg text-slate-900">Crée ton équipe</h4>
                  <p className="text-slate-500 text-sm mt-2">Deviens Expert, recrute des agents et touche des commissions sur leurs gains.</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex-1 w-full max-w-md">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-emerald-400 to-sky-400 rounded-3xl blur-2xl opacity-20 transform rotate-3"></div>
              <div className="relative bg-white border border-slate-100 p-8 rounded-3xl shadow-xl">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center text-2xl font-black text-white shadow-lg">A</div>
                  <div>
                    <p className="font-bold text-lg text-slate-900">Amadou D.</p>
                    <p className="text-xs text-slate-500">Expert à Douala</p>
                  </div>
                </div>
                <div className="bg-slate-50 rounded-2xl p-4 mb-4 border border-slate-100">
                  <p className="text-xs text-slate-500 mb-1">Gains ce mois-ci</p>
                  <p className="text-3xl font-black text-emerald-500">45 500 FCFA</p>
                </div>
                <p className="text-sm text-slate-600 italic leading-relaxed">"Grâce à XAFEARN, j'arrondis mes fins de mois en publiant simplement sur mon statut. Les retraits sont rapides."</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-24 px-6 bg-slate-50">
        <div className="max-w-4xl mx-auto bg-emerald-500 rounded-[3rem] p-12 text-center relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-700/30 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2"></div>
          <div className="relative z-10">
            <h2 className="text-3xl md:text-5xl font-black mb-6 text-white">Prêt à commencer ?</h2>
            <p className="text-emerald-50 text-lg mb-8 max-w-xl mx-auto">Rejoins des milliers d'utilisateurs qui gagnent déjà de l'argent avec leurs statuts WhatsApp.</p>
            <Link href="/signup" className="inline-block px-10 py-4 bg-white text-emerald-600 font-black text-lg rounded-full hover:bg-slate-50 transition shadow-xl hover:scale-105 transform duration-200">
              Créer mon compte gratuitement
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-100 bg-white py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <img src="/logo.png" alt="XAFEARN" className="h-6 w-auto object-contain grayscale opacity-60" />
            <span className="text-sm text-slate-500">© 2026 XAFEARN. Tous droits réservés.</span>
          </div>
          <div className="flex gap-6 text-sm text-slate-500 font-medium">
            <Link href="/conditions" className="hover:text-emerald-500 transition">Conditions</Link>
            <Link href="/confidentialite" className="hover:text-emerald-500 transition">Confidentialité</Link>
            <a href="https://whatsapp.com/channel/0029VbDw8vXFi8xYpnZtJ93x" target="_blank" rel="noopener noreferrer" className="hover:text-emerald-500 transition">Support</a>
          </div>
        </div>
      </footer>

    </main>
  )
}
