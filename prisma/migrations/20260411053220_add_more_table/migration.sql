-- CreateEnum
CREATE TYPE "TrackingRole" AS ENUM ('CLIENT', 'PROVIDER');

-- CreateEnum
CREATE TYPE "CallProvider" AS ENUM ('WEBRTC', 'AGORA', 'TWILIO');

-- CreateEnum
CREATE TYPE "CallType" AS ENUM ('VOICE', 'VIDEO');

-- CreateEnum
CREATE TYPE "CallStatus" AS ENUM ('INITIATED', 'RINGING', 'ACCEPTED', 'ONGOING', 'ENDED', 'MISSED', 'REJECTED');

-- CreateTable
CREATE TABLE "conversation_rooms" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "conversation_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "location_updates" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "TrackingRole" NOT NULL,
    "latitude" DECIMAL(10,8) NOT NULL,
    "longitude" DECIMAL(11,8) NOT NULL,
    "accuracy" DOUBLE PRECISION,
    "heading" DOUBLE PRECISION,
    "speed" DOUBLE PRECISION,
    "altitude" DOUBLE PRECISION,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "location_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "call_sessions" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "callerId" TEXT NOT NULL,
    "calleeId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "provider" "CallProvider" NOT NULL DEFAULT 'WEBRTC',
    "type" "CallType" NOT NULL DEFAULT 'VOICE',
    "status" "CallStatus" NOT NULL DEFAULT 'INITIATED',
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "call_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "conversation_rooms_bookingId_key" ON "conversation_rooms"("bookingId");

-- CreateIndex
CREATE INDEX "conversation_rooms_bookingId_idx" ON "conversation_rooms"("bookingId");

-- CreateIndex
CREATE INDEX "conversation_rooms_clientId_providerId_idx" ON "conversation_rooms"("clientId", "providerId");

-- CreateIndex
CREATE INDEX "conversation_rooms_isActive_idx" ON "conversation_rooms"("isActive");

-- CreateIndex
CREATE INDEX "location_updates_bookingId_userId_timestamp_idx" ON "location_updates"("bookingId", "userId", "timestamp");

-- CreateIndex
CREATE INDEX "location_updates_bookingId_timestamp_idx" ON "location_updates"("bookingId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "call_sessions_roomId_key" ON "call_sessions"("roomId");

-- CreateIndex
CREATE INDEX "call_sessions_bookingId_idx" ON "call_sessions"("bookingId");

-- CreateIndex
CREATE INDEX "call_sessions_callerId_calleeId_idx" ON "call_sessions"("callerId", "calleeId");

-- CreateIndex
CREATE INDEX "call_sessions_status_idx" ON "call_sessions"("status");

-- AddForeignKey
ALTER TABLE "conversation_rooms" ADD CONSTRAINT "conversation_rooms_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_updates" ADD CONSTRAINT "location_updates_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_sessions" ADD CONSTRAINT "call_sessions_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
