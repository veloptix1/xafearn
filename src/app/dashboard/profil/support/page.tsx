'use client'
import Link from 'next/link'

export default function SupportPage() {
  const faqs = [
    { q: "Comment gagner de l'argent sur XAFEARN ?", a: "Publiez les annonces sur votre statut WhatsApp. Chaque clic sur votre lien unique vous rapporte de l'argent." },
    { q: "Quand sont validés mes gains ?", a: "L'équipe vérifie vos preuves sous 24h à 48h. Une fois validés, les gains sont ajoutés à votre solde." },
    { q: "Comment retirer mon argent ?", a: "Allez dans 'Retirer' sur votre tableau de bord. Le transfert se fait via Mobile Money (Orange, MTN)." },
    { q: "Puis-je modifier le texte de l'annonce ?", a: "Non. Si vous modifiez le texte ou le lien, les vues ne seront pas comptées." }
  ]

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex items-center gap-4">
        <Link href="/dashboard/profil" className="text-slate-500 hover:text-slate-900 bg-slate-100 p-2 rounded-full">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-lg font-bold text-slate-900">Aide & Support</h1>
      </header>

      <div className="p-4 md:p-8 max-w-lg mx-auto mt-4 space-y-6">
        {/* Contact WhatsApp */}
        <div className="bg-[#25D366] rounded-3xl p-6 text-white shadow-md relative overflow-hidden">
          <h2 className="text-lg font-bold mb-1">Besoin d'aide urgente ?</h2>
          <p className="text-white/80 text-sm mb-4">Notre équipe est disponible sur WhatsApp.</p>
          <a href="https://wa.me/237600000000" target="_blank" rel="noopener noreferrer" className="inline-block bg-white text-[#128C7E] font-bold px-6 py-2.5 rounded-xl text-sm shadow-sm">
            Contacter le support
          </a>
        </div>

        {/* FAQ */}
        <div>
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 px-1">Questions fréquentes</h2>
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            {faqs.map((faq, idx) => (
              <div key={idx} className={`p-4 ${idx !== faqs.length - 1 ? 'border-b border-slate-100' : ''}`}>
                <p className="font-bold text-slate-900 text-sm mb-1">{faq.q}</p>
                <p className="text-xs text-slate-500 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Liens utiles */}
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
          <Link href="/conditions" className="block p-4 border-b border-slate-100 hover:bg-slate-50 flex items-center justify-between">
            <span className="font-medium text-slate-700 text-sm">Conditions d'utilisation</span>
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
          </Link>
          <Link href="/confidentialite" className="block p-4 hover:bg-slate-50 flex items-center justify-between">
            <span className="font-medium text-slate-700 text-sm">Politique de confidentialité</span>
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
          </Link>
        </div>
      </div>
    </main>
  )
}
