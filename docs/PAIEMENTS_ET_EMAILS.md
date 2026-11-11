# Paiements configurables, emails automatiques et sécurité — mise en route

## 1. Supabase (SQL Editor) — dans cet ordre
1. `supabase/03_paiements_campagnes.sql` (paiements configurables + création sécurisée des campagnes).
   (`01` et `02` doivent déjà avoir été lancés.)

## 2. Variables à ajouter dans Vercel (Settings → Environment Variables), puis « Redeploy »
| Nom | À quoi ça sert |
|---|---|
| `LEEKPAY_WEBHOOK_SECRET` | mot de passe long inventé par toi : protège la réception des paiements |
| `WEBHOOK_SECRET` | déjà utilisé pour les messages ; sert aussi aux webhooks ci-dessous |
| `SUPABASE_SECRET_KEY` | clé « service » Supabase (déjà présente) |
| `LEEKPAY_SECRET_KEY` | clé LeekPay (déjà présente) |
| `GMAIL_USER`, `GMAIL_APP_PASSWORD` | envoi des emails (déjà présents) |
| `NEXT_PUBLIC_APP_URL` | `https://getagriculture.store` |

## 3. LeekPay
Dans ton espace LeekPay, adresse du webhook :
`https://getagriculture.store/api/leekpay/webhook?token=<LEEKPAY_WEBHOOK_SECRET>`
Sans ce secret, les paiements ne sont plus crédités (volontaire : avant, n'importe qui pouvait se créditer de l'argent).

## 4. Webhooks Supabase (Database → Webhooks), méthode POST, en-tête `Authorization: Bearer <WEBHOOK_SECRET>`
| Table | Événement | Adresse | Effet |
|---|---|---|---|
| `profiles` | INSERT | `https://getagriculture.store/api/webhooks/new-user` | email de bienvenue automatique |
| `ad_submissions` | UPDATE | `https://getagriculture.store/api/webhooks/submission` | email « Diffusion validée » |
| `notifications` | INSERT | `https://getagriculture.store/api/push/notification` | notification sur le téléphone |
| `messages` | INSERT | `https://getagriculture.store/api/webhook-message` | notification de message (déjà en place) |

## 5. Changer le lien de paiement
Dans l'app : **Admin → Paiements**. Tu y choisis le fournisseur, actives/désactives LeekPay et SoleasPay, et colles ton lien SoleasPay (https obligatoire).
Les boutons de paiement des pages **Acheter des jetons, Activation Premium et Créer une annonce** s'adaptent aussitôt.

## Comment fonctionne le paiement
- **Mon solde** : paiement immédiat, calculé et vérifié par la base de données.
- **LeekPay** : recharge ton solde du montant manquant, puis tu valides avec « Mon solde » (le solde se met à jour au retour dans l'app).
- **SoleasPay** : ouvre ton lien ; tu valides le paiement à la main.

## Ce qui a été verrouillé
- `/api/leekpay/webhook` : secret obligatoire + vérification dans ta base (utilisateur et montant ne viennent plus du message reçu).
- `/api/leekpay/payout` : réservé aux admins (avant : n'importe qui pouvait déclencher un virement).
- `/api/send-email` : réservé aux admins (avant : n'importe qui pouvait envoyer des emails au nom de XAFEARN).
- `/api/send-welcome`, `/api/send-push` : réservés au serveur.
- `/api/market/notify-seller` : utilisateur connecté obligatoire, acheteur déduit de la session, 1 contact / produit / 24 h.
- `/api/campaigns/create` : le prix est recalculé par la base (avant : un budget négatif ou « paid: true » suffisait).
- Textes injectés dans les emails : échappés (plus d'injection HTML).
