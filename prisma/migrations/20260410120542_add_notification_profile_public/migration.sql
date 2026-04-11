-- AlterTable
ALTER TABLE "users" ADD COLUMN     "isBookingReminderEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isContactInfoPublic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isNotificationEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isProfilePublic" BOOLEAN NOT NULL DEFAULT true;
