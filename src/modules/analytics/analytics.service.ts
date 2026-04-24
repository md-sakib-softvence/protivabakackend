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


    };



    async superAdminDashboardAnalytics() {
        const totalUser = await this.prisma.user.count({ where: { role: "CLIENT" } });
        const totalProvider = await this.prisma.user.count({ where: { role: "PROVIDER" } });
        const compliteBooking = await this.prisma.booking.count({ where: { status: "COMPLETED" } });
        const totalAcceptBooking = await this.prisma.booking.count({ where: { status: "ACCEPTED" } });
        const totalRejectBooking = await this.prisma.booking.count({ where: { status: "REJECTED" } });
        const totalProviderEarningFromUser = await this.prisma.payment.aggregate({ where: { status: "COMPLETED" }, _sum: { amount: true } });
        const totalGivePaymentToProvider = await this.prisma.withdrawal.aggregate({ where: { status: "COMPLETED" }, _sum: { netAmount: true } });



        const paymentAnalytecs = await this.prisma.$queryRawUnsafe(`
WITH monthly_stats AS (
    SELECT
        DATE_TRUNC('month', "createdAt") AS month_date,
        TO_CHAR(DATE_TRUNC('month', "createdAt"), 'Mon') AS month_name,

        COUNT(*)::INT AS total_bookings,

        COUNT(*) FILTER (
            WHERE status = 'ACCEPTED'
        )::INT AS total_accepted,

        COUNT(*) FILTER (
            WHERE status = 'REJECTED'
        )::INT AS total_rejected,

        COALESCE(
            SUM("totalAmount") FILTER (
                WHERE "paymentStatus" = 'COMPLETED'
            ),
            0
        )::NUMERIC AS completed_payment_total

    FROM bookings
    WHERE "createdAt" >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months'
    GROUP BY 1, 2
)

SELECT
    month_date,
    month_name,
    total_bookings,
    total_accepted,
    total_rejected,
    completed_payment_total,

    ROUND(
        (
            (completed_payment_total - LAG(completed_payment_total) OVER (ORDER BY month_date))
            / NULLIF(LAG(completed_payment_total) OVER (ORDER BY month_date), 0)
        ) * 100,
        2
    )::FLOAT AS payment_growth_percentage,

    ROUND(
        (
            (total_bookings - LAG(total_bookings) OVER (ORDER BY month_date))
            / NULLIF(LAG(total_bookings) OVER (ORDER BY month_date), 0)::NUMERIC
        ) * 100,
        2
    )::FLOAT AS booking_growth_percentage,

    ROUND(
        (
            (total_accepted - LAG(total_accepted) OVER (ORDER BY month_date))
            / NULLIF(LAG(total_accepted) OVER (ORDER BY month_date), 0)::NUMERIC
        ) * 100,
        2
    )::FLOAT AS accepted_growth_percentage,

    ROUND(
        (
            (total_rejected - LAG(total_rejected) OVER (ORDER BY month_date))
            / NULLIF(LAG(total_rejected) OVER (ORDER BY month_date), 0)::NUMERIC
        ) * 100,
        2
    )::FLOAT AS rejected_growth_percentage

FROM monthly_stats
ORDER BY month_date ASC;
`);


        const recentTransection = await this.prisma.payment.findMany({ orderBy: { createdAt: 'desc' }, take: 10 });


        const last10RecentBookign = await this.prisma.payment.findMany({ orderBy: { createdAt: "desc" }, take: 10 });

        const userLastActivity = await this.prisma.notification.findMany({ orderBy: { createdAt: "desc" }, take: 10 });

        return {
            meta: {
                totalUser,
                totalProvider,
                compliteBooking,
                totalAcceptBooking,
                totalRejectBooking,
                totalProviderEarningPayment: totalProviderEarningFromUser._sum.amount || 0,
                totalGivePaymentToProvider: totalGivePaymentToProvider._sum.netAmount || 0
            },
            analytics: paymentAnalytecs,
            recentTransection,
            last10RecentBookign,
            userLastActivity
        }


    }

}
