# Notifications push XAFEARN — mise en route (≈ 15 min)

Comment ça marche : une notification est créée dans Supabase (nouveau message, retrait validé, gain de coffre…)
→ Supabase appelle le site (webhook) → le site envoie la notification à Firebase → ton téléphone l'affiche.

## 1. Firebase (gratuit)
1. https://console.firebase.google.com → **Ajouter un projet** (ex. `xafearn`, Analytics inutile).
2. Dans le projet : **Ajouter une application → Android**. Nom du package : `com.xafearn.app`. Télécharge `google-services.json`.
3. Donne ce fichier à l'app, **au choix** :
   - le copier dans `android/app/google-services.json` puis le pousser sur GitHub ; ou
   - secret GitHub `GOOGLE_SERVICES_JSON` (dépôt → Settings → Secrets → Actions) contenant le fichier encodé :
     `base64 -w0 google-services.json` (dans Termux).
4. Firebase → ⚙️ **Paramètres du projet → Comptes de service → Générer une nouvelle clé privée** : un fichier JSON est téléchargé (garde-le secret, ne le mets jamais dans GitHub).

## 2. Vercel (le site)
Settings → Environment Variables, puis **Redeploy** :
| Nom | Valeur |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | tout le contenu du JSON de l'étape 1.4 |
| `WEBHOOK_SECRET` | un mot de passe long (déjà utilisé par le webhook des messages) |
| `SUPABASE_SECRET_KEY` | déjà présent |

## 3. Supabase
1. **SQL Editor** : exécuter `supabase/02_notifications_push.sql`.
2. **Database → Webhooks** (2 webhooks, méthode POST, en-tête `Authorization: Bearer <WEBHOOK_SECRET>`) :
   - table `messages`, événement INSERT → `https://TON-SITE/api/webhook-message` (probablement déjà créé)
   - table `notifications`, événement INSERT → `https://TON-SITE/api/push/notification`

## 4. Pousser le code
- **Site** (`xafearn`) : appliquer `xafearn-site-push.patch`, commit, push (Vercel redéploie seul).
- **App** (`xafearn-app`) : appliquer `xafearn-phase3-app.patch`, commit, push → le build APK se lance.

## 5. Tester
1. Installe le nouvel APK, connecte-toi, **accepte** la demande d'autorisation des notifications.
2. Supabase → Table Editor → `notifications` → *Insert row* avec ton `user_id`, un titre et un message.
   Ferme l'app : la notification doit arriver en quelques secondes.
3. Envoie-toi un message depuis un autre compte : notification « 💬 Nom ».

Ça ne marche pas ? Regarde dans Vercel → Logs (`/api/push/notification`) et vérifie que la table `device_tokens`
contient une ligne pour ton compte (sinon : permission refusée ou `google-services.json` absent du build).

## 6. Sécurité — à faire
- **Faire tourner les clés VAPID** : l'ancienne clé privée était écrite dans `send-push/route.ts` sur un dépôt public.
  `npx web-push generate-vapid-keys` → mettre `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` dans Vercel, remplacer la clé publique dans
  `src/hooks/usePushNotifications.ts`, puis supprimer les valeurs de secours dans `src/lib/push-server.ts`.
  (Les navigateurs abonnés devront accepter de nouveau les notifications.)
- La route `/api/send-push` n'est plus publique : elle exige maintenant `WEBHOOK_SECRET`.
- Comme chaque ligne de `notifications` devient une notification, vérifie dans Supabase (policies de la table) que les utilisateurs ne peuvent pas
  écrire des notifications pour **n'importe quel autre** compte.
