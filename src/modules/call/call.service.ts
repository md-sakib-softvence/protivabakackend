import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

import { InitiateCallDto } from './dto/call.dto';
import { CallStatus, CallType } from '@prisma/client';
import * as callProviderInterface from './interface/call-provider.interface';


@Injectable()
export class CallService {
  private readonly logger = new Logger(CallService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(callProviderInterface.CALL_PROVIDER) private readonly callProvider: callProviderInterface.ICallProvider,
  ) {}

  async initiateCall(callerId: string, dto: InitiateCallDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
      select: { clientId: true, providerId: true, status: true },
    });

    if (!booking) throw new NotFoundException('Booking not found');

    const isParticipant =
      booking.clientId === callerId || booking.providerId === callerId;
    if (!isParticipant) throw new ForbiddenException('Not a participant of this booking');

    const allowedStatuses = ['ACCEPTED', 'IN_PROGRESS'];
    if (!allowedStatuses.includes(booking.status)) {
      throw new BadRequestException('Calls only available for active bookings');
    }

    // Check no active call for this booking
    const activeCall = await this.prisma.callSession.findFirst({
      where: {
        bookingId: dto.bookingId,
        status: { in: [CallStatus.INITIATED, CallStatus.RINGING, CallStatus.ACCEPTED, CallStatus.ONGOING] },
      },
    });
    if (activeCall) throw new BadRequestException('A call is already active for this booking');

    // Create room via provider (WebRTC / Agora / etc.)
    const room = await this.callProvider.createRoom({
      bookingId: dto.bookingId,
      callerId,
      calleeId: dto.calleeId,
      type: dto.type ?? 'VOICE',
    });

    const calleeToken = await this.callProvider.generateToken(room.roomId, dto.calleeId);

    const session = await this.prisma.callSession.create({
      data: {
        bookingId: dto.bookingId,
        callerId,
        calleeId: dto.calleeId,
        roomId: room.roomId,
        provider: this.callProvider.name as any,
        type: dto.type ?? CallType.VOICE,
        status: CallStatus.INITIATED,
        metadata: room.metadata ?? {},
      },
    });

    return {
      sessionId: session.id,
      roomId: room.roomId,
      provider: this.callProvider.name,
      callerToken: room.callerToken,
      calleeToken,
      type: session.type,
    };
  }

  async acceptCall(calleeId: string, roomId: string) {
    const session = await this.findActiveSession(roomId);
    if (session.calleeId !== calleeId) throw new ForbiddenException('Not the intended callee');

    const token = await this.callProvider.generateToken(roomId, calleeId);

    await this.prisma.callSession.update({
      where: { id: session.id },
      data: { status: CallStatus.ACCEPTED, startedAt: new Date() },
    });

    return { sessionId: session.id, roomId, token };
  }

  async rejectCall(calleeId: string, roomId: string) {
    const session = await this.findActiveSession(roomId);
    if (session.calleeId !== calleeId) throw new ForbiddenException('Not the intended callee');

    await this.endSessionInternal(session.id, roomId, CallStatus.REJECTED);
    return { message: 'Call rejected' };
  }

  async endCall(userId: string, roomId: string) {
    const session = await this.findActiveSession(roomId);

    if (session.callerId !== userId && session.calleeId !== userId) {
      throw new ForbiddenException('Not a participant of this call');
    }

    const duration = session.startedAt
      ? Math.round((Date.now() - session.startedAt.getTime()) / 1000)
      : 0;

    await this.endSessionInternal(session.id, roomId, CallStatus.ENDED, duration);
    return { duration, roomId };
  }

  async getCallHistory(userId: string, bookingId: string) {
    return this.prisma.callSession.findMany({
      where: {
        bookingId,
        OR: [{ callerId: userId }, { calleeId: userId }],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async findActiveSession(roomId: string) {
  const session = await this.prisma.callSession.findUnique({
    where: { roomId },
  });

  if (!session) throw new NotFoundException('Call session not found');

  const endedStatuses: CallStatus[] = [
    CallStatus.ENDED,
    CallStatus.REJECTED,
    CallStatus.MISSED,
  ];

  if (endedStatuses.includes(session.status)) {
    throw new BadRequestException('Call has already ended');
  }

  return session;
}

  // private async findActiveSession(roomId: string) {
  //   const session = await this.prisma.callSession.findUnique({
  //     where: { roomId },
  //   });
  //   if (!session) throw new NotFoundException('Call session not found');

  //   const ended = [CallStatus.ENDED, CallStatus.REJECTED, CallStatus.MISSED];
  //   if (ended.includes(session.status)) {
  //     throw new BadRequestException('Call has already ended');
  //   }
  //   return session;
  // }

  private async endSessionInternal(
    sessionId: string,
    roomId: string,
    status: CallStatus,
    duration?: number,
  ) {
    await this.prisma.callSession.update({
      where: { id: sessionId },
      data: { status, endedAt: new Date(), ...(duration !== undefined ? { duration } : {}) },
    });
    await this.callProvider.endRoom(roomId);
  }
}