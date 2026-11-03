import Link from 'next/link'
export default function ConditionsPage() {
  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-3xl mx-auto bg-white border border-slate-200 p-8 md:p-12 rounded-3xl shadow-sm">
        <Link href="/" className="text-xl font-black text-slate-900 mb-8 block">XAF<span className="text-sky-500">ERAN</span></Link>
        <h1 className="text-3xl font-bold text-slate-900 mb-6">Conditions d'utilisation</h1>
        <div className="text-slate-600 space-y-4">
          <p>Bienvenue sur XAFERAN. En utilisant notre plateforme, vous acceptez les présentes conditions.</p>
          <p><strong>1. Compte utilisateur :</strong> Vous devez fournir des informations exactes lors de l'inscription.</p>
          <p><strong>2. Gains :</strong> Les gains sont calculés par vue validée. La fraude entraîne la suspension du compte.</p>
          <p><strong>3. Paiements :</strong> Les retraits sont soumis à un seuil minimum et à une vérification.</p>
        </div>
      </div>
    </main>
  )
}
