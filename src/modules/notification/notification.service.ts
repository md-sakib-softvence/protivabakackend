import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NotificationService {

    constructor(private readonly prisma: PrismaService) { }


    async getMyNotification(userId: string) {
        const notification = await this.prisma.notification.findMany({
            where: {
                userId: userId
            },
            take: 20,
            orderBy: {
                createdAt: "desc"
            }
        });
        return notification;

    }

    async isReadUpdate(notificationId: string) {
        await this.prisma.notification.update({
            where: {
                id: notificationId
            },
            data: {
                isRead: true
            }
        });
    }

}
