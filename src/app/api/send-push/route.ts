import { NextResponse } from 'next/server'
import { sendPushToUser, isAuthorized } from '@/lib/push-server'

// Route interne : appelée uniquement par nos propres webhooks (secret obligatoire).
// Avant, n'importe qui pouvait envoyer une notification à n'importe quel utilisateur.
export async function POST(req: Request) {
  try {
    if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { receiverId, title, body, url, appUrl } = await req.json()
    if (!receiverId || !title) return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })

    const result = await sendPushToUser(receiverId, { title, body: body ?? '', url, appUrl })
    if (result.web === 0 && result.android === 0) return NextResponse.json({ error: "Pas d'abonnement" }, { status: 404 })

    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    console.error('Erreur push:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
