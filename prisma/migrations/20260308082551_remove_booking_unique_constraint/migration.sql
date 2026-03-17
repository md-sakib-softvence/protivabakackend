-- DropIndex
DROP INDEX "bookings_bookingNumber_key";

-- AlterTable
ALTER TABLE "bookings" ALTER COLUMN "bookingNumber" DROP NOT NULL;
