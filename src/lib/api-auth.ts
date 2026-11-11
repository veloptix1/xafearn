import { createClient as createSupabaseClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createHmac, timingSafeEqual } from 'node:crypto'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

/** Client « super-utilisateur » (clé service) : à n'utiliser que côté serveur, après avoir vérifié l'appelant. */
export function adminClient(): SupabaseClient {
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('Clé service Supabase absente')
  return createSupabaseClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export type RequestUser = { user: User; supabase: SupabaseClient }

/**
 * Identifie l'appelant :
 *  - app mobile  → en-tête « Authorization: Bearer <jeton de session Supabase> »
 *  - site web    → cookies de session
 * Le client retourné agit avec les droits de l'utilisateur (la RLS s'applique).
 */
export async function getRequestUser(req: Request): Promise<RequestUser | null> {
  const header = req.headers.get('authorization')
  if (header && /^bearer /i.test(header)) {
    const token = header.slice(7).trim()
    if (!token) return null
    const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data.user) return null
    return { user: data.user, supabase }
  }
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user ? { user, supabase: supabase as unknown as SupabaseClient } : null
}

export async function requireAdmin(req: Request): Promise<RequestUser | null> {
  const ctx = await getRequestUser(req)
  if (!ctx) return null
  const { data } = await ctx.supabase.from('profiles').select('role, is_admin').eq('id', ctx.user.id).single()
  if (!data || (data.role !== 'admin' && !data.is_admin)) return null
  return ctx
}

export function safeEqual(a: string, b: string) {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  return ba.length === bb.length && timingSafeEqual(ba, bb)
}

/** Webhooks Supabase : « Authorization: Bearer <WEBHOOK_SECRET> » obligatoire. */
export function hasWebhookSecret(req: Request) {
  const secret = process.env.WEBHOOK_SECRET
  const header = req.headers.get('authorization') || ''
  return !!secret && safeEqual(header, `Bearer ${secret}`)
}

/** Webhook LeekPay : signature HMAC-SHA256 du corps (en-tête x-leekpay-signature) ou ?token=<secret>. */
export function isLeekPayAuthentic(req: Request, rawBody: string) {
  const secret = process.env.LEEKPAY_WEBHOOK_SECRET
  if (!secret) return false // on refuse tout tant que le secret n'est pas configuré
  const sig = req.headers.get('x-leekpay-signature')
  if (sig) {
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
    return safeEqual(sig.replace(/^sha256=/i, ''), expected)
  }
  const token = new URL(req.url).searchParams.get('token') || ''
  return safeEqual(token, secret)
}

export function escapeHtml(value: unknown) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}
