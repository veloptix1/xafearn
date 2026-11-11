import { NextResponse } from 'next/server'
import { getRequestUser } from '@/lib/api-auth'

// Fine couche au-dessus de la fonction claim_treasure (la vérification du code et la distribution
// des gains se font dans la base, de façon atomique). Fonctionne pour le site (cookies) et l'app (jeton).
export async function POST(req: Request) {
  try {
    const ctx = await getRequestUser(req)
    if (!ctx) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

    const { treasure_id, code } = await req.json()
    if (!treasure_id || !code) return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })

    const { data, error } = await ctx.supabase.rpc('claim_treasure', { p_treasure_id: treasure_id, p_code: String(code) })
    if (error) return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    if (!data?.success) return NextResponse.json({ error: data?.error || 'Refusé' }, { status: 400 })
    return NextResponse.json(data)
  } catch (error) {
    console.error('treasures/claim:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
