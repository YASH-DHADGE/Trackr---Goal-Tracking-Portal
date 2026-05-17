import nodemailer from 'nodemailer';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

// Create a singleton transporter instance
// We configure it to use environment variables.
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || '',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
});

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const { to, subject, html } = options;

  // Check if SMTP configuration is present
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    console.warn(`[EmailService] SMTP not configured. Skipping email to: ${to} (Subject: "${subject}")`);
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: `"GoalForge Notifications" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`[EmailService] Email sent to ${to} successfully. MessageId: ${info.messageId}`);
  } catch (error) {
    // Log the error but do NOT throw to avoid crashing the main request flow
    console.error(`[EmailService] Failed to send email to ${to}:`, error);
  }
}
