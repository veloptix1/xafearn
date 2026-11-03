import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://xafearn-weld.vercel.app';

export async function sendWelcomeEmail(email: string, name: string) {
  try {
    await transporter.sendMail({
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
        </div>
      `,
    });
    return { success: true };
  } catch (err) {
    console.error('Erreur welcome email:', err);
    return { success: false, error: err };
  }
}

export async function sendValidationEmail(email: string, name: string, views: number, gain: number) {
  try {
    await transporter.sendMail({
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
    return { success: true };
  } catch (err) {
    console.error('Erreur validation email:', err);
    return { success: false, error: err };
  }
}

export async function sendReminderEmail(email: string, name: string) {
  try {
    await transporter.sendMail({
      from: `"XAFERAN" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: '⏰ N\'oublie pas de vérifier ton statut !',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #0f172a;">
          <h1 style="color: #f59e0b;">Salut ${name},</h1>
          <p>Tu as publié une annonce sur ton statut WhatsApp il y a 24h. N'oublie pas d'envoyer ta preuve pour valider tes gains !</p>
          <div style="text-align: center; margin: 40px 0;">
            <a href="${APP_URL}/dashboard/annonces" style="background-color: #0ea5e9; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold;">
              Envoyer ma preuve
            </a>
          </div>
          <p style="font-size: 12px; color: #64748b;">Si tu as déjà envoyé ta preuve, ignore cet email.</p>
        </div>
      `,
    });
    return { success: true };
  } catch (err) {
    console.error('Erreur reminder email:', err);
    return { success: false, error: err };
  }
}
