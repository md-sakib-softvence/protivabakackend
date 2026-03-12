import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ERROR_MESSAGES } from 'src/common/constants';
import { PrismaService } from 'src/prisma/prisma.service';
import { MakeWithdrawRequestCardPaymentDto, MakeWithdrawRequestMobileBankingDto } from './dto/make.withdraw.request';

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

    async approveWithdrawRequest(withdrawId: string) {

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


        return result

    }

    async rejectWithdrawRequest(withdrawId: string) {

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



        return result
    }

    async providerWallet(providerId: string) {
<<<<<<< HEAD



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

=======
        const totalWithdraeAbleAmount = await this.prisma.booking.aggregate({
            where: {
                status: "COMPLETED",
                providerId: providerId
            },
            _sum: {
                serviceAmount: true
            }
        });

>>>>>>> 633b8af78c1b669955f671553968483ae5476f32
        const totalPendingAmount = await this.prisma.booking.aggregate({
            where: {
                providerId: providerId,
                status: {
<<<<<<< HEAD
                    in: ['IN_PROGRESS', "ACCEPTED"]
=======
                    in: ['IN_PROGRESS', "ACCEPTED", "PENDING"]
>>>>>>> 633b8af78c1b669955f671553968483ae5476f32
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
<<<<<<< HEAD
                totalWithdraeAbleAmount: wallet || 0,
=======
                totalWithdraeAbleAmount: totalWithdraeAbleAmount._sum.serviceAmount || 0,
>>>>>>> 633b8af78c1b669955f671553968483ae5476f32
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

        return requestWithdraw;

    };


    async makeIBankingWithdrawRequest(userId: string, data: MakeWithdrawRequestMobileBankingDto) {
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

        return requestWithdraw;

    }

}
