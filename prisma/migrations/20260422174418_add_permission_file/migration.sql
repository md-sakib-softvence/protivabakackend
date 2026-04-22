-- AlterTable
ALTER TABLE "admin_permissions" ADD COLUMN     "isManageMarketing" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isViewManageMarketing" BOOLEAN NOT NULL DEFAULT false;
