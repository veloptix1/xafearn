import Link from 'next/link'

export default function ConfidentialitePage() {
  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2">
          <img src="/logo.png" alt="XAFEARN" className="h-7 w-auto object-contain" />
        </Link>
        <Link href="/signup" className="text-sm font-semibold text-sky-500 hover:text-sky-600">
          Retour
        </Link>
      </header>

      <div className="max-w-3xl mx-auto p-6 md:p-10">
        <div className="mb-10">
          <h1 className="text-3xl font-black text-slate-900 mb-2">Politique de confidentialité</h1>
          <p className="text-sm text-slate-500">Dernière mise à jour : 4 novembre 2026</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 md:p-10 space-y-8">
          
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
              <span className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center text-sm">1</span>
              Introduction
            </h2>
            <p className="text-slate-600 leading-relaxed">
              Chez <strong>XAFEARN</strong>, la protection de vos données personnelles est une priorité absolue. Cette politique explique quelles données nous collectons, comment nous les utilisons, et quels sont vos droits. En utilisant notre plateforme, vous consentez à cette politique.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
              <span className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center text-sm">2</span>
              Données collectées
            </h2>
            <p className="text-slate-600 leading-relaxed mb-3">Nous collectons les informations suivantes :</p>
            <ul className="list-disc list-inside text-slate-600 space-y-2 ml-2">
              <li><strong>Identité</strong> : nom complet, email, numéro de téléphone, pays, ville, quartier.</li>
              <li><strong>Compte</strong> : mot de passe (chiffré), rôle (diffuseur / annonceur), niveau.</li>
              <li><strong>Financier</strong> : solde, historique des transactions, numéro Mobile Money.</li>
              <li><strong>Contenu</strong> : images et vidéos téléchargées, preuves de diffusion.</li>
              <li><strong>Technique</strong> : adresse IP, type d'appareil, navigateur, pages visitées.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
              <span className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center text-sm">3</span>
              Utilisation des données
            </h2>
            <p className="text-slate-600 leading-relaxed mb-3">Vos données sont utilisées pour :</p>
            <ul className="list-disc list-inside text-slate-600 space-y-2 ml-2">
              <li>Créer et gérer votre compte utilisateur.</li>
              <li>Traiter vos gains, retraits et paiements.</li>
              <li>Vérifier votre identité et prévenir les fraudes.</li>
              <li>Vous envoyer des notifications (nouvelles campagnes, validation, rappels).</li>
              <li>Améliorer nos services et personnaliser votre expérience.</li>
              <li>Respecter nos obligations légales et fiscales.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
              <span className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center text-sm">4</span>
              Partage des données
            </h2>
            <p className="text-slate-600 leading-relaxed mb-3">
              Nous ne vendons <strong>jamais</strong> vos données personnelles. Elles peuvent être partagées uniquement avec :
            </p>
            <ul className="list-disc list-inside text-slate-600 space-y-2 ml-2">
              <li><strong>Supabase</strong> : hébergement sécurisé de la base de données.</li>
              <li><strong>Opérateurs Mobile Money</strong> (Orange, MTN) : pour traiter vos retraits.</li>
              <li><strong>Autorités légales</strong> : uniquement en cas d'obligation légale.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
              <span className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center text-sm">5</span>
              Sécurité des données
            </h2>
            <p className="text-slate-600 leading-relaxed mb-3">
              Nous appliquons des mesures de sécurité de niveau bancaire :
            </p>
            <ul className="list-disc list-inside text-slate-600 space-y-2 ml-2">
              <li>Chiffrement SSL/TLS pour toutes les communications.</li>
              <li>Mots de passe hachés (bcrypt) et jamais stockés en clair.</li>
              <li>Authentification à deux facteurs (2FA) disponible.</li>
              <li>Accès restreint aux données personnelles (employés autorisés uniquement).</li>
              <li>Surveillance continue et détection des intrusions.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
              <span className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center text-sm">6</span>
              Durée de conservation
            </h2>
            <p className="text-slate-600 leading-relaxed">
              Vos données sont conservées pendant toute la durée de votre compte actif, puis pendant <strong>5 ans</strong> après sa suppression (obligations légales et fiscales). Les preuves de diffusion sont conservées <strong>1 an</strong>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
              <span className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center text-sm">7</span>
              Vos droits
            </h2>
            <p className="text-slate-600 leading-relaxed mb-3">Conformément aux lois sur la protection des données, vous avez le droit de :</p>
            <ul className="list-disc list-inside text-slate-600 space-y-2 ml-2">
              <li><strong>Accéder</strong> à toutes vos données personnelles.</li>
              <li><strong>Rectifier</strong> vos informations (depuis votre profil).</li>
              <li><strong>Supprimer</strong> votre compte et vos données.</li>
              <li><strong>Vous opposer</strong> au traitement de vos données.</li>
              <li><strong>Exporter</strong> vos données dans un format lisible.</li>
            </ul>
            <p className="text-slate-600 leading-relaxed mt-3">
              Pour exercer ces droits, contactez-nous à <a href="mailto:xafearn@gmail.com" className="text-sky-500 hover:underline">xafearn@gmail.com</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
              <span className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center text-sm">8</span>
              Cookies
            </h2>
            <p className="text-slate-600 leading-relaxed">
              XAFEARN utilise des cookies pour maintenir votre session connectée et améliorer votre expérience. Vous pouvez désactiver les cookies dans les paramètres de votre navigateur, mais certaines fonctionnalités pourraient ne plus fonctionner correctement.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
              <span className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center text-sm">9</span>
              Modifications
            </h2>
            <p className="text-slate-600 leading-relaxed">
              Nous pouvons mettre à jour cette politique à tout moment. En cas de changement majeur, nous vous notifierons par email ou via une notification sur la plateforme. La date de dernière mise à jour est indiquée en haut de cette page.
            </p>
          </section>

        </div>

        <div className="mt-8 text-center">
          <Link href="/conditions" className="text-sm text-sky-500 hover:underline font-medium">
            Voir aussi nos Conditions d'utilisation →
          </Link>
        </div>
      </div>
    </main>
  )
}
