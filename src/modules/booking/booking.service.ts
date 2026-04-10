import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { BookingCompliteInProgress, BookingStatus } from '@prisma/client';
import { ERROR_MESSAGES } from 'src/common/constants';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreteBookingDto } from './dto/create.booking.dto';

@Injectable()
export class BookingService {
    constructor(private readonly prisma: PrismaService) { }

    async getAllBooking(userId: string, page: number = 1, limit: number = 10, status?: "PENDING" | "ACCEPTED" | "REJECTED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "REFUNDED", search?: string) {

        const findUser = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                role: true,
                adminPermissions: {
                    select: {
                        isViewBooking: true
                    }
                }
            }
        });

        if (findUser?.role === "SUB_ADMIN") {
            if (!findUser?.adminPermissions?.isViewBooking) {
                throw new ForbiddenException("You don't have permission to view bookings");
            }
        }

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
                job: true,
                client: {
                    select: {
                        phone: true,
                        firstName: true,
                        lastName: true,
                    }
                },
                provider: {
                    select: {
                        phone: true,
                        firstName: true,
                        lastName: true,
                    }
                }
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
        if (booking.status === "ACCEPTED") throw new BadRequestException("Booking already accepted");
        if (booking.status === "COMPLETED") throw new BadRequestException("Booking already completed");

        const result = await this.prisma.booking.update({
            where: { id: bookingId },
            data: { status }
        });

        await this.prisma.notification.create({
            data: {
                userId: booking.clientId,
                type: `${status === "ACCEPTED" ? "BOOKING_ACCEPTED" : "BOOKING_REJECTED"}`,
                title: `Booking ${status === "ACCEPTED" ? "Accepted" : "Rejected"}`,
                message: `Your booking for ${booking.serviceName} has been ${status === "ACCEPTED" ? "accepted" : "rejected"} by the provider. Please check the details of your booking for more information.`,
            },
        })

        await this.prisma.notification.create({
            data: {
                userId: booking.providerId,
                type: `${status === "ACCEPTED" ? "BOOKING_ACCEPTED" : "BOOKING_REJECTED"}`,
                title: `Booking ${status === "ACCEPTED" ? "Accepted" : "Rejected"}`,
                message: `You have ${status === "ACCEPTED" ? "accepted" : "rejected"} the booking for ${booking.serviceName}. Please check the details of the booking for more information.`,
            },
        });

        return result;

    }


    async myBooking(userId: string, page: number, limit: number, status?: BookingStatus) {

        const skip = (page - 1) * limit;

        const totalBooking = await this.prisma.booking.count({
            where: {
                clientId: userId,
                ...(status && { status })
            }
        });

        const totalBookingAccepted = await this.prisma.booking.count({
            where: {
                clientId: userId,
                status: "ACCEPTED"
            }
        });

        const totalInProgress = await this.prisma.booking.count({
            where: {
                clientId: userId,
                status: "IN_PROGRESS"
            }
        });

        const totalComplete = await this.prisma.booking.count({
            where: {
                clientId: userId,
                status: "COMPLETED"
            }
        });

        const booking = await this.prisma.booking.findMany({
            where: {
                clientId: userId,
                ...(status && { status })
            },
            skip,
            take: limit,
            orderBy: {
                createdAt: "desc"
            }
        });

        return {
            meta: {
                total: totalBooking,
                page,
                limit,
                totalPages: Math.ceil(totalBooking / limit),
            },
            stats: {
                totalBooking,
                totalAccepted: totalBookingAccepted,
                totalInProgress,
                totalComplete
            },
            data: booking
        };
    }

    async makeBooking(userId: string, data: CreteBookingDto) {
        const createBooking = await this.prisma.booking.create({
            data: {
                clientId: userId,
                ...data
            }
        });

        await this.prisma.notification.create({
            data: {
                userId: data.providerId,
                type: 'BOOKING_NEW',
                title: 'New Booking Request',
                message: `You have a new booking request for ${data.serviceName}. Please review the details and respond to the client.`,
            },
        });

        await this.prisma.notification.create({
            data: {
                userId,
                type: 'BOOKINK_REQUESTED',
                title: 'Booking Request Sent',
                message: `Your booking request for ${data.serviceName} has been sent to the provider. You will be notified once the provider responds to your request.`,
            },
        });


        return createBooking;
    }

    async bookingCompliteInProgress(userId: string, bookingId: string, status: BookingCompliteInProgress) {
        const booking = await this.prisma.booking.findUnique({
            where: {
                id: bookingId
            }
        });

        if (!booking) throw new NotFoundException("Booking not found");

        if (booking.status === "COMPLETED") throw new BadRequestException("Booking already complite");

        if (booking.clientId !== userId || booking.providerId !== userId) {
            throw new NotFoundException("You are not permited access this route");
        };

        if (status === "COMPLETED") {
            await this.prisma.wallet.update({
                where: {
                    userId: booking.providerId
                },
                data: {
                    amount: booking.serviceAmount.toNumber()
                }
            })
        };


        const result = await this.prisma.booking.update({
            where: {
                id: bookingId
            },
            data: {
                status: status
            }
        });


        await this.prisma.notification.create({
            data: {
                userId: booking.clientId,
                type: `${status === "COMPLETED" ? "BOOKING_COMPLETED" : "BOOKING_IN_PROGRESS"}`,
                title: `Booking ${status === "COMPLETED" ? "Completed" : "In Progress"}`,
                message: `Your booking for ${booking.serviceName} has been marked as ${status === "COMPLETED" ? "completed" : "in progress"} by the provider. Please check the details of your booking for more information.`,
            },
        });


        await this.prisma.notification.create({
            data: {
                userId: booking.providerId,
                type: `${status === "COMPLETED" ? "BOOKING_COMPLETED" : "BOOKING_IN_PROGRESS"}`,
                title: `Booking ${status === "COMPLETED" ? "Completed" : "In Progress"}`,
                message: `You have marked the booking for ${booking.serviceName} as ${status === "COMPLETED" ? "completed" : "in progress"}. Please check the details of the booking for more information.`,
            }
        })

        return result;

    };

    async recentAllBooking(userId: string, page: number, limit: number) {

        const skip = (page - 1) * limit;

        const totalBooking = await this.prisma.booking.count({ where: { providerId: userId } });

        const result = await this.prisma.booking.findMany({
            where: {
                providerId: userId
            },
            take: limit,
            skip: skip
        });

        return {
            meta: {
                page,
                limit,
                skip,
                totalBooking,
                totalPage: Math.ceil(totalBooking / limit)
            },
            data: result
        }
    };


    async userTotalBooking(userId: string) {
        const totalBooking = await this.prisma.booking.count({
            where: {
                clientId: userId
            }
        });

        return totalBooking;
    }

}
