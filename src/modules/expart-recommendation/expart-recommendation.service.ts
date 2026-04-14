import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ExpartRecommendationService {
    constructor(private readonly prisma: PrismaService) { }

    async makeExpartCommendation(userId: string, isRecmmendation: boolean) {
        const provider = await this.prisma.user.findUnique({ where: { id: userId } });

        if (provider?.role !== "PROVIDER") throw new NotFoundException("This user is not eligible to be an expert recommendation provider.");


        await this.prisma.user.update({
            where: { id: userId },
            data: { isProviderRecomendation: isRecmmendation }
        });

        return true

    };


    async getExpartRecommendation(page: number = 1, limit: number = 10) {
        const totalRecommendation = await this.prisma.user.count({
            where: {
                role: "PROVIDER",
                isProviderRecomendation: true,
            },
        });

        const recommendation = await this.prisma.user.findMany({
            where: {
                role: "PROVIDER",
                isProviderRecomendation: true,
            },
            skip: (page - 1) * limit,
            take: limit,
            select: {
                firstName: true,
                id : true,
                avatar : true,
                lastName: true,
                streetAddress: true,
                city: true,
                zipCode: true,
                country: true,
                verificationStatus: true,
                receivedReviews: {
                    select: {
                        rating: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        return recommendation.map((provider) => {
            const totalRating = provider.receivedReviews.reduce(
                (sum, review) => sum + review.rating,
                0
            );

            const avgRating =
                provider.receivedReviews.length > 0
                    ? totalRating / provider.receivedReviews.length
                    : 0;

            const { receivedReviews, ...providerWithoutReviews } = provider;

            return {
                ...providerWithoutReviews,
                avgRating: Number(avgRating.toFixed(1)),
            };
        });
    }

}
