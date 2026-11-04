import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://xafearn-weld.vercel.app';

// Template HTML de base (léger, sans image, pour éviter le spam)
const wrapTemplate = (title: string, content: string, color: string = '#0ea5e9') => `
  <div style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 30px 15px;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
      
      <div style="background-color: ${color}; padding: 24px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800;">${title}</h1>
      </div>
      
      <div style="padding: 30px 24px; color: #334155; font-size: 15px; line-height: 1.6;">
        ${content}
      </div>
      
      <div style="background-color: #f1f5f9; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0; font-size: 12px; color: #64748b;">Cet email a été envoyé par XAFEARN.</p>
        <p style="margin: 5px 0 0; font-size: 12px; color: #64748b;"><a href="${APP_URL}" style="color: #0ea5e9; text-decoration: none;">xafearn-weld.vercel.app</a></p>
      </div>
      
    </div>
  </div>
`;

export async function sendWelcomeEmail(email: string, name: string) {
  const content = `
    <h2 style="color: #0f172a; margin-top: 0;">Bienvenue ${name} !</h2>
    <p>Nous sommes ravis de t'accueillir sur <strong>XAFEARN</strong>.</p>
    <p>Transforme tes statuts WhatsApp en source de revenus dès aujourd'hui.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${APP_URL}/dashboard" style="background-color: #0ea5e9; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Accéder à mon compte</a>
    </div>
    <p style="font-size: 13px; color: #64748b;">Si tu as des questions, réponds directement à cet email.</p>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"XAFEARN" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Bienvenue sur XAFEARN 🚀',
      html: wrapTemplate('Bienvenue !', content, '#0ea5e9'),
    });
    return { success: true, info };
  } catch (error: any) {
    console.error('Erreur welcome:', error.message);
    return { success: false, error: error.message };
  }
}

export async function sendValidationEmail(email: string, name: string, views: number, gain: number) {
  const content = `
    <h2 style="color: #0f172a; margin-top: 0;">Félicitations ${name} !</h2>
    <p>Ta preuve de diffusion a été vérifiée et validée.</p>
    <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
      <p style="margin: 5px 0;"><strong>Vues vérifiées :</strong> ${views}</p>
      <p style="margin: 5px 0;"><strong>Gains crédités :</strong> <span style="color: #10b981; font-weight: bold;">${gain.toFixed(2)} FCFA</span></p>
    </div>
    <p>Ces gains ont été ajoutés à ton solde XAFEARN.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${APP_URL}/dashboard" style="background-color: #10b981; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Voir mon solde</a>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"XAFEARN" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Ta diffusion a été validée ✅',
      html: wrapTemplate('Diffusion validée !', content, '#10b981'),
    });
    return { success: true, info };
  } catch (error: any) {
    console.error('Erreur validation:', error.message);
    return { success: false, error: error.message };
  }
}

export async function sendReminderEmail(email: string, name: string) {
  const content = `
    <h2 style="color: #0f172a; margin-top: 0;">Salut ${name},</h2>
    <p>Tu as publié une annonce il y a 24h. N'oublie pas d'envoyer ta preuve pour valider tes gains !</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${APP_URL}/dashboard/annonces" style="background-color: #f59e0b; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Envoyer ma preuve</a>
    </div>
    <p style="font-size: 13px; color: #64748b;">Si tu as déjà envoyé ta preuve, ignore cet email.</p>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"XAFEARN" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'N\'oublie pas de vérifier ton statut ⏰',
      html: wrapTemplate('Rappel de vérification', content, '#f59e0b'),
    });
    return { success: true, info };
  } catch (error: any) {
    console.error('Erreur reminder:', error.message);
    return { success: false, error: error.message };
  }
}

export async function sendBulkEmail(emails: string[], subject: string, message: string) {
  let successCount = 0;
  const content = `<div style="white-space: pre-wrap; line-height: 1.6;">${message}</div>`;

  for (const email of emails) {
    try {
      await transporter.sendMail({
        from: `"XAFEARN" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: subject,
        html: wrapTemplate('Information XAFEARN', content, '#0ea5e9'),
      });
      successCount++;
      await new Promise(r => setTimeout(r, 500));
    } catch (error: any) {
      console.error(`Erreur envoi à ${email}:`, error.message);
    }
  }
  return successCount;
}
