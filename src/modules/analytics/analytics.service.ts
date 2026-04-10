import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AnalyticsService {
    constructor(private prisma: PrismaService) { }

    async subAdminDashboardAnalytics(userId: string) {
        const totalBooking = await this.prisma.booking.count({});
        const totalAcceptBooking = await this.prisma.booking.count({ where: { status: "ACCEPTED" } });
        const totalRejectBooking = await this.prisma.booking.count({ where: { status: "REJECTED" } });
        const totalInProgressBooking = await this.prisma.booking.count({ where: { status: "IN_PROGRESS" } });
        const totalCompliteBooking = await this.prisma.booking.count({ where: { status: "COMPLETED" } });

        const myPermissions = await this.prisma.adminPermission.findUnique({ where: { userId: userId } });

        const userRecentActivity = await this.prisma.notification.findMany({ take: 10 });


        return {
            meta: {
                totalBooking,
                totalAcceptBooking,
                totalRejectBooking,
                totalInProgressBooking,
                totalCompliteBooking
            },
            myPermissions,
            userRecentActivity
        }


    }

}
