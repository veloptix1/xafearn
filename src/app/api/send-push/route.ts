import { NextResponse } from 'next/server'
import * as webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

// ✅ Tes clés VAPID
const PUBLIC_VAPID_KEY = 'BGNN44c6l_PfBNVxnFI4WbHL3Hrw8UgGIOFCKEMwKnOlPwaVkehwE-NG2y-3V2-cHFmYGYUlOtRGzjkBloSeDIs'
const PRIVATE_VAPID_KEY = 'n82XH5DtB6_WJKw3SevDm5Up3uGPv3VVSrjfCJzvBVE'
const VAPID_EMAIL = 'mailto:admin@getagriculture.store'

webpush.setVapidDetails(VAPID_EMAIL, PUBLIC_VAPID_KEY, PRIVATE_VAPID_KEY)

export async function POST(req: Request) {
  try {
    const { receiverId, title, body, url } = await req.json()

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!
    )

    const { data: sub } = await supabaseAdmin
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', receiverId)
      .single()

    if (!sub) return NextResponse.json({ error: 'Pas d\'abonnement' }, { status: 404 })

    await webpush.sendNotification(sub.subscription, JSON.stringify({ title, body, url }))

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Erreur push:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
