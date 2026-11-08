'use client'

import { useState } from 'react'
import Link from 'next/link'

const LANGUAGES = [
  { id: 'curl', label: 'cURL', icon: '💻' },
  { id: 'js', label: 'JavaScript', icon: '🟨' },
  { id: 'python', label: 'Python', icon: '🐍' },
  { id: 'php', label: 'PHP', icon: '🐘' },
  { id: 'dart', label: 'Flutter', icon: '🎯' },
]

const ENDPOINTS = [
  { id: 'tasks', method: 'GET', path: '/tasks', title: 'Lister les tâches', desc: 'Récupère la liste des tâches actives disponibles.', scope: 'tasks:read', cost: 1 },
  { id: 'submit', method: 'POST', path: '/tasks/submit', title: 'Soumettre une tâche', desc: 'Permet à un utilisateur de soumettre sa preuve.', scope: 'tasks:submit', cost: 2 },
  { id: 'series', method: 'GET', path: '/series', title: 'Lister les séries', desc: 'Récupère le catalogue des séries publiées.', scope: 'series:read', cost: 1 },
  { id: 'unlock', method: 'POST', path: '/series/unlock', title: 'Débloquer un épisode', desc: 'Débloque un épisode payant pour un utilisateur.', scope: 'series:unlock', cost: 1 },
  { id: 'wallet', method: 'GET', path: '/wallet', title: 'Voir le portefeuille', desc: 'Récupère les soldes des utilisateurs synchronisés.', scope: 'wallet:read', cost: 1 },
  { id: 'analytics', method: 'GET', path: '/analytics', title: 'Statistiques', desc: 'Récupère les statistiques de votre compte.', scope: 'analytics:read', cost: 1 },
]

export default function DocsPage() {
  const [lang, setLang] = useState('curl')
  const [activeEndpoint, setActiveEndpoint] = useState('tasks')

  const currentEndpoint = ENDPOINTS.find(e => e.id === activeEndpoint) || ENDPOINTS[0]

  const codeExamples: any = {
    tasks: {
      curl: `curl -X GET "https://getagriculture.store/api/v1/tasks" \\
  -H "Authorization: Bearer VOTRE_CLE_API"`,
      js: `const response = await fetch('https://getagriculture.store/api/v1/tasks', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer VOTRE_CLE_API'
  }
});

const data = await response.json();
console.log(data.tasks);`,
      python: `import requests

response = requests.get(
    'https://getagriculture.store/api/v1/tasks',
    headers={'Authorization': 'Bearer VOTRE_CLE_API'}
)

data = response.json()
print(data['tasks'])`,
      php: `<?php
$ch = curl_init('https://getagriculture.store/api/v1/tasks');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer VOTRE_CLE_API'
]);

$response = curl_exec($ch);
$data = json_decode($response, true);
print_r($data['tasks']);
curl_close($ch);`,
      dart: `import 'package:http/http.dart' as http;
import 'dart:convert';

Future<void> getTasks() async {
  final response = await http.get(
    Uri.parse('https://getagriculture.store/api/v1/tasks'),
    headers: {'Authorization': 'Bearer VOTRE_CLE_API'},
  );

  final data = jsonDecode(response.body);
  print(data['tasks']);
}`
    },
    submit: {
      curl: `curl -X POST "https://getagriculture.store/api/v1/tasks/submit" \\
  -H "Authorization: Bearer VOTRE_CLE_API" \\
  -H "Content-Type: application/json" \\
  -d '{
    "task_id": "uuid-de-la-tache",
    "external_user_id": "user_123",
    "proof_url": "https://exemple.com/preuve.jpg"
  }'`,
      js: `const response = await fetch('https://getagriculture.store/api/v1/tasks/submit', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer VOTRE_CLE_API',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    task_id: 'uuid-de-la-tache',
    external_user_id: 'user_123',
    proof_url: 'https://exemple.com/preuve.jpg'
  })
});

const data = await response.json();
console.log(data);`,
      python: `import requests

response = requests.post(
    'https://getagriculture.store/api/v1/tasks/submit',
    headers={'Authorization': 'Bearer VOTRE_CLE_API'},
    json={
        'task_id': 'uuid-de-la-tache',
        'external_user_id': 'user_123',
        'proof_url': 'https://exemple.com/preuve.jpg'
    }
)

print(response.json())`,
      php: `<?php
$payload = json_encode([
    'task_id' => 'uuid-de-la-tache',
    'external_user_id' => 'user_123',
    'proof_url' => 'https://exemple.com/preuve.jpg'
]);

$ch = curl_init('https://getagriculture.store/api/v1/tasks/submit');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer VOTRE_CLE_API',
    'Content-Type: application/json'
]);

echo curl_exec($ch);
curl_close($ch);`,
      dart: `import 'package:http/http.dart' as http;
import 'dart:convert';

Future<void> submitTask() async {
  final response = await http.post(
    Uri.parse('https://getagriculture.store/api/v1/tasks/submit'),
    headers: {
      'Authorization': 'Bearer VOTRE_CLE_API',
      'Content-Type': 'application/json'
    },
    body: jsonEncode({
      'task_id': 'uuid-de-la-tache',
      'external_user_id': 'user_123',
      'proof_url': 'https://exemple.com/preuve.jpg'
    }),
  );

  print(jsonDecode(response.body));
}`
    },
    series: {
      curl: `curl -X GET "https://getagriculture.store/api/v1/series" \\
  -H "Authorization: Bearer VOTRE_CLE_API"`,
      js: `const response = await fetch('https://getagriculture.store/api/v1/series', {
  headers: { 'Authorization': 'Bearer VOTRE_CLE_API' }
});
const data = await response.json();
console.log(data.series);`,
      python: `import requests
response = requests.get('https://getagriculture.store/api/v1/series', headers={'Authorization': 'Bearer VOTRE_CLE_API'})
print(response.json()['series'])`,
      php: `<?php
$ch = curl_init('https://getagriculture.store/api/v1/series');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Bearer VOTRE_CLE_API']);
$data = json_decode(curl_exec($ch), true);
print_r($data['series']);`,
      dart: `import 'package:http/http.dart' as http;
import 'dart:convert';

final response = await http.get(
  Uri.parse('https://getagriculture.store/api/v1/series'),
  headers: {'Authorization': 'Bearer VOTRE_CLE_API'},
);
print(jsonDecode(response.body)['series']);`
    },
    unlock: {
      curl: `curl -X POST "https://getagriculture.store/api/v1/series/unlock" \\
  -H "Authorization: Bearer VOTRE_CLE_API" \\
  -H "Content-Type: application/json" \\
  -d '{
    "episode_id": "uuid-episode",
    "external_user_id": "user_123"
  }'`,
      js: `await fetch('https://getagriculture.store/api/v1/series/unlock', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer VOTRE_CLE_API',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    episode_id: 'uuid-episode',
    external_user_id: 'user_123'
  })
});`,
      python: `import requests
requests.post(
    'https://getagriculture.store/api/v1/series/unlock',
    headers={'Authorization': 'Bearer VOTRE_CLE_API'},
    json={'episode_id': 'uuid-episode', 'external_user_id': 'user_123'}
)`,
      php: `<?php
$ch = curl_init('https://getagriculture.store/api/v1/series/unlock');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['episode_id' => 'uuid-episode', 'external_user_id' => 'user_123']));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Bearer VOTRE_CLE_API', 'Content-Type: application/json']);
curl_exec($ch);`,
      dart: `await http.post(
  Uri.parse('https://getagriculture.store/api/v1/series/unlock'),
  headers: {'Authorization': 'Bearer VOTRE_CLE_API', 'Content-Type': 'application/json'},
  body: jsonEncode({'episode_id': 'uuid-episode', 'external_user_id': 'user_123'}),
);`
    },
    wallet: {
      curl: `curl -X GET "https://getagriculture.store/api/v1/wallet" \\
  -H "Authorization: Bearer VOTRE_CLE_API"`,
      js: `const res = await fetch('https://getagriculture.store/api/v1/wallet', {
  headers: { 'Authorization': 'Bearer VOTRE_CLE_API' }
});
console.log((await res.json()).wallet);`,
      python: `import requests
print(requests.get('https://getagriculture.store/api/v1/wallet', headers={'Authorization': 'Bearer VOTRE_CLE_API'}).json()['wallet'])`,
      php: `<?php
$ch = curl_init('https://getagriculture.store/api/v1/wallet');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Bearer VOTRE_CLE_API']);
print_r(json_decode(curl_exec($ch), true)['wallet']);`,
      dart: `final res = await http.get(Uri.parse('https://getagriculture.store/api/v1/wallet'), headers: {'Authorization': 'Bearer VOTRE_CLE_API'});
print(jsonDecode(res.body)['wallet']);`
    },
    analytics: {
      curl: `curl -X GET "https://getagriculture.store/api/v1/analytics" \\
  -H "Authorization: Bearer VOTRE_CLE_API"`,
      js: `const res = await fetch('https://getagriculture.store/api/v1/analytics', {
  headers: { 'Authorization': 'Bearer VOTRE_CLE_API' }
});
console.log((await res.json()).analytics);`,
      python: `import requests
print(requests.get('https://getagriculture.store/api/v1/analytics', headers={'Authorization': 'Bearer VOTRE_CLE_API'}).json()['analytics'])`,
      php: `<?php
$ch = curl_init('https://getagriculture.store/api/v1/analytics');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Bearer VOTRE_CLE_API']);
print_r(json_decode(curl_exec($ch), true)['analytics']);`,
      dart: `final res = await http.get(Uri.parse('https://getagriculture.store/api/v1/analytics'), headers: {'Authorization': 'Bearer VOTRE_CLE_API'});
print(jsonDecode(res.body)['analytics']);`
    }
  }

  const currentCode = codeExamples[activeEndpoint]?.[lang] || ''

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex items-center gap-4">
        <Link href="/dashboard/partenaire" className="text-slate-500 bg-slate-100 p-2 rounded-full">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Documentation API</h1>
          <p className="text-xs text-slate-500">Guide complet pour les développeurs</p>
        </div>
      </header>

      <div className="p-4 max-w-6xl mx-auto mt-4 grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Sidebar de navigation */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-900 text-sm mb-3 uppercase tracking-wider">Endpoints</h3>
            <div className="space-y-1">
              {ENDPOINTS.map(ep => (
                <button
                  key={ep.id}
                  onClick={() => setActiveEndpoint(ep.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${activeEndpoint === ep.id ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <span className={`inline-block w-10 text-[10px] font-bold mr-2 ${ep.method === 'GET' ? 'text-emerald-600' : 'text-amber-600'}`}>{ep.method}</span>
                  {ep.title}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-900 text-sm mb-3 uppercase tracking-wider">Langages</h3>
            <div className="grid grid-cols-2 gap-2">
              {LANGUAGES.map(l => (
                <button key={l.id} onClick={() => setLang(l.id)} className={`px-2 py-2 rounded-lg text-xs font-bold transition ${lang === l.id ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-600'}`}>
                  {l.icon} {l.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <h3 className="font-bold text-amber-900 text-sm mb-2">⚠️ Base URL</h3>
            <code className="text-[10px] font-mono text-amber-800 break-all">https://getagriculture.store/api/v1</code>
          </div>
        </div>

        {/* Contenu principal */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Section Introduction */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
            <h2 className="text-xl font-black text-slate-900 mb-3">🚀 Introduction</h2>
            <p className="text-slate-600 text-sm leading-relaxed mb-4">
              L'API Xafearn vous permet d'intégrer nos services directement dans votre application. Que vous ayez un site web, une application mobile ou un bot, vous pouvez offrir à vos utilisateurs des tâches rémunérées ou des séries sans quitter votre plateforme.
            </p>
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
              <p className="text-xs font-bold text-slate-700 mb-2">🔑 Authentification</p>
              <p className="text-xs text-slate-600">Chaque requête doit inclure votre clé API dans le header <code className="bg-slate-200 px-1 rounded">Authorization: Bearer VOTRE_CLE</code></p>
            </div>
          </div>

          {/* Endpoint actif */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs font-bold px-2 py-1 rounded ${currentEndpoint.method === 'GET' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {currentEndpoint.method}
                  </span>
                  <code className="text-sm font-mono font-bold text-slate-900">{currentEndpoint.path}</code>
                </div>
                <h3 className="text-lg font-black text-slate-900">{currentEndpoint.title}</h3>
                <p className="text-sm text-slate-600 mt-1">{currentEndpoint.desc}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Scope requis</p>
                <code className="text-xs font-bold text-indigo-600">{currentEndpoint.scope}</code>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Coût</p>
                <p className="text-xs font-bold text-slate-900">{currentEndpoint.cost} crédit(s)</p>
              </div>
            </div>

            {/* Bloc de code */}
            <div className="bg-slate-900 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
                <span className="text-xs font-bold text-slate-400">Exemple {LANGUAGES.find(l => l.id === lang)?.label}</span>
                <button onClick={() => { navigator.clipboard.writeText(currentCode); alert('Code copié !') }} className="text-xs text-slate-400 hover:text-white font-bold">📋 Copier</button>
              </div>
              <pre className="p-4 overflow-x-auto">
                <code className="text-xs font-mono text-emerald-400 whitespace-pre">{currentCode}</code>
              </pre>
            </div>
          </div>

          {/* Réponses */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-900 mb-4">📥 Format de la réponse</h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold text-emerald-600 mb-1">✅ Succès (200 OK)</p>
                <pre className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-mono text-slate-700 overflow-x-auto">
{`{
  "success": true,
  ${activeEndpoint === 'tasks' ? '"tasks": [ { "id": "uuid", "title": "...", "reward": 50 } ]' : ''}
  ${activeEndpoint === 'series' ? '"series": [ { "id": "uuid", "title": "..." } ]' : ''}
  ${activeEndpoint === 'wallet' ? '"wallet": [ { "external_user_id": "user_1", "balance": 5000 } ]' : ''}
  ${activeEndpoint === 'analytics' ? '"analytics": { "total_users": 10, "total_api_calls": 50 }' : ''}
  ${activeEndpoint === 'submit' || activeEndpoint === 'unlock' ? '"message": "Action réussie"' : ''}
}`}
                </pre>
              </div>

              <div>
                <p className="text-xs font-bold text-red-600 mb-1">❌ Erreur (4xx)</p>
                <pre className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-mono text-slate-700 overflow-x-auto">
{`{
  "error": "Description de l'erreur"
}`}
                </pre>
              </div>
            </div>
          </div>

          {/* Codes d'erreur */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-900 mb-4">🚨 Codes HTTP</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm border-b border-slate-100 pb-2">
                <span className="font-bold text-emerald-600">200 OK</span>
                <span className="text-slate-600">Requête réussie</span>
              </div>
              <div className="flex justify-between text-sm border-b border-slate-100 pb-2">
                <span className="font-bold text-red-600">401 Unauthorized</span>
                <span className="text-slate-600">Clé API invalide ou manquante</span>
              </div>
              <div className="flex justify-between text-sm border-b border-slate-100 pb-2">
                <span className="font-bold text-orange-600">402 Payment Required</span>
                <span className="text-slate-600">Crédits insuffisants</span>
              </div>
              <div className="flex justify-between text-sm border-b border-slate-100 pb-2">
                <span className="font-bold text-amber-600">403 Forbidden</span>
                <span className="text-slate-600">Scope manquant</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-bold text-slate-600">404 Not Found</span>
                <span className="text-slate-600">Endpoint inexistant</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </main>
  )
}
