import Link from 'next/link'
export default function ConfidentialitePage() {
  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-3xl mx-auto bg-white border border-slate-200 p-8 md:p-12 rounded-3xl shadow-sm">
        <Link href="/" className="text-xl font-black text-slate-900 mb-8 block">XAF<span className="text-sky-500">ERAN</span></Link>
        <h1 className="text-3xl font-bold text-slate-900 mb-6">Politique de confidentialité</h1>
        <div className="text-slate-600 space-y-4">
          <p>Chez XAFERAN, la protection de vos données est primordiale.</p>
          <p><strong>1. Collecte :</strong> Nous collectons votre nom, email et numéro pour la gestion de votre compte.</p>
          <p><strong>2. Utilisation :</strong> Vos données ne sont jamais revendues à des tiers.</p>
          <p><strong>3. Sécurité :</strong> Vos données sont chiffrées et stockées de manière sécurisée.</p>
        </div>
      </div>
    </main>
  )
}
