import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

// On utilise la clé service_role pour bypasser les RLS dans le webhook
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const rawBody = await req.text()
    const signature = req.headers.get('x-leekpay-signature')
    
    // 1. Vérifier la signature (Sécurité)
    const expectedSignature = crypto
      .createHmac('sha256', process.env.LEEKPAY_PUBLIC_KEY!)
      .update(rawBody)
      .digest('hex')

    if (!signature || signature !== expectedSignature) {
      console.error('Signature invalide')
      return new NextResponse('Invalid signature', { status: 401 })
    }

    const body = JSON.parse(rawBody)
    const { event, data } = body

    if (event !== 'payment.completed') {
      return NextResponse.json({ received: true })
    }

    const checkoutId = data.checkout_id
    const amount = data.amount
    const userId = data.metadata?.user_id

    if (!checkoutId || !userId) {
      console.error('Données manquantes:', data)
      return new NextResponse('Missing data', { status: 400 })
    }

    // 2. Mettre à jour le statut du paiement
    const { data: payment } = await supabase
      .from('leekpay_payments')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('checkout_id', checkoutId)
      .select()
      .single()

    if (!payment) {
      console.error('Paiement introuvable:', checkoutId)
      return new NextResponse('Payment not found', { status: 404 })
    }

    // 3. Créditer le solde de l'utilisateur (Recharge annonceur)
    const { data: profile } = await supabase.from('profiles').select('balance').eq('id', userId).single()
    
    if (profile) {
      await supabase.from('profiles').update({
        balance: (profile.balance || 0) + amount
      }).eq('id', userId)

      // 4. Créer une notification
      await supabase.from('notifications').insert({
        user_id: userId,
        title: 'Recharge réussie 💰',
        message: `Ton compte a été rechargé de ${amount.toLocaleString('fr-FR')} FCFA. Tu peux maintenant lancer tes campagnes.`,
        link: '/dashboard/annonceur/analytics'
      })
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Erreur webhook:', error)
    return new NextResponse('Erreur interne', { status: 500 })
  }
}
