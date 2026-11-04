import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendBulkEmail } from '@/lib/email/send'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user?.id).single()
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    const { emails, subject, message } = await req.json()

    if (!emails || emails.length === 0 || !subject || !message) {
      return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
    }

    const count = await sendBulkEmail(emails, subject, message)
    return NextResponse.json({ success: true, count })
  } catch (error: any) {
    console.error('Erreur envoi email admin:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
