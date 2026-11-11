import { NextResponse } from 'next/server'
import { adminClient, hasWebhookSecret } from '@/lib/api-auth'
import { sendWelcomeEmail } from '@/lib/email/send'

// Webhook Supabase : table `profiles`, événement INSERT.
// Envoie AUTOMATIQUEMENT l'email de bienvenue (site web et app mobile), sans que le client ait à le demander.
export async function POST(req: Request) {
  try {
    if (!hasWebhookSecret(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { type, record } = await req.json()
    if (type && type !== 'INSERT') return NextResponse.json({ skipped: true })
    if (!record?.id) return NextResponse.json({ error: 'Invalid record' }, { status: 400 })

    const supabase = adminClient()
    const { data: auth } = await supabase.auth.admin.getUserById(record.id)
    const email = auth?.user?.email
    if (!email) return NextResponse.json({ skipped: 'no email' })

    const name = record.full_name || (auth.user?.user_metadata?.full_name as string) || 'ami'
    await sendWelcomeEmail(email, name)
    await supabase.from('profiles').update({ welcome_email_sent: true }).eq('id', record.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('webhook new-user:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
