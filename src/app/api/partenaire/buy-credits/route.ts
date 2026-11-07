import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const { amount_fcfa, api_key } = await req.json()
    
    if (!amount_fcfa || amount_fcfa < 500) {
      return NextResponse.json({ error: 'Montant minimum : 500 FCFA' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!
    )

    // Vérifier la clé API
    const { data: keyData } = await supabaseAdmin.from('api_keys').select('id, partner_id').eq('api_key', api_key).single()
    if (!keyData) return NextResponse.json({ error: 'Clé API invalide' }, { status: 401 })

    // 1 crédit = 10 FCFA (à ajuster selon ton business model)
    const creditsToAdd = Math.floor(amount_fcfa / 10)

    // Créer la commande LeekPay
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://getagriculture.store'}/api/leekpay/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: amount_fcfa,
        description: `Achat de ${creditsToAdd} crédits API XAFEARN`
      })
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data.error)

    // Enregistrer la demande
    await supabaseAdmin.from('api_credit_purchases').insert({
      partner_id: keyData.partner_id,
      amount_fcfa,
      credits_added: creditsToAdd,
      payment_method: 'mobile_money',
      status: 'pending'
    })

    return NextResponse.json({ success: true, payment_url: data.payment_url, credits: creditsToAdd })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
