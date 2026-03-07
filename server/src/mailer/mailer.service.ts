import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailerService {
    private readonly logger = new Logger(MailerService.name);
    private transporter: nodemailer.Transporter | null = null;

    constructor() {
        if (process.env.SMTP_HOST) {
            this.transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: Number(process.env.SMTP_PORT || 587),
                secure: process.env.SMTP_SECURE === 'true',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                },
            });
        }
    }

    async sendVerificationEmail(toEmail: string, token: string): Promise<void> {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const verificationUrl = `${frontendUrl}/verify-email?token=${token}`;
        const from = process.env.SMTP_FROM || 'NutrifiedAI <no-reply@nutrifiedai.com>';

        if (!this.transporter) {
            this.logger.warn(
                `SMTP not configured — skipping email send.\nVerification URL for ${toEmail}: ${verificationUrl}`,
            );
            return;
        }

        await this.transporter.sendMail({
            from,
            to: toEmail,
            subject: 'Verify your NutrifiedAI email address',
            text: [
                'Welcome to NutrifiedAI!',
                '',
                'Please verify your email address by clicking the link below:',
                '',
                verificationUrl,
                '',
                'This link expires in 24 hours.',
                '',
                'If you did not create an account, you can safely ignore this email.',
            ].join('\n'),
            html: `
<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;background:#0f0f0f;color:#f8f8f8;margin:0;padding:32px;">
  <div style="max-width:480px;margin:0 auto;background:#1a1a1a;border-radius:12px;padding:32px;">
    <h1 style="color:#f8f8f8;font-size:22px;margin:0 0 8px;">Welcome to NutrifiedAI</h1>
    <p style="color:#a0a0a0;margin:0 0 24px;">Please verify your email address to get started.</p>
    <a href="${verificationUrl}"
       style="display:inline-block;background:#22c55e;color:#fff;font-weight:600;
              text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;">
      Verify Email Address
    </a>
    <p style="color:#666;font-size:12px;margin:24px 0 0;">
      This link expires in 24 hours. If you didn't create an account, you can ignore this email.
    </p>
  </div>
</body>
</html>`,
        });
    }
}
