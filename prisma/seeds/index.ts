
import { PrismaClient, UserRole, UserStatus, VerificationStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const email = process.env.SEED_ADMIN_EMAIL || 'admin@kaajbd.com.bd';
  const password = process.env.SEED_ADMIN_PASSWORD || 'AdminPassword123!';
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
