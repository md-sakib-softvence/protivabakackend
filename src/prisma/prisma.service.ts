import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, UserRole, UserStatus, VerificationStatus } from '@prisma/client';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  constructor(private configService: ConfigService) {
    const pool = new Pool({
      connectionString: configService.get<string>('DATABASE_URL'),
    });
    const adapter = new PrismaPg(pool);
    super({ adapter: adapter });
  }

  async onModuleInit() {
    await this.$connect();
    await this.seed();
  }

  private async seed() {
    const email = this.configService.get<string>('SEED_ADMIN_EMAIL', 'admin@kaajbd.com.bd');
    const password = this.configService.get<string>('SEED_ADMIN_PASSWORD', 'AdminPassword123!');

    const existingAdmin = await this.user.findUnique({
      where: { email },
    });

    if (existingAdmin) {
      this.logger.log(`✅ Super Admin already exists: ${email}`);
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await this.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName: 'Super',
        lastName: 'Admin',
        role: UserRole.SUPER_ADMIN,
        status: UserStatus.ACTIVE,
        verificationStatus: VerificationStatus.VERIFIED,
        emailVerified: true,
        phoneVerified: true,
      },
    });

    this.logger.log(`🚀 Super Admin created successfully: ${email}`);
  }
}


