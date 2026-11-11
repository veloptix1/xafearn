import * as webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'
import { getApps, initializeApp, cert } from 'firebase-admin/app'
import { getMessaging } from 'firebase-admin/messaging'

export type PushPayload = {
  title: string
  body: string
  /** Lien ouvert dans le navigateur (notification web) */
  url?: string
  /** Lien ouvert dans l'app Android (les écrans y sont différents : pas de /messages/[id]) */
  appUrl?: string
}

// ⚠️ Les clés VAPID doivent venir de l'environnement (Vercel > Settings > Environment Variables).
// Les valeurs ci-dessous ne sont qu'un secours temporaire : l'ancienne clé privée a été publiée
// dans le dépôt GitHub public, donc à faire tourner (voir docs/NOTIFICATIONS_PUSH.md).
const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || 'BGNN44c6l_PfBNVxnFI4WbHL3Hrw8UgGIOFCKEMwKnOlPwaVkehwE-NG2y-3V2-cHFmYGYUlOtRGzjkBloSeDIs'
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || 'n82XH5DtB6_WJKw3SevDm5Up3uGPv3VVSrjfCJzvBVE'
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@getagriculture.store'

let vapidReady = false
function ensureVapid() {
  if (vapidReady) return
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)
  vapidReady = true
}

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!)
}

function fcm() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!raw) return null
  if (!getApps().length) initializeApp({ credential: cert(JSON.parse(raw)) })
  return getMessaging()
}

const DEAD_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
])

/** Envoie une notification à tous les appareils d'un utilisateur : navigateur (web push) + app Android (FCM). */
export async function sendPushToUser(userId: string, payload: PushPayload) {
  const supabase = admin()
  const result = { web: 0, android: 0 }

  // 1) Navigateur
  const { data: sub } = await supabase.from('push_subscriptions').select('subscription').eq('user_id', userId).maybeSingle()
  if (sub?.subscription) {
    try {
      ensureVapid()
      await webpush.sendNotification(sub.subscription, JSON.stringify({ title: payload.title, body: payload.body, url: payload.url ?? payload.appUrl }))
      result.web = 1
    } catch (e) {
      console.error('Web push échoué:', e)
    }
  }

  // 2) App Android (FCM)
  const messaging = fcm()
  if (messaging) {
    const { data: rows } = await supabase.from('device_tokens').select('token').eq('user_id', userId)
    const tokens = (rows ?? []).map((r) => r.token as string)
    if (tokens.length > 0) {
      const res = await messaging.sendEachForMulticast({
        tokens,
        notification: { title: payload.title, body: payload.body },
        data: { url: payload.appUrl ?? payload.url ?? '/dashboard' },
        android: {
          priority: 'high',
          notification: { channelId: 'default', icon: 'ic_notification', color: '#0284c7' },
        },
      })
      result.android = res.successCount
      const dead = tokens.filter((_, i) => {
        const code = res.responses[i]?.error?.code
        return code ? DEAD_TOKEN_CODES.has(code) : false
      })
      if (dead.length > 0) await supabase.from('device_tokens').delete().in('token', dead)
    }
  }

  return result
}

/** Vérifie l'en-tête « Authorization: Bearer <WEBHOOK_SECRET> » envoyé par les webhooks Supabase. */
export function isAuthorized(req: Request) {
  const secret = process.env.WEBHOOK_SECRET
  return !!secret && req.headers.get('authorization') === `Bearer ${secret}`
}
