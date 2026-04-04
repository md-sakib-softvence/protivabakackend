/*
  Warnings:

  - You are about to drop the column `permissions` on the `admin_permissions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "admin_permissions" DROP COLUMN "permissions",
ADD COLUMN     "isExportBooking" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isManageBooking" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isManageCategory" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isManageProvider" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isManageUser" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isManageWithdrawal" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isViewBooking" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isViewCategory" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isViewProvider" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isViewTransaction" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isViewUser" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isViewWithdrawal" BOOLEAN NOT NULL DEFAULT false;
