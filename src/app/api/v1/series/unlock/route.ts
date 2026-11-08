import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const { episode_id, external_user_id } = await req.json()
    const apiKey = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!apiKey) return NextResponse.json({ error: 'Clé API manquante' }, { status: 401 })

    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!)
    const { data: keyData } = await supabaseAdmin.from('api_keys').select('*').eq('api_key', apiKey).eq('is_active', true).single()
    
    if (!keyData) return NextResponse.json({ error: 'Clé API invalide' }, { status: 401 })
    if (!keyData.scopes.includes('series:unlock')) return NextResponse.json({ error: 'Scope manquant : series:unlock' }, { status: 403 })
    if (keyData.credits < 1) return NextResponse.json({ error: 'Crédits insuffisants' }, { status: 402 })

    // Logique de déblocage (à adapter)
    await supabaseAdmin.from('episode_unlocks').insert({ episode_id, user_id: external_user_id })

    await supabaseAdmin.from('api_keys').update({ credits: keyData.credits - 1, last_used_at: new Date().toISOString() }).eq('id', keyData.id)
    await supabaseAdmin.from('api_logs').insert({ api_key_id: keyData.id, endpoint: '/api/v1/series/unlock', cost: 1, status_code: 200 })

    return NextResponse.json({ success: true, message: 'Épisode débloqué' })
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }) }
}
