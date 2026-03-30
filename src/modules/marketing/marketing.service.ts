import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateMarketingDto } from './dto/create.marketing.dto';
import { CloudinaryUploadService } from 'src/cloudinary/cloudinary.upload.service';
import { UpdateMarketingDto } from './dto/update.marketing.dto';
import { BannerStatus } from '@prisma/client';

@Injectable()
export class MarketingService {
    constructor(private readonly prisma: PrismaService, private readonly CloudinaryUploadService: CloudinaryUploadService) { }


    async createBanner(image: Express.Multer.File, data: CreateMarketingDto) {

        const upload: any = await this.CloudinaryUploadService.uploadImageFromBuffer(image.buffer, "marketing", `marketing-${Math.random()}-${Date.now()}`)

        if (!upload) throw new BadRequestException("Image upload faild")

        const create = await this.prisma.marketing.create({
            data: {
                image: upload.secure_url,
                ...data
            }
        });
        return create;
    };


    async updateBanner(id: string, image: Express.Multer.File, data: UpdateMarketingDto) {
        const existing = await this.prisma.marketing.findUnique({
            where: { id }
        });

        if (!existing) {
            throw new NotFoundException("Banner not found");
        }

        let imageUrl = existing.image;

        if (image) {
            const upload: any =
                await this.CloudinaryUploadService.uploadImageFromBuffer(
                    image.buffer,
                    "marketing",
                    `marketing-${Math.random()}-${Date.now()}`
                );

            if (!upload) {
                throw new BadRequestException("Image upload failed");
            }

            imageUrl = upload.secure_url;
        }

        const updated = await this.prisma.marketing.update({
            where: { id },
            data: {
                ...data,
                image: imageUrl,
                startDate: data.startDate ? new Date(data.startDate) : existing.startDate,
                endDate: data.endDate ? new Date(data.endDate) : existing.endDate
            }
        });

        return updated;
    }

    async updateBannerStatus(id: string, status: BannerStatus) {
        const banner = await this.prisma.marketing.findUnique({ where: { id: id } });

        if (!banner) throw new NotFoundException("Banner not found");

        const update = await this.prisma.marketing.update({
            where: {
                id: id
            },
            data: {
                status: status
            }
        });
        return update;
    };


    async deleteBanner(id: string) {
        const find = await this.prisma.marketing.findUnique({
            where: {
                id: id
            }
        });
        if (!find) throw new NotFoundException("Banner deleted success");
        const result = await this.prisma.marketing.delete({
            where: {
                id: id
            }
        });
        return result;
    }

    async getAllBannerForAdminDashboard(page = 1, limit = 10) {
        const skip = (page - 1) * limit;

        const totalActive = await this.prisma.marketing.count({ where: { status: "ACTIVE" } });
        const totalScheduled = await this.prisma.marketing.count({ where: { status: "SCHEDULED" } });
        const totalInactive = await this.prisma.marketing.count({ where: { status: "DEACTIVATED" } });
        const totalBanners = await this.prisma.marketing.count()

        const banners = await this.prisma.marketing.findMany({
            skip,
            take: limit,
            orderBy: { createdAt: "desc" }
        });
        return {
            pagination: {
                page,
                limit,
                total: totalBanners,
                totalPages: Math.ceil(totalBanners / limit)
            },
            stats: {
                active: totalActive,
                scheduled: totalScheduled,
                deactivated: totalInactive,
                total: totalBanners
            },
            data: banners
        };
    }

    async getAllBannerForUser(page = 1, limit = 10) {
        const skip = (page - 1) * limit;

        const totalBanners = await this.prisma.marketing.count({ where: { status: "ACTIVE" } })

        const banners = await this.prisma.marketing.findMany({
            where: { status: "ACTIVE" },
            skip,
            take: limit,
            orderBy: { createdAt: "desc" }
        });

        return {
            pagination: {
                page,
                limit,
                total: totalBanners,
                totalPages: Math.ceil(totalBanners / limit)
            },
            banners
        }
    }

}
