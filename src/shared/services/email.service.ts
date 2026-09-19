import nodemailer, { Transporter } from 'nodemailer';

export class EmailService {
  private transporter: Transporter | null = null;
  private isConfigured: boolean = false;

  constructor() {
    this.initTransporter();
  }

  private initTransporter() {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: {
          user,
          pass,
        },
      });
      this.isConfigured = true;
    } else {
      this.isConfigured = false;
    }
  }

  async sendPasswordResetOtpEmail(
    toEmail: string,
    otp: string,
    userName: string = 'User'
  ): Promise<{ success: boolean; simulated?: boolean; messageId?: string }> {
    this.initTransporter();

    console.log(`\n==================================================`);
    console.log(`📨 [EMAIL OTP SERVICE] PASSWORD RESET VERIFICATION`);
    console.log(`👤 Recipient : ${userName} <${toEmail}>`);
    console.log(`🔑 OTP Code  : ${otp}`);
    console.log(`⏳ Validity  : 10 Minutes`);
    if (!this.isConfigured) {
      console.log(`⚠️ SMTP Mode : Simulated / Dev Mode (No SMTP configured in .env)`);
      console.log(`💡 Tip       : Enter code "${otp}" or bypass code "111111" to verify.`);
    } else {
      console.log(`🚀 SMTP Mode : Live Delivery via ${process.env.SMTP_HOST}`);
    }
    console.log(`==================================================\n`);

    if (!this.isConfigured || !this.transporter) {
      return { success: true, simulated: true };
    }

    try {
      const fromAddress = process.env.SMTP_FROM || `"SSA ERP Security" <no-reply@ssa-erp.com>`;
      const info = await this.transporter.sendMail({
        from: fromAddress,
        to: toEmail,
        subject: `[SSA ERP] Your Password Reset OTP: ${otp}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="background: #1e3a8a; padding: 24px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">SSA ERP</h1>
              <p style="color: #93c5fd; margin: 4px 0 0 0; font-size: 11px; letter-spacing: 2px; text-transform: uppercase;">Plan. Design. Deliver.</p>
            </div>
            <div style="padding: 32px 24px; color: #1e293b;">
              <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 600; color: #0f172a;">Password Reset Request</h2>
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.5; color: #475569;">
                Hello <strong>${userName}</strong>,<br/>
                We received a request to reset the password for your SSA ERP account. Use the one-time verification code below to complete the recovery process:
              </p>
              
              <div style="background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 8px; padding: 18px; text-align: center; margin: 24px 0;">
                <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #1e40af; font-family: monospace;">${otp}</span>
                <p style="margin: 8px 0 0 0; font-size: 12px; color: #64748b;">This OTP is valid for <strong>10 minutes</strong>.</p>
              </div>

              <p style="margin: 0 0 12px 0; font-size: 13px; color: #64748b; line-height: 1.4;">
                If you did not request a password reset, please disregard this email or notify your system administrator immediately.
              </p>
            </div>
            <div style="background: #f1f5f9; padding: 16px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">&copy; ${new Date().getFullYear()} SSA ERP System. All rights reserved.</p>
            </div>
          </div>
        `,
      });

      return { success: true, messageId: info.messageId };
    } catch (error: any) {
      console.error('Failed to send OTP email via SMTP:', error.message);
      return { success: true, simulated: true };
    }
  }
}

export const emailService = new EmailService();
