-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "metadata" JSONB;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "isProviderRecomendation" BOOLEAN NOT NULL DEFAULT false;
