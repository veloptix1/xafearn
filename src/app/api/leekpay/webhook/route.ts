import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    // On initialise Supabase UNIQUEMENT quand la requête arrive
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('Variables manquantes au runtime')
      return new NextResponse('Configuration manquante', { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const rawBody = await req.text()
    const signature = req.headers.get('x-leekpay-signature')
    
    const expectedSignature = crypto
      .createHmac('sha256', process.env.LEEKPAY_PUBLIC_KEY || '')
      .update(rawBody)
      .digest('hex')

    if (!signature || signature !== expectedSignature) {
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
      return new NextResponse('Missing data', { status: 400 })
    }

    const { data: payment } = await supabase
      .from('leekpay_payments')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('checkout_id', checkoutId)
      .select()
      .single()

    if (!payment) {
      return new NextResponse('Payment not found', { status: 404 })
    }

    const { data: profile } = await supabase.from('profiles').select('balance').eq('id', userId).single()
    
    if (profile) {
      await supabase.from('profiles').update({
        balance: (profile.balance || 0) + amount
      }).eq('id', userId)

      await supabase.from('notifications').insert({
        user_id: userId,
        title: 'Recharge réussie 💰',
        message: `Ton compte a été rechargé de ${amount.toLocaleString('fr-FR')} FCFA.`,
        link: '/dashboard/annonceur/analytics'
      })
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Erreur webhook:', error)
    return new NextResponse('Erreur interne', { status: 500 })
  }
}
