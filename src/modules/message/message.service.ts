import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class MessageService {

    constructor(private readonly prisma: PrismaService) { }


    async createMessage(sanderId: string, receiverId: string, content: string, messageType: "TEXT" | "AUDIO") {
        const result = await this.prisma.message.create({
            data: {
                senderId: sanderId,
                receiverId: receiverId,
                content: content,
                messageType: messageType
            }
        });
        return result
    }

}
