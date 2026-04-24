-- AlterTable
ALTER TABLE "admin_permissions" ADD COLUMN     "isJobManage" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isJobView" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "isBookingReminderEnabled" SET DEFAULT true,
ALTER COLUMN "isContactInfoPublic" SET DEFAULT true,
ALTER COLUMN "isNotificationEnabled" SET DEFAULT true,
ALTER COLUMN "isProfilePublic" SET DEFAULT true;
