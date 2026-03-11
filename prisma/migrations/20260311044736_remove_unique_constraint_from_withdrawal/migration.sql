-- DropIndex
DROP INDEX "withdrawals_withdrawalNumber_key";

-- AlterTable
ALTER TABLE "withdrawals" ALTER COLUMN "withdrawalNumber" DROP NOT NULL;
