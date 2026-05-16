import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import { ERROR_MESSAGES } from 'src/common/constants';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UserService {

    constructor(private readonly prisma: PrismaService) { }

    async getAllProvider(userId: string, page: number = 1, limit: number = 10, search?: string, status?: string) {

        const findUser = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                role: true,
                adminPermissions: {
                    select: {
                        isViewProvider: true
                    }
                }
            }
        });

        if (!findUser) throw new NotFoundException("Admin user not found");

        if (findUser?.role === "SUB_ADMIN") {
            if (!findUser?.adminPermissions?.isViewProvider) {
                throw new NotFoundException("You don't have permission to view provider");
            }
        }

        const skip = (page - 1) * limit;

        const filter: any = {
            role: "PROVIDER",
            status: {
                not: "DELETED"
            }
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
            }
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
    };

    async providerVerificationStatusUpdate(providerId: string, status: "VERIFIED" | "REJECTED", userId: string) {

        const findSubAdmin = await this.prisma.user.findUnique({ where: { id: userId }, include: { adminPermissions: true } });


        if (!findSubAdmin) throw new NotFoundException("User not valid");

        if (findSubAdmin.role == "CLIENT" || findSubAdmin.role == "PROVIDER") throw new BadRequestException("You are not permited access this route");

        if (findSubAdmin.role == "SUB_ADMIN") {
            if (!findSubAdmin.adminPermissions?.isManageProvider) throw new NotFoundException("You are not permited accesss this action");
        }

        const result = await this.prisma.user.update({
            where: {
                id: providerId,
                role: "PROVIDER"
            },
            data: {
                verificationStatus: status,
                status: "ACTIVE",
                emailVerified: true,
                phoneVerified: true,

            }
        });

        if (!result) throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);

        return result;

    }

    async getAllUser(userId: string, page: number, limit: number, search?: string, status?: "PENDING" | "ACTIVE" | "SUSPENDED" | "BANNED" | "DELETED") {

        const findUser = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                role: true,
                adminPermissions: {
                    select: {
                        isManageUser: true
                    }
                }
            }
        });

        if (!findUser) throw new NotFoundException("Admin user not found");
        if (findUser?.role === "SUB_ADMIN") {
            if (!findUser?.adminPermissions?.isManageUser) {
                throw new NotFoundException("You don't have permission to view user");
            }
        }

        const skip = (page - 1) * limit;

        const filter: any = {};
        filter.role = "CLIENT";

        if (status) {
            filter.status = status;
        } else {
            filter.status = {
                not: "DELETED"
            };
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

    async getSingleProviderWithReviewAndService(providerId: string) {
        const user = await this.prisma.user.findUnique({
            where: {
                id: providerId,
                role: "PROVIDER"
            },
            include: {
                jobs: true,
                receivedReviews: true,
                _count: {
                    select: {
                        jobs: true,
                        receivedReviews: true
                    }
                }
            }
        });

        const agvReview = await this.prisma.review.aggregate({
            where: {
                receiverId: providerId
            },
            _avg: {
                rating: true
            }
        })

        if (!user) throw new NotFoundException("User not found");

        return {
            avgReview: agvReview._avg.rating || 0,
            ...user
        };

    };

    async deleteUser(adminUserId: string, userId: string) {

        const findUser = await this.prisma.user.findUnique({
            where: { id: adminUserId },
            select: {
                role: true,
                adminPermissions: {
                    select: {
                        isManageUser: true
                    }
                }
            }
        });

        if (!findUser) throw new NotFoundException("Admin user not found");

        if (findUser?.role === "SUB_ADMIN") {
            if (!findUser?.adminPermissions?.isManageUser) {
                throw new NotFoundException("You don't have permission to delete user");
            }
        };

        const user = await this.prisma.user.findUnique({
            where: {
                id: userId
            }
        });

        if (!user) throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);

        const result = await this.prisma.user.update({
            where: {
                id: userId
            },
            data: {
                status: "DELETED"
            }
        });

        if (!result) throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);

        return result;
    }

    async getAllSubAdmin(
        page: number,
        limit: number,
        status?: UserStatus,
        search?: string
    ) {
        const whereCondition: any = {
            role: "SUB_ADMIN",
        };

        // // ✅ status filter
        // if (status) {
        //     whereCondition.status = status;
        // }

        if (status) {
            whereCondition.status = status;
        } else {
            whereCondition.status = {
                not: "DELETED"
            };
        }

        // ✅ search filter (⚠️ only existing fields ব্যবহার করো)
        if (search) {
            whereCondition.OR = [
                {
                    email: {
                        contains: search,
                        mode: "insensitive",
                    },
                },
                {
                    phone: {
                        contains: search,
                        mode: "insensitive",
                    },
                },
            ];
        };

        const admins = await this.prisma.user.findMany({
            where: whereCondition,
            skip: (page - 1) * limit,
            take: limit,
            orderBy: {
                createdAt: "desc",
            },
        });

        const total = await this.prisma.user.count({
            where: whereCondition,
        });

        return {
            data: admins,
            meta: {
                total,
                page,
                limit,
                totalPage: Math.ceil(total / limit),
            },
        };
    }

    async deleteSubAdminPermanent(adminUserId: string, subAdminId: string) {
        const adminUser = await this.prisma.user.findUnique({
            where: { id: adminUserId },
            select: { role: true }
        });

        if (!adminUser || adminUser.role !== 'SUPER_ADMIN') {
            throw new ForbiddenException("Only Super Admin can perform this action");
        }

        const subAdmin = await this.prisma.user.findUnique({
            where: { id: subAdminId },
            select: { role: true }
        });

        if (!subAdmin) {
            throw new NotFoundException("Sub-admin not found");
        }

        if (subAdmin.role !== 'SUB_ADMIN') {
            throw new BadRequestException("The user to delete is not a sub-admin");
        }

        // Permanent delete - this will cascade to notifications, permissions, etc.
        const result = await this.prisma.user.delete({
            where: { id: subAdminId }
        });

        return result;
    }

}
