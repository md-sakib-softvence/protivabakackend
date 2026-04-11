// src/email/email.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { IEnv } from 'src/config/env.config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService<IEnv, true>) {
    // Get the entire env object once
    const env = this.configService.get<IEnv>('env', { infer: true });

    if (!env) {
      throw new Error('Environment configuration (env) is not loaded properly');
    }

    this.transporter = nodemailer.createTransport({
      host: env.EMAIL_HOST,
      port: Number(env.EMAIL_PORT),
      secure: Number(env.EMAIL_PORT) === 465,
      auth: {
        user: env.EMAIL_USER,
        pass: env.EMAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    this.verifyConnection();
  }

  private async verifyConnection() {
    try {
      await this.transporter.verify();
      this.logger.log('✅ SMTP connection verified successfully');
    } catch (error) {
      this.logger.error('❌ SMTP connection failed. Check your EMAIL_ variables in .env', error);
    }
  }

  async sendVerificationEmail(to: string, otp: string, firstName: string): Promise<void> {
    const subject = 'Your Protiva Verification Code';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #4F46E5;">Welcome to Protiva, ${firstName}!</h2>
        <p>Your one-time verification code is:</p>
        <h1 style="color: #4F46E5; font-size: 42px; letter-spacing: 10px; text-align: center; padding: 20px; background: #f8fafc; border-radius: 8px;">
          ${otp}
        </h1>
        <p>This code will expire in <strong>10 minutes</strong>.</p>
        <p style="color: #666;">If you did not request this code, please ignore this email.</p>
        <hr style="margin: 30px 0;">
        <p style="font-size: 12px; color: #888;">Protiva - Service Marketplace</p>
      </div>
    `;

    try {
      // ✅ Fixed: Get values using the 'env' object we already fetched
      const env = this.configService.get<IEnv>('env', { infer: true })!;

      await this.transporter.sendMail({
        from: `"${env.EMAIL_FROM_NAME || 'Protiva'}" <${env.EMAIL_FROM}>`,
        to,
        subject,
        html,
      });

      this.logger.log(`✅ Verification email sent to ${to}`);
    } catch (error: any) {
      this.logger.error(`❌ Failed to send verification email to ${to}`, error);
      throw new Error('Failed to send verification email');
    }
  }

  async sendPasswordResetEmail(to: string, otp: string, firstName: string): Promise<void> {
    // Implement later when needed
  }
}