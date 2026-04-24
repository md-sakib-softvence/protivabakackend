-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "isDelete" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "isDelete" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "sub_categories" ADD COLUMN     "isDelete" BOOLEAN NOT NULL DEFAULT false;
