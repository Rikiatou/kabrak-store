import nodemailer from 'nodemailer';
import { config } from '../config';

function createTransporter() {
  if (!config.smtp.host || !config.smtp.user) {
    return null;
  }
  return nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
    auth: { user: config.smtp.user, pass: config.smtp.pass },
  });
}

export async function sendPasswordResetEmail(to: string, resetUrl: string, language = 'fr'): Promise<void> {
  const transporter = createTransporter();

  const subject = language === 'fr' ? 'Réinitialisation de votre mot de passe KABRAK' : 'Reset your KABRAK password';

  const html = language === 'fr'
    ? `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff;">
        <img src="https://kabrak-store.kabrakeng.com/logo.png" alt="KABRAK" style="height:48px;margin-bottom:24px;" />
        <h2 style="color:#1e293b;margin:0 0 12px;">Réinitialisation du mot de passe</h2>
        <p style="color:#64748b;font-size:15px;line-height:1.6;margin:0 0 24px;">
          Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour en choisir un nouveau.
          Ce lien expire dans <strong>1 heure</strong>.
        </p>
        <a href="${resetUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:700;font-size:15px;">
          Réinitialiser le mot de passe
        </a>
        <p style="color:#94a3b8;font-size:13px;margin-top:32px;">
          Si vous n'avez pas fait cette demande, ignorez cet email. Votre mot de passe reste inchangé.
        </p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
        <p style="color:#cbd5e1;font-size:12px;">KABRAK Store — Votre assistant business</p>
      </div>
    `
    : `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff;">
        <img src="https://kabrak-store.kabrakeng.com/logo.png" alt="KABRAK" style="height:48px;margin-bottom:24px;" />
        <h2 style="color:#1e293b;margin:0 0 12px;">Password Reset</h2>
        <p style="color:#64748b;font-size:15px;line-height:1.6;margin:0 0 24px;">
          You requested a password reset. Click the button below to choose a new password.
          This link expires in <strong>1 hour</strong>.
        </p>
        <a href="${resetUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:700;font-size:15px;">
          Reset Password
        </a>
        <p style="color:#94a3b8;font-size:13px;margin-top:32px;">
          If you did not request this, ignore this email. Your password remains unchanged.
        </p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
        <p style="color:#cbd5e1;font-size:12px;">KABRAK Store — Your business assistant</p>
      </div>
    `;

  if (!transporter) {
    console.log(`[KABRAK] Password reset link for ${to}: ${resetUrl}`);
    return;
  }

  await transporter.sendMail({
    from: config.smtp.from,
    to,
    subject,
    html,
  });
}
