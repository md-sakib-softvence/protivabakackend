import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class WithdrawService {
    constructor(private readonly prisma: PrismaService) { }

    async getAllWithdrow(page: number, limit: number, search?: string, status?: "PENDING" | "APPROVED" | "PROCESSING" | "COMPLETED" | "REJECTED" | "CANCELLED") {
        const skip = (page - 1) * limit;

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const filter: any = {}

        if (status) {
            filter.status = status;
        }

        if (search) {
            filter.OR = [
                { id: { contains: search, mode: "insensitive" } },
                { accountNumber: { contains: search, mode: "insensitive" } },
                { accountHolderName: { contains: search, mode: "insensitive" } }
            ]
        };

        const total = await this.prisma.withdrawal.count({
            where: filter
        });

        const totalPending = await this.prisma.withdrawal.count({
            where: {
                status: "PENDING"
            }
        });

        const totalPendingAmount = await this.prisma.withdrawal.aggregate({
            where: {
                status: "PENDING"
            },
            _sum: {
                amount: true
            }
        });

        const todayApproved = await this.prisma.withdrawal.count({
            where: {
                status: "APPROVED",
                updatedAt: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            }
        })

        const data = await this.prisma.withdrawal.findMany({
            where: filter,
            skip: skip,
            take: limit,
            orderBy: {
                createdAt: "asc"
            }
        });


        return {
            pagination: {
                total,
                skip,
                limit,
                page,
                totalPage: Math.ceil(total / limit)
            },
            meta: {
                totalPending,
                totalPendingAmount: totalPendingAmount._sum.amount || 0,
                todayApproved
            },
            data
        }

    }

    async getMyWithdraw(userId: string, page: number, limit: number, search: number, status?: "PENDING" | "APPROVED" | "PROCESSING" | "COMPLETED" | "REJECTED" | "CANCELLED") {
        const skip = (page - 1) * limit;

        const filter: any = {}
        filter.userId = userId;

        if (status) {
            filter.status = status;
        }

        const total = await this.prisma.withdrawal.count({ where: filter });

        const data = await this.prisma.withdrawal.findMany({
            where: filter,
            skip,
            take: limit,
            orderBy: {
                createdAt: "desc"
            }
        });

        return {
            paginate : {}
        }

    }

}
