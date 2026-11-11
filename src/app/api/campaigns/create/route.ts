import { NextResponse } from 'next/server'
import { getRequestUser } from '@/lib/api-auth'

// Création d'une campagne payée avec le solde. Tout (prix, solde, validité) est recalculé et vérifié
// dans la base par la fonction create_campaign : le client ne peut plus déclarer « paid: true »
// ni choisir son propre budget.
export async function POST(req: Request) {
  try {
    const ctx = await getRequestUser(req)
    if (!ctx) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

    const b = await req.json().catch(() => ({}))
    if (b.payment_method && b.payment_method !== 'balance') {
      return NextResponse.json({ error: 'Recharge ton solde puis crée ta campagne avec ton solde.' }, { status: 400 })
    }

    const { data, error } = await ctx.supabase.rpc('create_campaign', {
      p_title: b.title,
      p_description: b.description,
      p_image_url: b.image_url ?? null,
      p_price: Number(b.price) || 0,
      p_sector: b.sector ?? null,
      p_country: b.country ?? null,
      p_city: b.city ?? null,
      p_neighborhood: b.neighborhood ?? null,
      p_whatsapp: b.whatsapp ?? null,
      p_views: Math.round(Number(b.views)) || 0,
      p_is_flash: !!b.is_flash,
    })

    if (error) return NextResponse.json({ error: 'Création impossible' }, { status: 500 })
    if (!data?.success) return NextResponse.json({ error: data?.error || 'Création refusée' }, { status: 400 })
    return NextResponse.json(data)
  } catch (error) {
    console.error('campaigns/create:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
