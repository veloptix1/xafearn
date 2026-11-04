import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

    const { amount, description } = await req.json()

    if (!amount || amount < 100) {
      return NextResponse.json({ error: 'Montant minimum 100 FCFA' }, { status: 400 })
    }

    // 1. Appel à l'API LeekPay pour créer le checkout
    const response = await fetch('https://leekpay.fr/api/v1/checkout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.LEEKPAY_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: amount,
        currency: 'XOF',
        description: description || 'Recharge XAFEARN',
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
        customer_email: user.email,
        metadata: { user_id: user.id }
      })
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('LeekPay Error:', data)
      return NextResponse.json({ error: data.message || 'Erreur LeekPay' }, { status: 500 })
    }

    // 2. Enregistrer le paiement en base
    await supabase.from('leekpay_payments').insert({
      user_id: user.id,
      checkout_id: data.data.id,
      amount: amount,
      currency: 'XOF',
      status: 'pending',
      metadata: { description }
    })

    return NextResponse.json({ success: true, payment_url: data.data.payment_url })
  } catch (error: any) {
    console.error('Erreur:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
