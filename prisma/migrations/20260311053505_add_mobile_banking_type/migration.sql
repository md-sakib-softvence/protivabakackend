-- CreateEnum
CREATE TYPE "MobileBankingType" AS ENUM ('BKASH', 'NAGAD', 'ROCKET', 'UPAY');

-- AlterTable
ALTER TABLE "withdrawals" ADD COLUMN     "mobileBankingPaymentTakeNumber" TEXT,
ADD COLUMN     "mobileBankingType" "MobileBankingType",
ADD COLUMN     "phoneNumber" TEXT,
ALTER COLUMN "bankName" DROP NOT NULL,
ALTER COLUMN "accountNumber" DROP NOT NULL,
ALTER COLUMN "accountHolderName" DROP NOT NULL;
