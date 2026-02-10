import { Injectable, NotFoundException } from '@nestjs/common';
import { ERROR_MESSAGES } from 'src/common/constants';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UserService {

    constructor(private readonly prisma: PrismaService) { }

    async getAllProvider(page: number = 1, limit: number = 10, search?: string, status?: string) {
        const skip = (page - 1) * limit;

        const filter: any = {
            role: "PROVIDER",
        };

        if (status) {
            filter.verificationStatus = status;
        }

        if (search) {
            filter.OR = [
                { id: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
                { phone: { contains: search, mode: "insensitive" } },
                { firstName: { contains: search, mode: "insensitive" } },
                { lastName: { contains: search, mode: "insensitive" } },
            ];
        };

        const providers = await this.prisma.user.findMany({
            where: filter,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
            include: {
                _count: {
                    select: {
                        jobs: true,
                        receivedReviews: {
                            where: { isVisible: true },
                        },
                    },
                },
                receivedReviews: {
                    where: { isVisible: true },
                    select: {
                        rating: true,
                    },
                },
                providerProfile: true
            },
        });

        const total = await this.prisma.user.count({ where: filter });

        const formattedProviders = providers.map((provider) => {
            const totalReviews = provider._count.receivedReviews;
            const totalJobs = provider._count.jobs;

            const avgRating =
                provider.receivedReviews.length > 0
                    ? (
                        provider.receivedReviews.reduce(
                            (sum, review) => sum + review.rating,
                            0,
                        ) / provider.receivedReviews.length
                    ).toFixed(1)
                    : 0;

            return {
                ...provider,
                totalJobs,
                totalReviews,
                averageRating: Number(avgRating),
                receivedReviews: undefined,
            };
        });

        return {
            data: formattedProviders,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            },
        };
    }


    async providerVerificationStatusUpdate(providerId: string, status: "VERIFIED" | "REJECTED") {
        const result = await this.prisma.user.update({
            where: {
                id: providerId,
                role: "PROVIDER"
            },
            data: {
                verificationStatus: status
            }
        });

        if (!result) throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);

        return result;

    }

    async getAllUser(page: number, limit: number, search?: string, status?: "PENDING" | "ACTIVE" | "SUSPENDED" | "BANNED" | "DELETED") {

        const skip = (page - 1) * limit;

        const filter: any = {};
        filter.role = "CLIENT";
        if (status) {
            filter.status = status
        }

        if (search) {
            filter.OR = [
                { id: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
                { phone: { contains: search, mode: "insensitive" } },
                { firstName: { contains: search, mode: "insensitive" } },
                { lastName: { contains: search, mode: "insensitive" } },
            ]
        };


        const total = await this.prisma.user.count({ where: filter });

        const result = await this.prisma.user.findMany({
            where: filter,
            skip: skip,
            take: limit,
            orderBy: {
                createdAt: "desc"
            }
        })

        return {
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            },
            data: result
        }

    }


}
