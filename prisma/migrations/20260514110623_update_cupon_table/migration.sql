-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "bankTranId" TEXT,
ADD COLUMN     "cardType" TEXT,
ADD COLUMN     "gatewayData" JSONB,
ADD COLUMN     "valId" TEXT;

-- CreateTable
CREATE TABLE "coupons" (
    "id" TEXT NOT NULL,
    "couponCode" TEXT NOT NULL,
    "discountPercentage" INTEGER NOT NULL,
    "totalUselimit" INTEGER NOT NULL DEFAULT 0,
    "currentUselimit" INTEGER NOT NULL DEFAULT 0,
    "expireAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "coupons_couponCode_key" ON "coupons"("couponCode");
