import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class MarketingService {
    constructor(private readonly prisma: PrismaService) { }


    async createBanner() {
        
    }

}
