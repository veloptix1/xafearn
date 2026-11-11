import { NextResponse } from 'next/server'
import { adminClient, hasWebhookSecret } from '@/lib/api-auth'
import { sendValidationEmail } from '@/lib/email/send'

// Webhook Supabase : table `ad_submissions`, événement UPDATE.
// Quand une preuve passe à « validated », l'utilisateur reçoit automatiquement son email « Diffusion validée ».
export async function POST(req: Request) {
  try {
    if (!hasWebhookSecret(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { type, record, old_record } = await req.json()
    if (type !== 'UPDATE' || record?.status !== 'validated' || old_record?.status === 'validated') {
      return NextResponse.json({ skipped: true })
    }

    const supabase = adminClient()
    const { data: auth } = await supabase.auth.admin.getUserById(record.user_id)
    const email = auth?.user?.email
    if (!email) return NextResponse.json({ skipped: 'no email' })

    const { data: prof } = await supabase.from('profiles').select('full_name, level').eq('id', record.user_id).single()
    const { data: camp } = await supabase.from('campaigns').select('custom_gain_per_view').eq('id', record.campaign_id).single()

    const views = Number(record.views_count) || 0
    // Même règle de gain que la validation par l'admin
    const perView = camp?.custom_gain_per_view || (prof?.level === 1 ? 0.5 : prof?.level === 2 ? 1.25 : 1.75)
    await sendValidationEmail(email, prof?.full_name || 'ami', views, Math.round(perView * views))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('webhook submission:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
