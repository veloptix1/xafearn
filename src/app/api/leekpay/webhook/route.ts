import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const body = await req.json()
    const { event, data } = body

    if (event !== 'payment.completed') {
      return NextResponse.json({ received: true })
    }

    await supabase.rpc('handle_leekpay_payment', {
      p_checkout_id: data.checkout_id,
      p_amount: data.amount,
      p_user_id: data.metadata?.user_id
    })

    return NextResponse.json({ received: true })
  } catch (error: any) {
    return new NextResponse('Erreur interne', { status: 500 })
  }
}
