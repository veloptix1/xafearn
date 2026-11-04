import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

    const { title, description, image_url, price, sector, country, city, neighborhood, whatsapp, views, budget, is_flash, expires_at, payment_method } = await req.json()

    // 1. Récupérer le profil pour vérifier le solde
    const { data: profile } = await supabase.from('profiles').select('balance').eq('id', user.id).single()
    if (!profile) return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 })

    // 2. Si paiement par solde interne, vérifier et déduire
    if (payment_method === 'balance') {
      if ((profile.balance || 0) < budget) {
        return NextResponse.json({ error: 'Solde insuffisant. Veuillez recharger votre compte.' }, { status: 400 })
      }
      await supabase.from('profiles').update({ balance: profile.balance - budget }).eq('id', user.id)
    }

    // 3. Créer la campagne
    const { data: campaign, error } = await supabase.from('campaigns').insert({
      user_id: user.id,
      title,
      description,
      image_url,
      price,
      activity_sector: sector,
      target_country: country,
      target_city: city,
      target_neighborhood: neighborhood,
      whatsapp_number: whatsapp,
      views_purchased: views,
      budget,
      duration_days: 7,
      status: 'pending',
      is_flash: is_flash || false,
      expires_at: expires_at || null
    }).select().single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, campaign })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
