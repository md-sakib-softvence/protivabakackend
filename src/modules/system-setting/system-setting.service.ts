import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SystemSettingService implements OnModuleInit {

    private settings: Record<string, any> = {};

    constructor(private prisma: PrismaService) { }

    async onModuleInit() {
        // Seed platform fee if it doesn't exist
        const platformFee = await this.prisma.systemSetting.findUnique({
            where: { key: 'platform_fee' }
        });

        if (!platformFee) {
            await this.prisma.systemSetting.create({
                data: {
                    key: 'platform_fee',
                    value: 10
                }
            });
        }

        await this.loadSettings();
    }

    async loadSettings() {
        const data = await this.prisma.systemSetting.findMany();

        this.settings = data.reduce((acc, item) => {
            acc[item.key] = item.value;
            return acc;
        }, {});
    }

    get(key: string) {
        return this.settings[key];
    }

    async getAllSettings() {
        return await this.prisma.systemSetting.findUnique({
            where: {
                key: "platform_fee"
            }
        });
    }

    async updateSetting(key: "platform_fee", value: number) {
        const result = await this.prisma.systemSetting.upsert({
            where: { key },
            update: { value },
            create: { key, value }
        });

        await this.loadSettings();
        return result;
    }

    async refresh() {
        await this.loadSettings();
    }

}
