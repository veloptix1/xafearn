import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 20000,
});

// IMPORTANT : On n'envoie QUE le From, sans Reply-To (comme ton code Python)
export async function sendWelcomeEmail(email: string, name: string) {
  const subject = 'Bienvenue sur XAFERAN';
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>Bienvenue ${name} !</h2>
      <p>Nous sommes ravis de t'accueillir sur XAFERAN.</p>
      <p>Gagne de l'argent à chaque vue sur tes statuts WhatsApp.</p>
      <p><a href="https://xafearn-weld.vercel.app/dashboard">Accéder à mon tableau de bord</a></p>
      <p style="font-size: 12px; color: #777;">L'équipe XAFERAN</p>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"XAFERAN" <${process.env.GMAIL_USER}>`,
      to: email,
      subject,
      html,
    });
    console.log('✅ Email bienvenue envoyé:', info.messageId);
    return { success: true };
  } catch (error: any) {
    console.error('❌ Erreur email bienvenue:', error.message);
    return { success: false, error: error.message };
  }
}

export async function sendValidationEmail(email: string, name: string, views: number, gain: number) {
  const subject = 'Ta diffusion a été validée';
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>Félicitations ${name} !</h2>
      <p>Ta preuve de diffusion a été vérifiée et validée.</p>
      <p>Vues vérifiées : ${views}</p>
      <p>Gains crédités : ${gain.toFixed(2)} FCFA</p>
      <p>Ces gains ont été ajoutés à ton solde XAFERAN.</p>
      <p><a href="https://xafearn-weld.vercel.app/dashboard">Voir mon solde</a></p>
      <p style="font-size: 12px; color: #777;">L'équipe XAFERAN</p>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"XAFERAN" <${process.env.GMAIL_USER}>`,
      to: email,
      subject,
      html,
    });
    console.log('✅ Email validation envoyé:', info.messageId);
    return { success: true };
  } catch (error: any) {
    console.error('❌ Erreur email validation:', error.message);
    return { success: false, error: error.message };
  }
}

export async function sendBulkEmail(emails: string[], subject: string, message: string) {
  let successCount = 0;
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <p style="white-space: pre-wrap; line-height: 1.6;">${message}</p>
      <p style="font-size: 12px; color: #777; margin-top: 30px;">XAFERAN</p>
    </div>
  `;

  for (const email of emails) {
    try {
      const info = await transporter.sendMail({
        from: `"XAFERAN" <${process.env.GMAIL_USER}>`,
        to: email,
        subject,
        html,
      });
      console.log(`✅ Email envoyé à ${email}: ${info.messageId}`);
      successCount++;
      await new Promise(r => setTimeout(r, 500)); // 500ms de pause
    } catch (error: any) {
      console.error(`❌ Erreur pour ${email}:`, error.message);
    }
  }
  return successCount;
}
