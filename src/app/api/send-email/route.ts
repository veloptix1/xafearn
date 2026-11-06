import { NextResponse } from 'next/server'
import { sendBulkEmail } from '@/lib/email/send'
import nodemailer from 'nodemailer'

export async function POST(req: Request) {
  try {
    const { to, subject, message, users } = await req.json()

    if (!subject || !message) {
      return NextResponse.json({ error: 'Sujet et message requis.' }, { status: 400 })
    }

    // Envoi à tous les utilisateurs
    if (to === 'all' && users && users.length > 0) {
      const sent = await sendBulkEmail(users, subject, message)
      return NextResponse.json({ success: true, sent, failed: users.length - sent })
    }

    // Envoi à un seul utilisateur
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    })

    await transporter.sendMail({
      from: `"XAFEARN" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      text: message,
      html: `<div style="font-family: Arial; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8fafc;">
        <div style="background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          <div style="background: #0ea5e9; padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">XAFEARN</h1>
          </div>
          <div style="padding: 30px; color: #334155; white-space: pre-wrap; line-height: 1.6;">${message}</div>
          <div style="background: #f1f5f9; padding: 20px; text-align: center;">
            <p style="margin: 0; font-size: 12px; color: #64748b;">© 2026 XAFEARN</p>
          </div>
        </div>
      </div>`,
    })

    return NextResponse.json({ success: true, sent: 1 })
  } catch (err: any) {
    console.error('Erreur send-email:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
