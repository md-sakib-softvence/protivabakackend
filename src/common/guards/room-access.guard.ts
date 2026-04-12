import { Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class RoomAccessGuard {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Verify that userId is either the client or provider of the booking.
   * Throws WsException if not authorized.
   */
  async verifyBookingAccess(bookingId: string, userId: string): Promise<void> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: { clientId: true, providerId: true, status: true },
    });

    if (!booking) {
      throw new WsException('Booking not found');
    }

    if (booking.clientId !== userId && booking.providerId !== userId) {
      throw new WsException('You are not a participant of this booking');
    }

    const allowedStatuses = ['ACCEPTED', 'IN_PROGRESS'];
    if (!allowedStatuses.includes(booking.status)) {
      throw new WsException(`Booking must be ACCEPTED or IN_PROGRESS. Current: ${booking.status}`);
    }
  }

  /**
   * Verify conversation room access.
   */
  async verifyRoomAccess(roomId: string, userId: string): Promise<void> {
    const room = await this.prisma.conversationRoom.findUnique({
      where: { id: roomId },
      select: { clientId: true, providerId: true, isActive: true },
    });

    if (!room || !room.isActive) {
      throw new WsException('Conversation room not found or inactive');
    }

    if (room.clientId !== userId && room.providerId !== userId) {
      throw new WsException('Access denied to this conversation room');
    }
  }
}