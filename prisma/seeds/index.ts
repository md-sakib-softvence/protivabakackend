import { PrismaClient, UserRole, UserStatus, VerificationStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });


async function main() {
  console.log('🌱 Seeding database...');

  const email = process.env.SEED_ADMIN_EMAIL || 'islammohaimenul64@gmail.com';
  const password = process.env.SEED_ADMIN_PASSWORD || 'Adminislammohaimenul64';
  const hashedPassword = await bcrypt.hash(password, 10);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
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

  console.log(`✅ Admin user synchronized: ${admin.email}`);
  console.log('🔑 Role: SUPER_ADMIN');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
