'use client'

import Link from 'next/link'

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex items-center gap-4">
        <Link href="/dashboard/partenaire" className="text-slate-500 bg-slate-100 p-2 rounded-full">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-lg font-bold text-slate-900">Documentation API</h1>
      </header>

      <div className="p-4 max-w-4xl mx-auto mt-4 space-y-8">
        
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
          <h2 className="text-2xl font-black text-slate-900 mb-4">📖 Introduction</h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            L'API Xafearn vous permet d'intégrer nos services (tâches, séries, portefeuille) directement dans votre application. 
            Tous les appels se font via HTTPS avec votre clé API.
          </p>
          <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl">
            <p className="text-sm text-indigo-800 font-medium">
              <strong>Base URL :</strong> <code className="font-mono">https://getagriculture.store/api/v1</code>
            </p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
          <h2 className="text-xl font-black text-slate-900 mb-4">🔐 Authentification</h2>
          <p className="text-slate-600 text-sm mb-4">Chaque requête doit inclure votre clé API. Vous pouvez la passer de 2 façons :</p>
          
          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase mb-2">Méthode 1 : Paramètre URL</p>
              <code className="block bg-slate-900 text-emerald-400 p-3 rounded-xl text-xs font-mono">GET /api/v1/tasks?api_key=VOTRE_CLE</code>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase mb-2">Méthode 2 : Header (recommandé)</p>
              <code className="block bg-slate-900 text-emerald-400 p-3 rounded-xl text-xs font-mono">Authorization: Bearer VOTRE_CLE</code>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
          <h2 className="text-xl font-black text-slate-900 mb-4">📋 Endpoints disponibles</h2>
          
          <div className="space-y-6">
            <div className="border-l-4 border-blue-500 pl-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded">GET</span>
                <code className="font-mono text-sm font-bold text-slate-900">/tasks</code>
              </div>
              <p className="text-sm text-slate-600 mb-2">Retourne la liste des tâches actives.</p>
              <p className="text-xs text-slate-500"><strong>Scope requis :</strong> tasks:read • <strong>Coût :</strong> 1 crédit</p>
            </div>

            <div className="border-l-4 border-purple-500 pl-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded">GET</span>
                <code className="font-mono text-sm font-bold text-slate-900">/series</code>
              </div>
              <p className="text-sm text-slate-600 mb-2">Retourne le catalogue des séries.</p>
              <p className="text-xs text-slate-500"><strong>Scope requis :</strong> series:read • <strong>Coût :</strong> 1 crédit</p>
            </div>

            <div className="border-l-4 border-amber-500 pl-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-1 rounded">POST</span>
                <code className="font-mono text-sm font-bold text-slate-900">/tasks/submit</code>
              </div>
              <p className="text-sm text-slate-600 mb-2">Soumettre une preuve de tâche.</p>
              <p className="text-xs text-slate-500"><strong>Scope requis :</strong> tasks:submit • <strong>Coût :</strong> 2 crédits</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
          <h2 className="text-xl font-black text-slate-900 mb-4">📝 Exemple complet (JavaScript)</h2>
          <pre className="bg-slate-900 text-emerald-400 p-4 rounded-xl text-xs font-mono overflow-x-auto">
{`// Récupérer les tâches
const response = await fetch('https://getagriculture.store/api/v1/tasks', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer VOTRE_CLE_API'
  }
});

const data = await response.json();
console.log(data.tasks);`}
          </pre>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6">
          <h3 className="font-bold text-amber-900 mb-2">⚠️ Codes d'erreur</h3>
          <ul className="text-sm text-amber-800 space-y-1">
            <li><strong>401</strong> : Clé API invalide ou manquante.</li>
            <li><strong>402</strong> : Crédits insuffisants.</li>
            <li><strong>403</strong> : Scope manquant.</li>
            <li><strong>429</strong> : Trop de requêtes (Rate Limit).</li>
          </ul>
        </div>
      </div>
    </main>
  )
}
