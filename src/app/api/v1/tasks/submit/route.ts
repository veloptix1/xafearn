import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const { task_id, external_user_id, proof_url } = await req.json()
    const apiKey = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!apiKey) return NextResponse.json({ error: 'Clé API manquante' }, { status: 401 })

    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!)
    const { data: keyData } = await supabaseAdmin.from('api_keys').select('*').eq('api_key', apiKey).eq('is_active', true).single()
    
    if (!keyData) return NextResponse.json({ error: 'Clé API invalide' }, { status: 401 })
    if (!keyData.scopes.includes('tasks:submit')) return NextResponse.json({ error: 'Scope manquant : tasks:submit' }, { status: 403 })
    if (keyData.credits < 2) return NextResponse.json({ error: 'Crédits insuffisants (2 requis)' }, { status: 402 })

    // Enregistrer la soumission (tu peux adapter selon ta logique)
    const { error: insertError } = await supabaseAdmin.from('task_submissions').insert({
      task_id, user_id: external_user_id, status: 'pending', proof_screenshot_url: proof_url
    })

    if (insertError) throw insertError

    await supabaseAdmin.from('api_keys').update({ credits: keyData.credits - 2, last_used_at: new Date().toISOString() }).eq('id', keyData.id)
    await supabaseAdmin.from('api_logs').insert({ api_key_id: keyData.id, endpoint: '/api/v1/tasks/submit', cost: 2, status_code: 200 })

    return NextResponse.json({ success: true, message: 'Tâche soumise avec succès' })
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }) }
}
