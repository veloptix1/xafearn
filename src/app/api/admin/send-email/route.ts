import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import nodemailer from 'nodemailer'

export const maxDuration = 60;

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
  connectionTimeout: 20000,
});

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Non connecté' }, { status: 401 })
    }

    // Vérification : admin par le rôle OU par le drapeau is_admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_admin')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'admin' && !profile.is_admin)) {
      return NextResponse.json({ error: 'Accès refusé. Rôle actuel : ' + (profile?.role || 'inconnu') }, { status: 403 })
    }

    const { emails, subject, message } = await req.json()
    if (!emails?.length || !subject || !message) {
      return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
    }

    let successCount = 0
    const errors: string[] = []

    for (const email of emails) {
      try {
        await transporter.sendMail({
          from: `"XAFEARN" <${process.env.GMAIL_USER}>`,
          to: email,
          subject: subject,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
              <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="color: #0ea5e9; margin: 0;">XAFEARN</h1>
              </div>
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 24px; border-radius: 16px;">
                <p style="font-size: 15px; line-height: 1.7; white-space: pre-wrap;">${message}</p>
              </div>
              <p style="font-size: 12px; color: #64748b; text-align: center; margin-top: 30px;">
                Cet email a été envoyé par l'équipe XAFEARN.
              </p>
            </div>
          `,
        })
        successCount++
        await new Promise(r => setTimeout(r, 500))
      } catch (err: any) {
        console.error(`Erreur envoi à ${email}:`, err.message)
        errors.push(`${email}: ${err.message}`)
      }
    }

    return NextResponse.json({ success: true, count: successCount, errors: errors.length > 0 ? errors : undefined })
  } catch (error: any) {
    console.error('Erreur globale:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
