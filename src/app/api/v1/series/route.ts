import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const apiKey = searchParams.get('api_key') || req.headers.get('authorization')?.replace('Bearer ', '')
    if (!apiKey) return NextResponse.json({ error: 'Clé API manquante' }, { status: 401 })

    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!)
    const { data: keyData } = await supabaseAdmin.from('api_keys').select('*').eq('api_key', apiKey).eq('is_active', true).single()
    
    if (!keyData) return NextResponse.json({ error: 'Clé API invalide' }, { status: 401 })
    if (!keyData.scopes.includes('series:read')) return NextResponse.json({ error: 'Scope manquant : series:read' }, { status: 403 })
    if (keyData.credits < 1) return NextResponse.json({ error: 'Crédits insuffisants' }, { status: 402 })

    const { data: series } = await supabaseAdmin.from('series').select('id, title, description, cover_url, category, content_type').eq('is_published', true).limit(20)
    
    await supabaseAdmin.from('api_keys').update({ credits: keyData.credits - 1, last_used_at: new Date().toISOString() }).eq('id', keyData.id)
    await supabaseAdmin.from('api_logs').insert({ api_key_id: keyData.id, endpoint: '/api/v1/series', cost: 1, status_code: 200 })

    return NextResponse.json({ success: true, series: series || [] })
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }) }
}
