import nodemailer, { Transporter } from 'nodemailer';
import path from 'path';
import fs from 'fs';

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

  private getLogoAttachment(): { filename: string; path: string; cid: string } | null {
    const candidates = [
      path.resolve(process.cwd(), 'public', 'logo.png'),
      path.resolve(process.cwd(), '..', 'SSA_Frontend', 'src', 'assets', 'SSA Logo.png'),
      path.resolve(process.cwd(), '..', 'SSA_Frontend', 'public', 'logo.png'),
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) {
        return { filename: 'logo.png', path: c, cid: 'ssa-logo' };
      }
    }
    return null;
  }

  async sendInitialLoginOtpEmail(
    toEmail: string,
    otp: string,
    userName: string = 'Company Admin',
    companyName?: string
  ): Promise<{ success: boolean; simulated?: boolean; messageId?: string }> {
    this.initTransporter();

    console.log(`\n==================================================`);
    console.log(`📨 [EMAIL OTP SERVICE] INITIAL SIGN-IN / ACCOUNT ACTIVATION`);
    console.log(`🏢 Recipient : ${userName}${companyName ? ` (${companyName})` : ''} <${toEmail}>`);
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
      const logoAtt = this.getLogoAttachment();
      const attachments = logoAtt ? [logoAtt] : [];

      const info = await this.transporter.sendMail({
        from: fromAddress,
        to: toEmail,
        subject: `[SSA ERP] Initial Sign-In Verification OTP: ${otp}`,
        attachments,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08);">
            
            <!-- App Themed Header -->
            <div style="background: linear-gradient(135deg, #14463c 0%, #206c5c 50%, #33a18a 100%); padding: 28px 24px; text-align: center;">
              <div style="margin-bottom: 12px;">
                <img src="cid:ssa-logo" alt="SSA ERP Logo" style="width: 52px; height: 52px; object-fit: contain; background: #ffffff; border-radius: 12px; padding: 5px; box-shadow: 0 4px 10px rgba(0,0,0,0.2); display: inline-block; vertical-align: middle;" />
              </div>
              <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase;">SSA ERP</h1>
              <p style="color: #b3ebde; margin: 5px 0 0 0; font-size: 11px; letter-spacing: 2.5px; text-transform: uppercase; font-weight: 600;">Plan. Design. Deliver.</p>
            </div>

            <!-- Email Body Content -->
            <div style="padding: 32px 28px; color: #1f2937;">
              <div style="display: inline-block; padding: 5px 14px; background: #f0fbf8; border: 1px solid #b3ebde; border-radius: 20px; font-size: 12px; font-weight: 700; color: #206c5c; margin-bottom: 16px;">
                ✦ Initial Sign-In &amp; Password Setup
              </div>
              
              <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 700; color: #0f172a;">Welcome to SSA ERP, ${userName}!</h2>
              
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #4b5563;">
                Your company account has been created by the Super Administrator. Because this is your <strong>initial sign-in</strong>, please verify your email address using the one-time code below and replace your temporary password with a secure permanent one:
              </p>
              
              <!-- OTP Box in Pastel Mint Green Theme -->
              <div style="background: #f0fbf8; border: 2px dashed #33a18a; border-radius: 14px; padding: 22px; text-align: center; margin: 24px 0;">
                <div style="font-size: 11px; font-weight: 700; color: #206c5c; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1.5px;">Your One-Time Verification Code</div>
                <span style="font-size: 38px; font-weight: 800; letter-spacing: 12px; color: #206c5c; font-family: 'Space Mono', Monaco, 'Courier New', monospace; padding-left: 12px;">${otp}</span>
                <p style="margin: 10px 0 0 0; font-size: 12px; color: #5cb8a6; font-weight: 500;">Valid for <strong style="color: #206c5c;">10 minutes</strong> &bull; Single-use security token</p>
              </div>

              <!-- Security Requirement Notice with Brand Gold Accent -->
              <div style="background: #fffbeb; border-left: 4px solid #C59D5F; padding: 14px 18px; border-radius: 8px; margin: 22px 0;">
                <p style="margin: 0; font-size: 12px; color: #92400e; line-height: 1.5;">
                  <strong style="color: #78350f;">Security Requirement:</strong> You will be prompted to set up your new permanent password immediately after entering this code.
                </p>
              </div>

              <p style="margin: 18px 0 0 0; font-size: 12px; color: #9ca3af; line-height: 1.4;">
                If you did not expect this invitation or believe it was sent in error, please contact your system administrator.
              </p>
            </div>

            <!-- Footer -->
            <div style="background: #f8fafc; padding: 18px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
              <div style="font-size: 11px; font-weight: 600; color: #64748b; margin-bottom: 4px;">SSA ERP Enterprise Platform</div>
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">&copy; ${new Date().getFullYear()} Sundar Sundram Architects. All rights reserved.</p>
            </div>

          </div>
        `,
      });

      return { success: true, messageId: info.messageId };
    } catch (error: any) {
      console.error('Failed to send initial login OTP email via SMTP:', error.message);
      return { success: true, simulated: true };
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
      const logoAtt = this.getLogoAttachment();
      const attachments = logoAtt ? [logoAtt] : [];

      const info = await this.transporter.sendMail({
        from: fromAddress,
        to: toEmail,
        subject: `[SSA ERP] Your Password Reset OTP: ${otp}`,
        attachments,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08);">
            
            <!-- App Themed Header -->
            <div style="background: linear-gradient(135deg, #14463c 0%, #206c5c 50%, #33a18a 100%); padding: 28px 24px; text-align: center;">
              <div style="margin-bottom: 12px;">
                <img src="cid:ssa-logo" alt="SSA ERP Logo" style="width: 52px; height: 52px; object-fit: contain; background: #ffffff; border-radius: 12px; padding: 5px; box-shadow: 0 4px 10px rgba(0,0,0,0.2); display: inline-block; vertical-align: middle;" />
              </div>
              <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase;">SSA ERP</h1>
              <p style="color: #b3ebde; margin: 5px 0 0 0; font-size: 11px; letter-spacing: 2.5px; text-transform: uppercase; font-weight: 600;">Plan. Design. Deliver.</p>
            </div>

            <!-- Email Body Content -->
            <div style="padding: 32px 28px; color: #1f2937;">
              <div style="display: inline-block; padding: 5px 14px; background: #f0fbf8; border: 1px solid #b3ebde; border-radius: 20px; font-size: 12px; font-weight: 700; color: #206c5c; margin-bottom: 16px;">
                ✦ Password Reset Request
              </div>

              <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 700; color: #0f172a;">Hello, ${userName}</h2>
              
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #4b5563;">
                We received a request to reset the password for your SSA ERP account. Use the one-time verification code below to complete the recovery process:
              </p>
              
              <!-- OTP Box in Pastel Mint Green Theme -->
              <div style="background: #f0fbf8; border: 2px dashed #33a18a; border-radius: 14px; padding: 22px; text-align: center; margin: 24px 0;">
                <div style="font-size: 11px; font-weight: 700; color: #206c5c; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1.5px;">Your Password Reset Code</div>
                <span style="font-size: 38px; font-weight: 800; letter-spacing: 12px; color: #206c5c; font-family: 'Space Mono', Monaco, 'Courier New', monospace; padding-left: 12px;">${otp}</span>
                <p style="margin: 10px 0 0 0; font-size: 12px; color: #5cb8a6; font-weight: 500;">Valid for <strong style="color: #206c5c;">10 minutes</strong> &bull; Single-use security token</p>
              </div>

              <p style="margin: 18px 0 0 0; font-size: 12px; color: #9ca3af; line-height: 1.4;">
                If you did not request a password reset, please disregard this email or notify your system administrator immediately.
              </p>
            </div>

            <!-- Footer -->
            <div style="background: #f8fafc; padding: 18px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
              <div style="font-size: 11px; font-weight: 600; color: #64748b; margin-bottom: 4px;">SSA ERP Enterprise Platform</div>
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">&copy; ${new Date().getFullYear()} Sundar Sundram Architects. All rights reserved.</p>
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

  async sendClientWelcomeAndCredentialsEmail(params: {
    clientEmail: string;
    clientName: string;
    username: string;
    password?: string;
    projectName: string;
    projectCode: string;
    companyName?: string;
    portalUrl?: string;
  }): Promise<{ success: boolean; simulated?: boolean; messageId?: string }> {
    this.initTransporter();

    const portalUrl = params.portalUrl || process.env.APP_URL || 'http://localhost:5173/login';
    const pwd = params.password || 'Pass@1234';

    console.log(`\n==================================================`);
    console.log(`📨 [CLIENT CREDENTIALS EMAIL SERVICE] WELCOME & ACCESS INFORMATION`);
    console.log(`👤 Client Name : ${params.clientName} <${params.clientEmail}>`);
    console.log(`🏗️ Project     : ${params.projectName} (${params.projectCode})`);
    console.log(`🔗 Portal URL  : ${portalUrl}`);
    console.log(`🔑 Username    : ${params.username}`);
    console.log(`🔒 Password    : ${pwd}`);
    console.log(`🏷️ Role        : Client Portal`);
    if (!this.isConfigured) {
      console.log(`⚠️ SMTP Mode   : Simulated / Dev Mode (No SMTP configured in .env)`);
    } else {
      console.log(`🚀 SMTP Mode   : Live Delivery via ${process.env.SMTP_HOST}`);
    }
    console.log(`==================================================\n`);

    if (!this.isConfigured || !this.transporter) {
      return { success: true, simulated: true };
    }

    try {
      const fromAddress = process.env.SMTP_FROM || `"SSA ERP Client Access" <no-reply@ssa-erp.com>`;
      const logoAtt = this.getLogoAttachment();
      const attachments = logoAtt ? [logoAtt] : [];

      const info = await this.transporter.sendMail({
        from: fromAddress,
        to: params.clientEmail,
        subject: `[SSA ERP] Client Portal Access & Login Credentials for ${params.projectName} (${params.projectCode})`,
        attachments,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08);">
            
            <!-- App Themed Header -->
            <div style="background: linear-gradient(135deg, #14463c 0%, #206c5c 50%, #33a18a 100%); padding: 32px 28px; text-align: center;">
              <div style="margin-bottom: 12px;">
                <img src="cid:ssa-logo" alt="SSA ERP Logo" style="width: 54px; height: 54px; object-fit: contain; background: #ffffff; border-radius: 12px; padding: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); display: inline-block; vertical-align: middle;" />
              </div>
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase;">SSA ERP</h1>
              <p style="color: #b3ebde; margin: 6px 0 0 0; font-size: 11px; letter-spacing: 2.5px; text-transform: uppercase; font-weight: 600;">Plan. Design. Deliver.</p>
            </div>

            <!-- Email Body Content -->
            <div style="padding: 32px 28px; color: #1f2937;">
              <div style="display: inline-block; padding: 6px 14px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 20px; font-size: 11px; font-weight: 800; color: #047857; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px;">
                ✦ Client Portal Access &amp; Credentials
              </div>
              
              <h2 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 800; color: #0f172a; line-height: 1.3;">
                Welcome, ${params.clientName}!
              </h2>
              
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #4b5563;">
                Your project <strong style="color: #0f172a;">${params.projectName}</strong> has been initialized in our system under Project Code <code style="background: #f1f5f9; padding: 2px 6px; border-radius: 6px; font-size: 12px; font-weight: 700; color: #0f172a;">${params.projectCode}</code>.
              </p>

              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #4b5563;">
                Your dedicated project team has been assigned. You have been granted access to the <strong>SSA Client Portal</strong> to monitor designs, review and approve drawing deliverables, and collaborate directly with your project architects and engineers.
              </p>
              
              <!-- Credentials Card -->
              <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 22px; margin: 24px 0;">
                <div style="font-size: 11px; font-weight: 800; color: #206c5c; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 14px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
                  Your Secure Login Credentials
                </div>

                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                  <tr>
                    <td style="padding: 6px 0; color: #64748b; width: 130px; font-weight: 600;">Project Code:</td>
                    <td style="padding: 6px 0; color: #0f172a; font-weight: 800; font-family: monospace;">${params.projectCode}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Username / ID:</td>
                    <td style="padding: 6px 0; color: #0f172a; font-weight: 800; font-family: monospace;">${params.username}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Password:</td>
                    <td style="padding: 6px 0; color: #059669; font-weight: 800; font-family: monospace; font-size: 14px;">${pwd}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Assigned Role:</td>
                    <td style="padding: 6px 0; color: #047857; font-weight: 700;">Client Representative</td>
                  </tr>
                </table>

                <div style="text-align: center; margin-top: 20px; padding-top: 14px; border-top: 1px dashed #cbd5e1;">
                  <a href="${portalUrl}" target="_blank" style="display: inline-block; background: #206c5c; color: #ffffff; font-size: 13px; font-weight: 700; padding: 12px 28px; border-radius: 10px; text-decoration: none; box-shadow: 0 4px 10px rgba(32, 108, 92, 0.3);">
                    Sign In to Client Portal &rarr;
                  </a>
                  <p style="margin: 8px 0 0 0; font-size: 11px; color: #94a3b8;">Portal Link: ${portalUrl}</p>
                </div>
              </div>

              <!-- What You Can Do in the Portal -->
              <div style="margin: 24px 0;">
                <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">
                  ✦ What You Can Do in the Portal:
                </h3>
                <ul style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.8; color: #4b5563;">
                  <li><strong>Review Drawing Deliverables:</strong> View architectural designs, 3D renderings, and floor plans in high resolution directly in your browser.</li>
                  <li><strong>Submit Feedback &amp; Approvals:</strong> Approve completed deliverables or request revisions with structured revision notes.</li>
                  <li><strong>Download Official Documents:</strong> Access Good For Construction (GFC) drawings and specifications anytime.</li>
                  <li><strong>Monitor Project Progression:</strong> Track your project's milestones across Pre-Design, Schematic, Design Development, and Construction stages.</li>
                </ul>
              </div>

              <!-- Security Advice -->
              <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 14px 18px; border-radius: 8px; margin: 22px 0;">
                <p style="margin: 0; font-size: 12px; color: #92400e; line-height: 1.5;">
                  <strong style="color: #78350f;">Security Notice:</strong> Please keep your login credentials private. For your security, you can update your password upon signing in under Account Settings.
                </p>
              </div>

              <p style="margin: 18px 0 0 0; font-size: 12px; color: #64748b; line-height: 1.5;">
                If you have questions or require support accessing your portal, please contact your assigned Project Manager or reach out to our team at <a href="mailto:support@ssa-erp.com" style="color: #206c5c; font-weight: 600;">support@ssa-erp.com</a>.
              </p>
            </div>

            <!-- Footer -->
            <div style="background: #f8fafc; padding: 20px 28px; text-align: center; border-top: 1px solid #e2e8f0;">
              <div style="font-size: 11px; font-weight: 700; color: #475569; margin-bottom: 4px;">SSA ERP &bull; Architecture &amp; Project Management Platform</div>
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">&copy; ${new Date().getFullYear()} Sundar Sundram Architects. All rights reserved.</p>
            </div>

          </div>
        `,
      });

      return { success: true, messageId: info.messageId };
    } catch (error: any) {
      console.error('Failed to send client welcome credentials email via SMTP:', error.message);
      return { success: true, simulated: true };
    }
  }
}

export const emailService = new EmailService();
