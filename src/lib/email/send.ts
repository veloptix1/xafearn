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

// Template de base pour tous les emails (Design pro)
const wrapTemplate = (title: string, content: string, color: string = '#0ea5e9') => `
  <div style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 30px 15px;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
      
      <div style="background-color: ${color}; padding: 30px 24px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800;">${title}</h1>
      </div>
      
      <div style="padding: 30px 24px; color: #334155; font-size: 15px; line-height: 1.6;">
        ${content}
      </div>
      
      <div style="background-color: #f1f5f9; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0; font-size: 12px; color: #64748b;">© 2026 XAFEARN. Tous droits réservés.</p>
        <p style="margin: 5px 0 0; font-size: 12px; color: #64748b;"><a href="${APP_URL}" style="color: #0ea5e9; text-decoration: none;">xafearn-weld.vercel.app</a></p>
      </div>
      
    </div>
  </div>
`;

// 1. EMAIL DE BIENVENUE (Long et structuré)
export async function sendWelcomeEmail(email: string, name: string) {
  const content = `
    <h2 style="color: #0f172a; margin-top: 0;">Bonjour ${name},</h2>
    <p>Nous sommes ravis de vous accueillir sur <strong>XAFEARN</strong>, la plateforme qui transforme vos statuts WhatsApp en une véritable source de revenus.</p>
    
    <h3 style="color: #0ea5e9; margin-top: 24px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">🚀 Comment fonctionne XAFEARN ?</h3>
    <p>XAFEARN met en relation des <strong>annonceurs</strong> qui souhaitent promouvoir leurs produits et des <strong>diffuseurs</strong> qui partagent ces annonces sur leurs statuts WhatsApp.</p>
    <ul style="padding-left: 20px; line-height: 1.8;">
      <li><strong>Étape 1 :</strong> Choisissez une annonce dans le catalogue.</li>
      <li><strong>Étape 2 :</strong> Téléchargez l'image et copiez le texte fourni.</li>
      <li><strong>Étape 3 :</strong> Publiez sur votre statut WhatsApp.</li>
      <li><strong>Étape 4 :</strong> Envoyez la preuve de publication (vidéo).</li>
      <li><strong>Étape 5 :</strong> Une fois validé, vos gains sont crédités sur votre solde.</li>
    </ul>

    <h3 style="color: #0ea5e9; margin-top: 24px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">🎁 Vos avantages dès aujourd'hui</h3>
    <ul style="padding-left: 20px; line-height: 1.8;">
      <li><strong>Gains par vue :</strong> De 0,50 F à 1,75 F par vue selon votre niveau.</li>
      <li><strong>Progression :</strong> Plus vous publiez, plus vous montez en niveau et gagnez plus.</li>
      <li><strong>Équipe :</strong> Atteignez le niveau Expert et créez votre propre équipe.</li>
      <li><strong>Outils IA :</strong> Générez des visuels et des textes professionnels gratuitement.</li>
    </ul>

    <h3 style="color: #0ea5e9; margin-top: 24px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">⚠️ Ce que vous devez savoir</h3>
    <p style="background-color: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; border-radius: 4px; font-size: 14px;">
      <strong>Important :</strong> Toute modification du texte, de l'image ou du lien de suivi entraînera l'annulation de vos gains. Restez honnête et rigoureux.
    </p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${APP_URL}/dashboard" style="background-color: #0ea5e9; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">Accéder à mon tableau de bord</a>
    </div>

    <p>Si vous avez la moindre question, n'hésitez pas à nous contacter en répondant à cet email.</p>
    <p style="margin-top: 30px;">À très bientôt,<br><strong>L'équipe XAFEARN</strong></p>
  `;

  try {
    await transporter.sendMail({
      from: `"XAFEARN" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Bienvenue sur XAFEARN 🚀 - Votre guide de démarrage',
      html: wrapTemplate('Bienvenue sur XAFEARN !', content, '#0ea5e9'),
    });
    return { success: true };
  } catch (error: any) {
    console.error('Erreur welcome:', error.message);
    return { success: false, error: error.message };
  }
}

// 2. EMAIL DE VALIDATION DE GAINS (Long et détaillé)
export async function sendValidationEmail(email: string, name: string, views: number, gain: number) {
  const content = `
    <h2 style="color: #0f172a; margin-top: 0;">Félicitations ${name},</h2>
    <p>Nous avons le plaisir de vous informer que votre preuve de diffusion a été <strong>vérifiée et validée</strong> par notre équipe.</p>
    
    <h3 style="color: #10b981; margin-top: 24px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">📊 Détails de la validation</h3>
    <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Vues vérifiées</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold;">${views}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Gains crédités</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold; color: #10b981;">${gain.toFixed(2)} FCFA</td>
      </tr>
    </table>

    <h3 style="color: #10b981; margin-top: 24px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">💡 Que faire maintenant ?</h3>
    <ul style="padding-left: 20px; line-height: 1.8;">
      <li>Consultez votre nouveau solde sur votre tableau de bord.</li>
      <li>Continuez à publier pour augmenter vos gains et monter en niveau.</li>
      <li>Invitez vos amis à rejoindre XAFEARN pour gagner des commissions.</li>
    </ul>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${APP_URL}/dashboard" style="background-color: #10b981; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">Voir mon solde</a>
    </div>

    <p style="margin-top: 30px;">Merci pour votre confiance,<br><strong>L'équipe XAFEARN</strong></p>
  `;

  try {
    await transporter.sendMail({
      from: `"XAFEARN" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: '✅ Diffusion validée - Vos gains sont crédités',
      html: wrapTemplate('Diffusion validée !', content, '#10b981'),
    });
    return { success: true };
  } catch (error: any) {
    console.error('Erreur validation:', error.message);
    return { success: false, error: error.message };
  }
}

// 3. EMAIL DE RAPPEL (Long et structuré)
export async function sendReminderEmail(email: string, name: string) {
  const content = `
    <h2 style="color: #0f172a; margin-top: 0;">Bonjour ${name},</h2>
    <p>Nous avons remarqué que vous avez publié une annonce il y a environ 24 heures, mais que vous n'avez pas encore soumis votre preuve de diffusion.</p>
    
    <h3 style="color: #f59e0b; margin-top: 24px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">⏰ Pourquoi est-ce important ?</h3>
    <p>Sans preuve de publication, nous ne pouvons pas valider vos gains. Chaque jour compte pour maintenir votre niveau et votre réputation sur la plateforme.</p>

    <h3 style="color: #f59e0b; margin-top: 24px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">📝 Comment envoyer votre preuve ?</h3>
    <ol style="padding-left: 20px; line-height: 1.8;">
      <li>Rendez-vous sur la page "Annonces" de votre tableau de bord.</li>
      <li>Cliquez sur "Vérifier l'annonce" pour l'annonce concernée.</li>
      <li>Filmez votre statut WhatsApp avec l'annonce visible.</li>
      <li>Uploadez la vidéo et validez.</li>
    </ol>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${APP_URL}/dashboard/annonces" style="background-color: #f59e0b; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">Envoyer ma preuve maintenant</a>
    </div>

    <p style="font-size: 13px; color: #64748b;">Si vous avez déjà envoyé votre preuve, veuillez ignorer cet email.</p>
    <p style="margin-top: 30px;">Cordialement,<br><strong>L'équipe XAFEARN</strong></p>
  `;

  try {
    await transporter.sendMail({
      from: `"XAFEARN" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: '⏰ N\'oubliez pas de vérifier votre statut',
      html: wrapTemplate('Rappel de vérification', content, '#f59e0b'),
    });
    return { success: true };
  } catch (error: any) {
    console.error('Erreur reminder:', error.message);
    return { success: false, error: error.message };
  }
}

// 4. EMAIL GROUPÉ (Admin)
export async function sendBulkEmail(emails: string[], subject: string, message: string) {
  let successCount = 0;
  
  const content = `
    <h2 style="color: #0f172a; margin-top: 0;">Information XAFEARN</h2>
    <p style="white-space: pre-wrap; line-height: 1.7;">${message}</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${APP_URL}/dashboard" style="background-color: #0ea5e9; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">Accéder à mon compte</a>
    </div>
    <p style="margin-top: 30px;">Cordialement,<br><strong>L'équipe XAFEARN</strong></p>
  `;

  for (const email of emails) {
    try {
      await transporter.sendMail({
        from: `"XAFEARN" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: subject,
        html: wrapTemplate('Message de XAFEARN', content, '#0ea5e9'),
      });
      successCount++;
      await new Promise(r => setTimeout(r, 500));
    } catch (error: any) {
      console.error(`Erreur envoi à ${email}:`, error.message);
    }
  }
  return successCount;
}
