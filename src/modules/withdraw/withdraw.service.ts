import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ERROR_MESSAGES } from 'src/common/constants';
import { PrismaService } from 'src/prisma/prisma.service';
import { MakeWithdrawRequestCardPaymentDto, MakeWithdrawRequestMobileBankingDto } from './dto/make.withdraw.request';
import * as admin from 'firebase-admin';

@Injectable()
export class WithdrawService {
    constructor(private readonly prisma: PrismaService, @Inject('FIREBASE_MESSAGING') private readonly messaging: admin.messaging.Messaging) { }

    async sentNotification(userId: string, title: string, body: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) return;

        if (
            (user.role === "CLIENT" || user.role === "PROVIDER") &&
            user.isNotificationEnabled &&
            user.fcmToken
        ) {
            try {
                await this.messaging.send({
                    token: user.fcmToken,
                    notification: {
                        title,
                        body,
                    },
                    data: {
                        type: "PUSH_NOTIFICATION",
                        userId: user.id,
                    },
                });

            } catch (error: any) {

                if (
                    error.code === "messaging/registration-token-not-registered" ||
                    error.code === "messaging/invalid-registration-token"
                ) {
                    await this.prisma.user.update({
                        where: { id: userId },
                        data: { fcmToken: null }
                    });
                }

                console.log("FCM failed but ignored");
            }
        }
    }

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

    async getMyWithdraw(userId: string, page: number, limit: number, status?: "PENDING" | "APPROVED" | "PROCESSING" | "COMPLETED" | "REJECTED" | "CANCELLED") {
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
            paginate: {
                page,
                limit,
                total,
                totalPage: Math.ceil(total / limit)
            },
            data
        }

    }

    async approveWithdrawRequest(withdrawId: string, userId: string) {

        const findSubAdmin = await this.prisma.user.findUnique({ where: { id: userId }, include: { adminPermissions: true } });


        if (!findSubAdmin) throw new NotFoundException("User not valid");

        if (findSubAdmin.role == "CLIENT" || findSubAdmin.role == "PROVIDER") throw new BadRequestException("You are not permited access this route");

        if (findSubAdmin.role == "SUB_ADMIN") {
            if (!findSubAdmin.adminPermissions?.isManageWithdrawal) throw new NotFoundException("You are not permited accesss this action");
        }


        const ckeck = await this.prisma.withdrawal.findUnique({
            where: {
                id: withdrawId
            }
        })

        if (!ckeck) throw new NotFoundException(ERROR_MESSAGES.RECORD_NOT_FOUND)

        const result = await this.prisma.withdrawal.update({
            where: {
                id: withdrawId
            },
            data: {
                status: "APPROVED"
            }
        });

        await this.prisma.notification.create({
            data: {
                userId: result.userId,
                type: "WITHDRAWAL_APPROVED",
                title: "You Withdraw request approved",
                message: `Your withdrawal request ${ckeck.amount} has been approved. We are currently processing your transaction, and the amount will be credited to your account shortly. Thank you for your patience.`
            }
        });

        await this.sentNotification(result.userId, "You Withdraw request approved", `Your withdrawal request ${ckeck.amount} has been approved. We are currently processing your transaction, and the amount will be credited to your account shortly. Thank you for your patience.`)

        return result

    }

    async rejectWithdrawRequest(withdrawId: string, userId: string) {


        const findSubAdmin = await this.prisma.user.findUnique({ where: { id: userId }, include: { adminPermissions: true } });


        if (!findSubAdmin) throw new NotFoundException("User not valid");

        if (findSubAdmin.role == "CLIENT" || findSubAdmin.role == "PROVIDER") throw new BadRequestException("You are not permited access this route");

        if (findSubAdmin.role == "SUB_ADMIN") {
            if (!findSubAdmin.adminPermissions?.isManageWithdrawal) throw new NotFoundException("You are not permited accesss this action");
        }

        const ckeck = await this.prisma.withdrawal.findUnique({
            where: {
                id: withdrawId
            }
        })

        if (!ckeck) throw new NotFoundException(ERROR_MESSAGES.RECORD_NOT_FOUND)

        const result = await this.prisma.withdrawal.update({
            where: {
                id: withdrawId
            },
            data: {
                status: "REJECTED"
            }
        });

        await this.prisma.notification.create({
            data: {
                userId: ckeck.userId,
                type: 'WITHDRAWAL_REJECTED',
                title: 'Withdraw Request Rejected',
                message: `We regret to inform you that your withdraw request of amount ${ckeck.amount} has been rejected. If you have any questions or need further assistance, please contact our support team.`,
            },
        });

        await this.sentNotification(ckeck.userId, "Withdraw Request Rejected", `We regret to inform you that your withdraw request of amount ${ckeck.amount} has been rejected. If you have any questions or need further assistance, please contact our support team.`)

        return result
    }

    async providerWallet(providerId: string) {





        let wallet = await this.prisma.wallet.findUnique({
            where: {
                userId: providerId
            }
        });

        if (!wallet) {
            wallet = await this.prisma.wallet.create({
                data: {
                    userId: providerId,
                    amount: 0
                }
            })
        }

        // const totalWithdraeAbleAmount = await this.prisma.booking.aggregate({
        //     where: {
        //         status: "COMPLETED",
        //         providerId: providerId
        //     },
        //     _sum: {
        //         serviceAmount: true
        //     }
        // });


        const avarageRating = await this.prisma.review.aggregate({
            where: {
                receiverId: providerId
            },
            _avg: {
                rating: true
            }
        });

        const totalReview = await this.prisma.review.count({ where: { receiverId: providerId } });


        const totalPendingAmount = await this.prisma.booking.aggregate({
            where: {
                providerId: providerId,
                status: {
                    in: ['IN_PROGRESS', "ACCEPTED"]
                }
            },
            _sum: {
                serviceAmount: true
            }
        })

        const totalWithdrawAmount = await this.prisma.withdrawal.aggregate({
            where: {
                userId: providerId,
                status: "APPROVED"
            },
            _sum: {
                amount: true
            }
        });

        const totalBooking = await this.prisma.booking.count({
            where: {
                providerId: providerId
            }
        })

        const totalBookingServed = await this.prisma.booking.count({
            where: {
                providerId: providerId,
                status: {
                    notIn: ["PENDING"]
                }
            }
        })

        return {
            withdraw: {
                totalWithdraeAbleAmount: wallet || 0,
                totalWithdrawAmount: totalWithdrawAmount._sum.amount || 0,
                totalPendingAmount: totalPendingAmount._sum.serviceAmount || 0
            },
            booking: {
                totalBooking,
                totalBookingServed
            }
        }
    }

    async makeCardWithdrawRequest(userId: string, data: MakeWithdrawRequestCardPaymentDto) {

        const user = await this.prisma.user.findUnique({
            where: {
                id: userId
            }
        });

        if (!user) throw new NotFoundException("User not found");

        if (!user.providerServiceAvailability) throw new NotFoundException("Your account is currently unavailable due to administrative restrictions. Please contact support for more information.");

        const wallet = await this.prisma.wallet.findUnique({
            where: {
                userId: userId
            }
        });

        if (!wallet) throw new NotFoundException("Wallet not found");
        if (wallet.userId !== userId) throw new BadRequestException("You are not permitted to access this route");
        if (wallet.amount < data.amount) throw new BadRequestException(`Insufficient balance. Your wallet has ${wallet.amount}, but you tried to withdraw ${data.amount}.`);

        const requestWithdraw = await this.prisma.withdrawal.create({
            data: {
                userId: userId,
                bankType: "CARD_PAYMENT",
                ...data
            }
        });

        await this.prisma.notification.create({
            data: {
                userId,
                type: 'WITHDRAW_REQUEST',
                title: 'Withdraw Request Submitted',
                message: `Your withdraw request of amount ${data.amount} has been submitted successfully. Our team will review your request and process it shortly. You can check the status of your withdraw request in the "My Withdrawals" section of your account.`,
            }
        });

        await this.sentNotification(userId, "Withdraw Request Submitted", `Your withdraw request of amount ${data.amount} has been submitted successfully. Our team will review your request and process it shortly. You can check the status of your withdraw request in the "My Withdrawals" section of your account.`);

        return requestWithdraw;

    };


    async makeIBankingWithdrawRequest(userId: string, data: MakeWithdrawRequestMobileBankingDto) {

        const user = await this.prisma.user.findUnique({
            where: {
                id: userId
            }
        });

        if (!user) throw new NotFoundException("User not found");

        if (!user.providerServiceAvailability) throw new NotFoundException("Your account is currently unavailable due to administrative restrictions. Please contact support for more information.");

        const wallet = await this.prisma.wallet.findUnique({
            where: {
                userId: userId
            }
        });

        if (!wallet) throw new NotFoundException("Wallet not found");
        if (wallet.userId !== userId) throw new BadRequestException("You are not permitted to access this route");
        if (wallet.amount < data.amount) throw new BadRequestException(`Insufficient balance. Your wallet has ${wallet.amount}, but you tried to withdraw ${data.amount}.`);


        const requestWithdraw = await this.prisma.withdrawal.create({
            data: {
                userId: userId,
                bankType: "MOBILE_BANKING",
                ...data
            }
        });


        await this.prisma.notification.create({
            data: {
                userId,
                type: 'WITHDRAW_REQUEST',
                title: 'Withdraw Request Submitted',
                message: `Your withdraw request of amount ${data.amount} has been submitted successfully. Our team will review your request and process it shortly. You can check the status of your withdraw request in the "My Withdrawals" section of your account.`,
            }
        });


        await this.sentNotification(userId, "Withdraw Request Submitted", `Your withdraw request of amount ${data.amount} has been submitted successfully. Our team will review your request and process it shortly. You can check the status of your withdraw request in the "My Withdrawals" section of your account.`);

        return requestWithdraw;

    }

}
