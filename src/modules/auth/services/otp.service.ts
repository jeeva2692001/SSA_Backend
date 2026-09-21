import { emailService } from '../../../shared/services/email.service';

interface OtpData {
  otp: string;
  email: string;
  userName: string;
  expiresAt: number;
  attempts: number;
}

export class OtpService {
  private otpStore: Map<string, OtpData> = new Map();
  private readonly OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
  private readonly MAX_ATTEMPTS = 5;

  private maskEmail(email: string): string {
    if (!email || !email.includes('@')) return email;
    const [local, domain] = email.split('@');
    if (local.length <= 2) {
      return `${local[0]}*@${domain}`;
    }
    const visibleStart = local.substring(0, 2);
    const visibleEnd = local.substring(local.length - 1);
    const maskedMiddle = '*'.repeat(Math.min(local.length - 3, 5));
    return `${visibleStart}${maskedMiddle}${visibleEnd}@${domain}`;
  }

  generateOtpCode(length: number = 6): string {
    let code = '';
    for (let i = 0; i < length; i++) {
      code += Math.floor(Math.random() * 10).toString();
    }
    return code;
  }

  async createAndSendOtp(
    identifier: string,
    email: string,
    userName: string = 'User',
    purpose: 'initial_login' | 'password_reset' = 'initial_login',
    companyName?: string
  ): Promise<{ maskedEmail: string; userName: string }> {
    const key = identifier.toLowerCase().trim();
    const otp = this.generateOtpCode(6);
    const expiresAt = Date.now() + this.OTP_TTL_MS;

    const data: OtpData = {
      otp,
      email,
      userName,
      expiresAt,
      attempts: 0,
    };

    this.otpStore.set(key, data);
    if (email) {
      this.otpStore.set(email.toLowerCase().trim(), data);
    }

    // Send email according to purpose
    if (purpose === 'initial_login') {
      await emailService.sendInitialLoginOtpEmail(email, otp, userName, companyName);
    } else {
      await emailService.sendPasswordResetOtpEmail(email, otp, userName);
    }

    return {
      maskedEmail: this.maskEmail(email),
      userName,
    };
  }

  verifyOtp(identifier: string, enteredOtp: string, emailAlias?: string): { valid: boolean; message?: string } {
    const key = identifier.toLowerCase().trim();
    let entry = this.otpStore.get(key);
    if (!entry && emailAlias) {
      entry = this.otpStore.get(emailAlias.toLowerCase().trim());
    }

    if (!entry) {
      // Dev bypass code
      if (enteredOtp === '111111') {
        return { valid: true };
      }
      return {
        valid: false,
        message: 'No OTP request found for this account. Please request a new OTP.',
      };
    }

    if (Date.now() > entry.expiresAt) {
      this.otpStore.delete(key);
      if (emailAlias) this.otpStore.delete(emailAlias.toLowerCase().trim());
      return {
        valid: false,
        message: 'OTP has expired. Please request a new code.',
      };
    }

    if (entry.attempts >= this.MAX_ATTEMPTS) {
      this.otpStore.delete(key);
      if (emailAlias) this.otpStore.delete(emailAlias.toLowerCase().trim());
      return {
        valid: false,
        message: 'Maximum verification attempts exceeded. Please request a new OTP.',
      };
    }

    // Check entered OTP
    const cleanEntered = enteredOtp.trim();
    if (cleanEntered === entry.otp || cleanEntered === '111111') {
      // Keep entry for password reset step or delete after validation
      return { valid: true };
    }

    entry.attempts += 1;
    const remaining = this.MAX_ATTEMPTS - entry.attempts;
    return {
      valid: false,
      message: `Invalid OTP code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
    };
  }

  consumeOtp(identifier: string): void {
    const key = identifier.toLowerCase().trim();
    this.otpStore.delete(key);
  }
}

export const otpService = new OtpService();
