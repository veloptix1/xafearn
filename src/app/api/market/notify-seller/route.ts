import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { getRequestUser, adminClient, escapeHtml } from '@/lib/api-auth'

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
})

export async function POST(req: Request) {
  try {
    // 🔒 L'acheteur est TOUJOURS l'utilisateur connecté (on ne fait plus confiance à un buyer_id envoyé par le client)
    const ctx = await getRequestUser(req)
    if (!ctx) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

    const { product_id, contact_method } = await req.json()
    if (!product_id) return NextResponse.json({ error: 'Produit manquant' }, { status: 400 })
    const method = String(contact_method || '').slice(0, 30)

    const supabaseAdmin = adminClient()

    const { data: product } = await supabaseAdmin
      .from('digital_products')
      .select('*, profiles:seller_id(full_name, email)')
      .eq('id', product_id)
      .single()

    if (!product || !product.profiles?.email) {
      return NextResponse.json({ error: 'Produit ou vendeur introuvable' }, { status: 404 })
    }
    if (product.seller_id === ctx.user.id) {
      return NextResponse.json({ error: "C'est ton propre produit" }, { status: 400 })
    }

    // Anti-spam : un seul contact par produit et par acheteur toutes les 24 h
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
    const { data: recent } = await supabaseAdmin
      .from('product_leads')
      .select('id')
      .eq('product_id', product_id)
      .eq('buyer_id', ctx.user.id)
      .gte('created_at', since)
      .limit(1)
    if (recent && recent.length > 0) return NextResponse.json({ success: true, duplicate: true })

    const { data: buyer } = await supabaseAdmin.from('profiles').select('full_name, email').eq('id', ctx.user.id).single()

    await supabaseAdmin.from('product_leads').insert({ product_id, buyer_id: ctx.user.id, contact_method: method })

    const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://getagriculture.store'
    await transporter.sendMail({
      from: `"XAFEARN Market" <${process.env.GMAIL_USER}>`,
      to: product.profiles.email,
      subject: `Nouveau contact pour : ${String(product.name).replace(/[\r\n]/g, ' ')}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8fafc;">
          <div style="background: #0f172a; padding: 20px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 20px;">XAFEARN MARKET</h1>
          </div>
          <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0;">
            <h2 style="color: #0f172a; margin-top: 0;">Nouveau client intéressé</h2>
            <p style="color: #475569; line-height: 1.6;">Un utilisateur souhaite vous contacter pour votre produit : <strong>${escapeHtml(product.name)}</strong>.</p>
            <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #334155;"><strong>Client :</strong> ${escapeHtml(buyer?.full_name || 'Anonyme')}</p>
              <p style="margin: 5px 0 0; color: #334155;"><strong>Email :</strong> ${escapeHtml(buyer?.email || 'Non renseigné')}</p>
              <p style="margin: 5px 0 0; color: #334155;"><strong>Méthode :</strong> ${escapeHtml(method)}</p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${siteUrl}/dashboard/messages" style="background: #0f172a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Ouvrir mes messages</a>
            </div>
            <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 30px;">Cet email a été envoyé automatiquement par Xafearn Market.</p>
          </div>
        </div>`,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('notify-seller:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
