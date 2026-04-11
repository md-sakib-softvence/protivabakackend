import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class TransectionService {
    constructor(private prisma: PrismaService) { }

    async getAllTransection(page: number, limit: number) {

        const transections = await this.prisma.payment.findMany({
            skip: (page - 1) * limit,
            take: limit,
            orderBy: {
                createdAt: "desc",
            },
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                        streetAddress: true,
                        city: true,
                        zipCode: true,
                        contactInfo: true,
                        phone: true,
                        email: true
                    },
                    include: {
                        jobs: {
                            select: {
                                title: true
                            }
                        }
                    }
                }
            }
        });

        const total = await this.prisma.payment.count();

        return {
            data: transections,
            meta: {
                total,
                page,
                limit,
                totalPage: Math.ceil(total / limit),
            },
        };
    }


}
