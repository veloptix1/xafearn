import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { createClient } from '@/lib/supabase/server'

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    // Vérifier que c'est un admin
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user?.id).single()
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    const { emails, subject, message } = await req.json()

    if (!emails || emails.length === 0 || !subject || !message) {
      return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
    }

    // Envoi en série (pour éviter de surcharger Gmail)
    for (const email of emails) {
      await transporter.sendMail({
        from: `"XAFERAN Admin" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: subject,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #0f172a;">
            <div style="text-align: center; margin-bottom: 20px;">
              <img src="https://xafearn-weld.vercel.app/logo.png" alt="XAFERAN" style="height: 40px;" />
            </div>
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 24px; border-radius: 16px;">
              <p style="font-size: 15px; line-height: 1.7; white-space: pre-wrap;">${message}</p>
            </div>
            <p style="font-size: 12px; color: #64748b; text-align: center; margin-top: 30px;">
              Cet email a été envoyé par l'équipe XAFERAN.
            </p>
          </div>
        `,
      })
    }

    return NextResponse.json({ success: true, count: emails.length })
  } catch (error: any) {
    console.error('Erreur envoi email admin:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
