import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(req: Request) {
  try {
    const { to, subject, message, users } = await req.json()

    if (!subject || !message) {
      return NextResponse.json({ error: 'Sujet et message requis.' }, { status: 400 })
    }

    // 🚀 UTILISE TES VARIABLES EXACTES
    const gmailUser = process.env.GMAIL_USER
    const gmailPassword = process.env.GMAIL_APP_PASSWORD

    if (!gmailUser || !gmailPassword) {
      return NextResponse.json({ error: 'Configuration email manquante sur le serveur.' }, { status: 500 })
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPassword,
      },
    })

    // Envoi à tous
    if (to === 'all' && users && users.length > 0) {
      const results = await Promise.allSettled(
        users.map((email: string) =>
          transporter.sendMail({
            from: `"XAFEARN" <${gmailUser}>`,
            to: email,
            subject,
            text: message,
            html: `<div style="font-family: Arial; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #0ea5e9;">XAFEARN</h2>
              <div style="white-space: pre-wrap; color: #334155; line-height: 1.6;">${message}</div>
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #e2e8f0;" />
              <p style="color: #94a3b8; font-size: 12px;">L'équipe XAFEARN</p>
            </div>`,
          })
        )
      )

      const sent = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length

      return NextResponse.json({ success: true, sent, failed })
    }

    // Envoi à un seul
    await transporter.sendMail({
      from: `"XAFEARN" <${gmailUser}>`,
      to,
      subject,
      text: message,
      html: `<div style="font-family: Arial; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #0ea5e9;">XAFEARN</h2>
        <div style="white-space: pre-wrap; color: #334155; line-height: 1.6;">${message}</div>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e2e8f0;" />
        <p style="color: #94a3b8; font-size: 12px;">L'équipe XAFEARN</p>
      </div>`,
    })

    return NextResponse.json({ success: true, sent: 1 })
  } catch (err: any) {
    console.error('Erreur:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
