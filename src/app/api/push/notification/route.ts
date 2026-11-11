import { NextResponse } from 'next/server'
import { sendPushToUser, isAuthorized } from '@/lib/push-server'

// Webhook Supabase : chaque nouvelle ligne de la table `notifications` devient une notification
// sur le téléphone (retrait validé, preuve acceptée, gain de coffre, commentaire...).
// Supabase > Database > Webhooks > table notifications, événement INSERT, méthode POST,
// en-tête  Authorization: Bearer <WEBHOOK_SECRET>
export async function POST(req: Request) {
  try {
    if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { record } = await req.json()
    if (!record?.user_id) return NextResponse.json({ error: 'Invalid record' }, { status: 400 })

    const link = typeof record.link === 'string' && record.link.startsWith('/') ? record.link : '/dashboard'
    const result = await sendPushToUser(record.user_id, {
      title: record.title || 'XAFEARN',
      body: record.message || '',
      url: link,
      appUrl: link,
    })
    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    console.error('Erreur webhook notifications:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
