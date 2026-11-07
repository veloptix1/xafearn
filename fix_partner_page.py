file_path = "src/app/dashboard/partenaire/page.tsx"

with open(file_path, "r") as f:
    content = f.read()

# 1. Ajouter les nouveaux scopes
old_scopes = """const AVAILABLE_SCOPES = [
  { id: 'tasks:read', label: 'Lire les tâches', desc: 'Accéder au catalogue des tâches disponibles.' },
  { id: 'tasks:submit', label: 'Valider les tâches', desc: 'Permettre aux utilisateurs de soumettre leurs preuves.' },
  { id: 'series:read', label: 'Lire les séries', desc: 'Accéder au catalogue des séries et épisodes.' },
  { id: 'series:unlock', label: 'Débloquer des épisodes', desc: 'Permettre le déblocage d\\'épisodes payants.' },
  { id: 'users:sync', label: 'Synchroniser les utilisateurs', desc: 'Créer et mettre à jour les utilisateurs.' },
  { id: 'webhooks:receive', label: 'Recevoir des webhooks', desc: 'Recevoir des notifications automatiques.' },
]"""

new_scopes = """const AVAILABLE_SCOPES = [
  { id: 'tasks:read', label: 'Tâches (Lecture)', desc: 'Accéder au catalogue des tâches disponibles.' },
  { id: 'tasks:submit', label: 'Tâches (Soumission)', desc: 'Permettre aux utilisateurs de soumettre leurs preuves.' },
  { id: 'series:read', label: 'Séries (Lecture)', desc: 'Accéder au catalogue des séries et épisodes.' },
  { id: 'series:unlock', label: 'Séries (Déblocage)', desc: 'Permettre le déblocage d\\'épisodes payants.' },
  { id: 'users:sync', label: 'Utilisateurs (Sync)', desc: 'Créer et mettre à jour les utilisateurs.' },
  { id: 'webhooks:receive', label: 'Webhooks', desc: 'Recevoir des notifications automatiques.' },
  { id: 'wallet:read', label: 'Portefeuille (Lecture)', desc: 'Lire le solde et l\\'historique des transactions.' },
  { id: 'analytics:read', label: 'Analytics', desc: 'Récupérer les statistiques de vos campagnes.' },
]"""

if old_scopes in content:
    content = content.replace(old_scopes, new_scopes)
    print("✅ Nouveaux scopes ajoutés.")
else:
    print("⚠️ Scopes non trouvés, tentative de remplacement manuel...")

with open(file_path, "w") as f:
    f.write(content)

print("✅ Fichier mis à jour.")
