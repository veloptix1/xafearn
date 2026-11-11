import { NextResponse } from 'next/server'
import { getRequestUser, adminClient } from '@/lib/api-auth'

// Crée un paiement LeekPay qui RECHARGE le solde FCFA de l'utilisateur connecté (site web ou app mobile).
export async function POST(req: Request) {
  try {
    const ctx = await getRequestUser(req)
    if (!ctx) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const amount = Math.round(Number(body.amount))
    if (!Number.isFinite(amount) || amount < 100) {
      return NextResponse.json({ error: 'Montant minimum 100 FCFA' }, { status: 400 })
    }
    if (amount > 5_000_000) {
      return NextResponse.json({ error: 'Montant maximum 5 000 000 FCFA' }, { status: 400 })
    }
    const description = String(body.description || 'Recharge XAFEARN').slice(0, 120)

    if (!process.env.LEEKPAY_SECRET_KEY) {
      return NextResponse.json({ error: 'Paiement indisponible pour le moment' }, { status: 503 })
    }

    const response = await fetch('https://leekpay.fr/api/v1/checkout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.LEEKPAY_SECRET_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount,
        currency: 'XOF',
        description,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
        customer_email: ctx.user.email,
        metadata: { user_id: ctx.user.id },
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      return NextResponse.json({ error: data.message || 'Erreur LeekPay' }, { status: 502 })
    }

    // Écrit avec la clé service : l'utilisateur ne peut pas fabriquer ses propres paiements
    const { error } = await adminClient().from('leekpay_payments').insert({
      user_id: ctx.user.id,
      checkout_id: data.data.id,
      amount,
      currency: 'XOF',
      status: 'pending',
      metadata: { description },
    })
    if (error) return NextResponse.json({ error: 'Enregistrement du paiement impossible' }, { status: 500 })

    return NextResponse.json({ success: true, payment_url: data.data.payment_url })
  } catch (error: any) {
    console.error('LeekPay create:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
