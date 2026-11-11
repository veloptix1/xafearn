import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'

export async function POST(req: Request) {
  try {
    // 🔒 Envoie de l'argent depuis le compte LeekPay : administrateurs uniquement
    const admin = await requireAdmin(req)
    if (!admin) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const { amount, phone, operator, name, withdrawalId } = await req.json()
    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) return NextResponse.json({ error: 'Montant invalide' }, { status: 400 })

    // Note : Vérifie dans la doc LeekPay si l'endpoint est bien "payout" ou "transfer"
    // Voici l'appel typique pour envoyer de l'argent
    const response = await fetch('https://leekpay.fr/api/v1/payout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.LEEKPAY_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: amount,
        currency: 'XOF',
        phone: phone,
        operator: operator,
        customer_name: name,
        reference: withdrawalId
      })
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('LeekPay Payout Error:', data)
      return NextResponse.json({ error: data.message || 'Erreur lors du transfert' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
