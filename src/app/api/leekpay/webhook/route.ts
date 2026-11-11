import { NextResponse } from 'next/server'
import { adminClient, isLeekPayAuthentic } from '@/lib/api-auth'

// ⚠️ Configuration LeekPay : URL du webhook = https://TON-SITE/api/leekpay/webhook?token=<LEEKPAY_WEBHOOK_SECRET>
// (ou signature HMAC dans l'en-tête x-leekpay-signature si LeekPay la propose).
export async function POST(req: Request) {
  try {
    const raw = await req.text()

    if (!process.env.LEEKPAY_WEBHOOK_SECRET) {
      console.error('LEEKPAY_WEBHOOK_SECRET manquant : webhook refusé')
      return new NextResponse('Webhook non configuré', { status: 503 })
    }
    if (!isLeekPayAuthentic(req, raw)) return new NextResponse('Non autorisé', { status: 401 })

    const { event, data } = JSON.parse(raw)
    if (event !== 'payment.completed') return NextResponse.json({ received: true })

    const checkoutId = String(data?.checkout_id ?? data?.id ?? '')
    if (!checkoutId) return new NextResponse('checkout_id manquant', { status: 400 })

    const supabase = adminClient()

    // On ne crédite que ce que NOUS avons enregistré à la création du paiement
    // (utilisateur et montant viennent de notre base, jamais du contenu reçu).
    const { data: pay } = await supabase
      .from('leekpay_payments')
      .select('user_id, amount, status')
      .eq('checkout_id', checkoutId)
      .maybeSingle()

    if (!pay) return new NextResponse('Paiement inconnu', { status: 404 })
    if (pay.status !== 'pending') return NextResponse.json({ received: true, already: true })

    if (typeof data?.amount === 'number' && data.amount < Number(pay.amount)) {
      console.error('Montant payé inférieur au montant attendu', checkoutId)
      return new NextResponse('Montant incohérent', { status: 400 })
    }

    const { error } = await supabase.rpc('handle_leekpay_payment', {
      p_checkout_id: checkoutId,
      p_amount: pay.amount,
      p_user_id: pay.user_id,
    })
    if (error) {
      console.error('handle_leekpay_payment:', error)
      return new NextResponse('Erreur interne', { status: 500 })
    }

    await supabase.from('leekpay_payments').update({ status: 'completed' }).eq('checkout_id', checkoutId).eq('status', 'pending')

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('LeekPay webhook:', error)
    return new NextResponse('Erreur interne', { status: 500 })
  }
}
