import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ToggleNotificationDto } from './dto/toggle.notification.dto';

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

    async toggleNotification(userId: string, dto: ToggleNotificationDto) {

        const user = await this.prisma.user.findUnique({
            where: {
                id: userId
            }
        });

        if(!user) throw new NotFoundException('User not found');

     if(dto.enabled) {
        await this.prisma.user.update({
            where: {
                id: userId
            },
            data: {
              isNotificationEnabled: true
            }
        });
     }else{
        await this.prisma.user.update({
            where: {
                id: userId
            },
            data: {
              isNotificationEnabled: false
            }
        });
     }

        return { status: dto.enabled ? 'enabled' : 'disabled' };

    }

    async clearReadNotification(userId : string){
        const result = await this.prisma.notification.updateMany({where : {userId : userId} , data : {isRead : true}});

        return result

    };


    async deleteAllNotification(userId : string){
        const result = await this.prisma.notification.deleteMany({where : {userId : userId}});
        return result;
    }

}
