import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ERROR_MESSAGES } from 'src/common/constants';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class BookingService {
    constructor(private readonly prisma: PrismaService) { }

    async getAllBooking(page: number = 1, limit: number = 10, status?: "PENDING" | "ACCEPTED" | "REJECTED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "REFUNDED", search?: string) {
        const skip = (page - 1) * limit;

        const filters: any = {};
        if (status) filters.status = status;
        if (search) {
            filters.OR = [
                { id: { contains: search, mode: "insensitive" } },
                { bookingNumber: { contains: search, mode: "insensitive" } },
                { serviceName: { contains: search, mode: "insensitive" } },
                { serviceDescription: { contains: search, mode: "insensitive" } },
            ];
        }

        const bookings = await this.prisma.booking.findMany({
            where: filters,
            skip: skip,
            take: limit,
            orderBy: {
                createdAt: "desc"
            },
            include: {
                job: true
            }
        })

        const total = await this.prisma.booking.count({ where: filters });

        return {
            data: bookings,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }


    async bookingStatusUpdate(bookingId: string, providerId: string, status: "ACCEPTED" | "REJECTED") {

        const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });

        if (!booking) throw new NotFoundException(ERROR_MESSAGES.RECORD_NOT_FOUND);
        if (booking.providerId !== providerId) throw new ForbiddenException("You are not allowed to update this booking");

        const result = await this.prisma.booking.update({
            where: { id: bookingId },
            data: { status }
        });

        return result;

    }


}
