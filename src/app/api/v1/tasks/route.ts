import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const apiKey = searchParams.get('api_key')

    if (!apiKey) return NextResponse.json({ error: 'Clé API manquante' }, { status: 401 })

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!
    )

    // 1. Vérifier la clé API
    const { data: keyData, error: keyError } = await supabaseAdmin
      .from('api_keys')
      .select('*')
      .eq('api_key', apiKey)
      .eq('is_active', true)
      .single()

    if (keyError || !keyData) return NextResponse.json({ error: 'Clé API invalide' }, { status: 401 })

    // 2. Vérifier le scope
    if (!keyData.scopes.includes('tasks:read')) {
      return NextResponse.json({ error: 'Scope manquant : tasks:read' }, { status: 403 })
    }

    // 3. Vérifier les crédits (1 crédit par appel)
    if (keyData.credits < 1) {
      return NextResponse.json({ error: 'Crédits insuffisants' }, { status: 402 })
    }

    // 4. Récupérer les tâches
    const { data: tasks } = await supabaseAdmin
      .from('tasks')
      .select('id, title, description, reward, type, image_url')
      .eq('status', 'active')
      .limit(20)

    // 5. Déduire 1 crédit
    await supabaseAdmin.from('api_keys').update({ credits: keyData.credits - 1, last_used_at: new Date().toISOString() }).eq('id', keyData.id)

    // 6. Logger l'appel
    await supabaseAdmin.from('api_logs').insert({
      api_key_id: keyData.id,
      endpoint: '/api/v1/tasks',
      cost: 1,
      status_code: 200
    })

    return NextResponse.json({ success: true, tasks: tasks || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
