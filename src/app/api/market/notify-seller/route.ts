import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'

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
    const { product_id, buyer_id, contact_method } = await req.json()

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!
    )

    // Récupérer le produit et le vendeur
    const { data: product } = await supabaseAdmin
      .from('digital_products')
      .select('*, profiles:seller_id(full_name, email)')
      .eq('id', product_id)
      .single()

    if (!product || !product.profiles?.email) {
      return NextResponse.json({ error: 'Produit ou vendeur introuvable' }, { status: 404 })
    }

    // Récupérer l'acheteur
    const { data: buyer } = await supabaseAdmin
      .from('profiles')
      .select('full_name, email')
      .eq('id', buyer_id)
      .single()

    // Enregistrer le lead
    await supabaseAdmin.from('product_leads').insert({
      product_id,
      buyer_id,
      contact_method
    })

    // Envoyer l'email au vendeur
    await transporter.sendMail({
      from: `"XAFEARN Market" <${process.env.GMAIL_USER}>`,
      to: product.profiles.email,
      subject: `Nouveau contact pour : ${product.name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8fafc;">
          <div style="background: #0f172a; padding: 20px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 20px;">XAFEARN MARKET</h1>
          </div>
          <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0;">
            <h2 style="color: #0f172a; margin-top: 0;">Nouveau client intéressé</h2>
            <p style="color: #475569; line-height: 1.6;">Un utilisateur souhaite vous contacter pour votre produit : <strong>${product.name}</strong>.</p>
            
            <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #334155;"><strong>Client :</strong> ${buyer?.full_name || 'Anonyme'}</p>
              <p style="margin: 5px 0 0; color: #334155;"><strong>Email :</strong> ${buyer?.email || 'Non renseigné'}</p>
              <p style="margin: 5px 0 0; color: #334155;"><strong>Méthode :</strong> ${contact_method}</p>
            </div>

            <p style="color: #475569; line-height: 1.6;">Connectez-vous à votre tableau de bord Xafearn pour discuter avec ce client ou répondez directement à cet email.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://getagriculture.store'}/dashboard/messages" style="background: #0f172a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Voir mes messages</a>
            </div>
            
            <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 30px;">Cet email a été envoyé automatiquement par Xafearn Market.</p>
          </div>
        </div>
      `
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
