-- DropIndex
DROP INDEX "jobs_slug_key";

-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "includeService" TEXT[],
ALTER COLUMN "slug" DROP NOT NULL;
