-- AlterTable
ALTER TABLE "reviews" ADD COLUMN     "image" TEXT DEFAULT '';

-- CreateTable
CREATE TABLE "AppVersionConfig" (
    "id" TEXT NOT NULL,
    "appConfigKey" TEXT NOT NULL,
    "androidLatestVersion" TEXT NOT NULL,
    "androidMinRequiredVersion" TEXT NOT NULL,
    "androidForceUpdate" BOOLEAN NOT NULL,
    "iosLatestVersion" TEXT NOT NULL,
    "iosMinRequiredVersion" TEXT NOT NULL,
    "iosForceUpdate" BOOLEAN NOT NULL,
    "androidStoreUrl" TEXT NOT NULL,
    "iosStoreUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppVersionConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AppVersionConfig_appConfigKey_key" ON "AppVersionConfig"("appConfigKey");
