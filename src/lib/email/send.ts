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

// En-têtes anti-spam communs
const getAntiSpamHeaders = () => ({
  'Reply-To': process.env.GMAIL_USER,
  'List-Unsubscribe': `<mailto:${process.env.GMAIL_USER}?subject=unsubscribe>`,
  'X-Mailer': 'XAFERAN Mailer',
  'X-Priority': '3', // Priorité normale (pas urgent)
});

export async function sendWelcomeEmail(email: string, name: string) {
  const subject = 'Bienvenue sur XAFERAN';
  const text = `Bonjour ${name},\n\nNous sommes ravis de t'accueillir sur XAFERAN.\n\nGagne de l'argent à chaque vue sur tes statuts WhatsApp. Accède à ton tableau de bord : https://xafearn-weld.vercel.app/dashboard\n\nL'équipe XAFERAN`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <h2>Bienvenue ${name} !</h2>
      <p>Nous sommes ravis de t'accueillir sur <strong>XAFERAN</strong>.</p>
      <p>Gagne de l'argent à chaque vue sur tes statuts WhatsApp.</p>
      <p><a href="https://xafearn-weld.vercel.app/dashboard" style="color: #0ea5e9;">Accéder à mon tableau de bord</a></p>
      <p style="font-size: 12px; color: #777; margin-top: 30px;">L'équipe XAFERAN</p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"XAFERAN" <${process.env.GMAIL_USER}>`,
      to: email,
      subject,
      text,
      html,
      headers: getAntiSpamHeaders(),
    });
    return { success: true };
  } catch (error: any) {
    console.error('Erreur email bienvenue:', error.message);
    return { success: false, error: error.message };
  }
}

export async function sendBulkEmail(emails: string[], subject: string, message: string) {
  let successCount = 0;
  const text = `${message}\n\n---\nXAFERAN - https://xafearn-weld.vercel.app`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <p style="white-space: pre-wrap; line-height: 1.6;">${message}</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 12px; color: #777;">XAFERAN - <a href="https://xafearn-weld.vercel.app" style="color: #0ea5e9;">xafearn-weld.vercel.app</a></p>
    </div>
  `;

  for (const email of emails) {
    try {
      await transporter.sendMail({
        from: `"XAFERAN" <${process.env.GMAIL_USER}>`,
        to: email,
        subject,
        text,
        html,
        headers: getAntiSpamHeaders(),
      });
      successCount++;
      // Pause de 200ms pour ne pas déclencher le filtre anti-spam de Gmail
      await new Promise(r => setTimeout(r, 200));
    } catch (error: any) {
      console.error(`Erreur pour ${email}:`, error.message);
    }
  }
  return successCount;
}
