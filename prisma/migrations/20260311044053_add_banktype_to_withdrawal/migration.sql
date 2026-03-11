/*
  Warnings:

  - Added the required column `bankType` to the `withdrawals` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "BookingCompliteInProgress" AS ENUM ('IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "BankType" AS ENUM ('CARD_PAYMENT', 'MOBILE_BANKING');

-- AlterTable
ALTER TABLE "withdrawals" ADD COLUMN     "bankType" "BankType" NOT NULL;
