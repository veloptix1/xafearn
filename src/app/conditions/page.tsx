import Link from 'next/link'

export default function ConditionsPage() {
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
          <h1 className="text-3xl font-black text-slate-900 mb-2">Conditions d'utilisation</h1>
          <p className="text-sm text-slate-500">Dernière mise à jour : 4 novembre 2026</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 md:p-10 space-y-8">
          
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
              <span className="w-8 h-8 bg-sky-100 text-sky-600 rounded-lg flex items-center justify-center text-sm">1</span>
              Acceptation des conditions
            </h2>
            <p className="text-slate-600 leading-relaxed">
              En créant un compte sur <strong>XAFEARN</strong>, vous acceptez sans réserve les présentes conditions d'utilisation. Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser la plateforme. XAFEARN se réserve le droit de modifier ces conditions à tout moment, avec notification préalable.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
              <span className="w-8 h-8 bg-sky-100 text-sky-600 rounded-lg flex items-center justify-center text-sm">2</span>
              Description du service
            </h2>
            <p className="text-slate-600 leading-relaxed mb-3">
              XAFEARN est une plateforme de mise en relation entre <strong>annonceurs</strong> et <strong>diffuseurs</strong> :
            </p>
            <ul className="list-disc list-inside text-slate-600 space-y-2 ml-2">
              <li>Les annonceurs créent des campagnes publicitaires et paient pour un nombre de vues.</li>
              <li>Les diffuseurs publient ces annonces sur leurs statuts WhatsApp et gagnent de l'argent par vue validée.</li>
              <li>La plateforme prélève une commission sur chaque transaction.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
              <span className="w-8 h-8 bg-sky-100 text-sky-600 rounded-lg flex items-center justify-center text-sm">3</span>
              Inscription et compte
            </h2>
            <p className="text-slate-600 leading-relaxed mb-3">
              Pour utiliser XAFEARN, vous devez :
            </p>
            <ul className="list-disc list-inside text-slate-600 space-y-2 ml-2">
              <li>Être âgé d'au moins 18 ans.</li>
              <li>Fournir des informations exactes et à jour (nom, email, numéro de téléphone).</li>
              <li>Maintenir la confidentialité de vos identifiants.</li>
              <li>Ne créer qu'un seul compte par personne.</li>
            </ul>
            <p className="text-slate-600 leading-relaxed mt-3">
              Toute tentative de création de comptes multiples entraînera la suspension définitive.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
              <span className="w-8 h-8 bg-sky-100 text-sky-600 rounded-lg flex items-center justify-center text-sm">4</span>
              Règles de diffusion
            </h2>
            <p className="text-slate-600 leading-relaxed mb-3">Les diffuseurs s'engagent à :</p>
            <ul className="list-disc list-inside text-slate-600 space-y-2 ml-2">
              <li>Publier le texte et l'image <strong>sans aucune modification</strong> (lien, image, texte).</li>
              <li>Ne pas utiliser de bots, faux comptes ou outils automatisés.</li>
              <li>Fournir des preuves authentiques (vidéo, QR code).</li>
              <li>Ne pas partager le lien de tracking sur des groupes non autorisés.</li>
            </ul>
            <div className="bg-red-50 border border-red-100 p-4 rounded-xl mt-4">
              <p className="text-red-700 text-sm font-medium">
                ⚠️ Toute fraude entraîne l'annulation des gains et la suspension du compte sans préavis.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
              <span className="w-8 h-8 bg-sky-100 text-sky-600 rounded-lg flex items-center justify-center text-sm">5</span>
              Gains et paiements
            </h2>
            <ul className="list-disc list-inside text-slate-600 space-y-2 ml-2">
              <li>Le gain par vue varie selon le niveau du diffuseur (0,50 F à 1,75 F).</li>
              <li>Les gains sont validés manuellement par l'équipe XAFEARN sous 24 à 48h.</li>
              <li>Le retrait minimum est de 1 000 FCFA.</li>
              <li>Les retraits sont effectués via Mobile Money (Orange, MTN) sous 72h.</li>
              <li>Les gains non réclamés pendant 12 mois sont perdus.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
              <span className="w-8 h-8 bg-sky-100 text-sky-600 rounded-lg flex items-center justify-center text-sm">6</span>
              Contenu interdit
            </h2>
            <p className="text-slate-600 leading-relaxed mb-3">Il est interdit de diffuser des annonces concernant :</p>
            <ul className="list-disc list-inside text-slate-600 space-y-2 ml-2">
              <li>La pornographie ou contenus adultes.</li>
              <li>Les produits illégaux (drogues, armes, contrefaçons).</li>
              <li>Les arnaques, pyramides de Ponzi ou faux investissements.</li>
              <li>La propagande politique ou religieuse extrémiste.</li>
              <li>Tout contenu discriminatoire, haineux ou violent.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
              <span className="w-8 h-8 bg-sky-100 text-sky-600 rounded-lg flex items-center justify-center text-sm">7</span>
              Responsabilité
            </h2>
            <p className="text-slate-600 leading-relaxed">
              XAFEARN agit comme <strong>intermédiaire</strong> entre annonceurs et diffuseurs. Nous ne sommes pas responsables de la qualité des produits ou services proposés par les annonceurs. En cas de litige commercial, celui-ci doit être réglé directement entre les parties concernées.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
              <span className="w-8 h-8 bg-sky-100 text-sky-600 rounded-lg flex items-center justify-center text-sm">8</span>
              Suspension et résiliation
            </h2>
            <p className="text-slate-600 leading-relaxed">
              XAFEARN se réserve le droit de suspendre ou résilier tout compte en cas de violation des présentes conditions, sans préavis ni remboursement des sommes déjà versées. L'utilisateur peut supprimer son compte à tout moment depuis son profil.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
              <span className="w-8 h-8 bg-sky-100 text-sky-600 rounded-lg flex items-center justify-center text-sm">9</span>
              Contact
            </h2>
            <p className="text-slate-600 leading-relaxed">
              Pour toute question relative à ces conditions, contactez-nous à <a href="mailto:xafearn@gmail.com" className="text-sky-500 hover:underline">xafearn@gmail.com</a>.
            </p>
          </section>

        </div>

        <div className="mt-8 text-center">
          <Link href="/confidentialite" className="text-sm text-sky-500 hover:underline font-medium">
            Voir aussi notre Politique de confidentialité →
          </Link>
        </div>
      </div>
    </main>
  )
}
