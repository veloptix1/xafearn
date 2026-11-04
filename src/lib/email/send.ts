import nodemailer from 'nodemailer';

// Configuration stricte pour Vercel (Port 465 + SSL)
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
  connectionTimeout: 10000, // 10 secondes max
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://xafearn-weld.vercel.app';

export async function sendWelcomeEmail(email: string, name: string) {
  try {
    const info = await transporter.sendMail({
      from: `"XAFERAN" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Bienvenue sur XAFERAN ! 🚀',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #0f172a;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="${APP_URL}/logo.png" alt="XAFERAN" style="height: 40px;" />
          </div>
          <h1 style="color: #0ea5e9;">Bienvenue ${name} !</h1>
          <p>Nous sommes ravis de t'accueillir sur <strong>XAFERAN</strong>, le réseau social qui transforme tes statuts WhatsApp en source de revenus.</p>
          <ul style="line-height: 1.8;">
            <li>💰 Gagne de l'argent à chaque vue sur tes statuts.</li>
            <li>🚀 Progresse et débloque des campagnes mieux rémunérées.</li>
            <li>👥 Crée ton équipe et deviens Expert.</li>
          </ul>
          <div style="text-align: center; margin: 40px 0;">
            <a href="${APP_URL}/dashboard" style="background-color: #0ea5e9; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold;">
              Accéder à mon tableau de bord
            </a>
          </div>
          <p style="font-size: 12px; color: #64748b; text-align: center; margin-top: 40px;">
            L'équipe XAFERAN
          </p>
        </div>
      `,
    });
    console.log('Email de bienvenue envoyé:', info.messageId);
    return { success: true };
  } catch (err) {
    console.error('ERREUR ENVOI EMAIL BIENVENUE:', err);
    return { success: false, error: err };
  }
}

export async function sendValidationEmail(email: string, name: string, views: number, gain: number) {
  try {
    const info = await transporter.sendMail({
      from: `"XAFERAN" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: '✅ Ta diffusion a été validée et payée !',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #0f172a;">
          <h1 style="color: #10b981;">Félicitations ${name} !</h1>
          <p>Ta preuve de diffusion a été vérifiée et validée par notre équipe.</p>
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>Vues vérifiées :</strong> ${views}</p>
            <p style="margin: 0;"><strong>Gains crédités :</strong> ${gain.toFixed(2)} FCFA</p>
          </div>
          <p>Ces gains ont été ajoutés à ton solde XAFERAN. Tu peux les retirer dès maintenant.</p>
          <div style="text-align: center; margin: 40px 0;">
            <a href="${APP_URL}/dashboard" style="background-color: #0ea5e9; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold;">
              Voir mon solde
            </a>
          </div>
        </div>
      `,
    });
    console.log('Email de validation envoyé:', info.messageId);
    return { success: true };
  } catch (err) {
    console.error('ERREUR ENVOI EMAIL VALIDATION:', err);
    return { success: false, error: err };
  }
}
