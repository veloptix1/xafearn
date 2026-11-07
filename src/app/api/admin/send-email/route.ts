import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendBulkEmail } from '@/lib/email/send'

export async function POST(req: Request) {
  try {
    // 🔒 1. Vérifier la session
    const authHeader = req.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const token = authHeader.replace('Bearer ', '')
    
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!
    )

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Session invalide' }, { status: 401 })

    // 🔒 2. Vérifier que c'est bien un admin
    const { data: prof } = await supabaseAdmin.from('profiles').select('role, is_admin').eq('id', user.id).single()
    if (!prof || (prof.role !== 'admin' && !prof.is_admin)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // 📧 3. Récupérer les données
    const { subject, message, recipients } = await req.json()

    if (!subject || !message || !recipients || recipients.length === 0) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
    }

    if (recipients.length > 100) {
      return NextResponse.json({ error: 'Limite de 100 emails par envoi' }, { status: 400 })
    }

    // 🚀 4. Envoyer via la fonction existante sendBulkEmail
    const successCount = await sendBulkEmail(recipients, subject, message)

    return NextResponse.json({ 
      success: true, 
      sent: successCount, 
      total: recipients.length,
      failed: recipients.length - successCount
    })
  } catch (error: any) {
    console.error('Erreur API email:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
