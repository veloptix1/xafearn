import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { amount, phone, operator, name, withdrawalId } = await req.json()

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
