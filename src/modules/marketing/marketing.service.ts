import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateMarketingDto } from './dto/create.marketing.dto';
import { CloudinaryUploadService } from 'src/cloudinary/cloudinary.upload.service';
import { UpdateMarketingDto } from './dto/update.marketing.dto';
import { BannerStatus, Prisma } from '@prisma/client';

type MarketingOptionalData = Partial<Pick<Prisma.MarketingCreateInput, 'title' | 'description' | 'link' | 'startDate' | 'endDate'>>;

@Injectable()
export class MarketingService {
    constructor(private readonly prisma: PrismaService, private readonly CloudinaryUploadService: CloudinaryUploadService) { }

    private getOptionalText(value?: string | null): string | undefined {
        if (typeof value !== 'string') return undefined;

        const trimmedValue = value.trim();
        return trimmedValue.length > 0 ? trimmedValue : undefined;
    }

    private getOptionalDate(value: string | undefined, fieldName: string): Date | undefined {
        const textValue = this.getOptionalText(value);
        if (!textValue) return undefined;

        const date = new Date(textValue);
        if (Number.isNaN(date.getTime())) {
            throw new BadRequestException(`${fieldName} must be a valid date`);
        }

        return date;
    }

    private buildMarketingData(data: CreateMarketingDto | UpdateMarketingDto): MarketingOptionalData {
        const createData: MarketingOptionalData = {};
        const title = this.getOptionalText(data.title);
        const description = this.getOptionalText(data.description);
        const link = this.getOptionalText(data.link);
        const startDate = this.getOptionalDate(data.startDate, 'startDate');
        const endDate = this.getOptionalDate(data.endDate, 'endDate');

        if (title) createData.title = title;
        if (description) createData.description = description;
        if (link) createData.link = link;
        if (startDate) createData.startDate = startDate;
        if (endDate) createData.endDate = endDate;

        return createData;
    }

    async createBanner(image: Express.Multer.File, data: CreateMarketingDto, userId: string) {

        const findSubAdmin = await this.prisma.user.findUnique({ where: { id: userId }, include: { adminPermissions: true } });


        if (!findSubAdmin) throw new NotFoundException("User not valid");

        if (findSubAdmin.role == "CLIENT" || findSubAdmin.role == "PROVIDER") throw new BadRequestException("You are not permited access this route");

        if (findSubAdmin.role == "SUB_ADMIN") {
            if (!findSubAdmin.adminPermissions?.isManageWithdrawal) throw new NotFoundException("You are not permited accesss this action");
        }

        if (!image) {
            throw new BadRequestException("Image is required");
        }

        const upload: any = await this.CloudinaryUploadService.uploadImageFromBuffer(image.buffer, "marketing", `marketing-${Math.random()}-${Date.now()}`)

        if (!upload) throw new BadRequestException("Image upload faild")

        const createData: Prisma.MarketingCreateInput = {
            ...this.buildMarketingData(data),
            image: upload.secure_url,
        };

        const create = await this.prisma.marketing.create({
            data: createData,
        });

        return create;
    };

    async updateBanner(id: string, image: Express.Multer.File, data: UpdateMarketingDto, userId: string) {


        const findSubAdmin = await this.prisma.user.findUnique({ where: { id: userId }, include: { adminPermissions: true } });


        if (!findSubAdmin) throw new NotFoundException("User not valid");

        if (findSubAdmin.role == "CLIENT" || findSubAdmin.role == "PROVIDER") throw new BadRequestException("You are not permited access this route");

        if (findSubAdmin.role == "SUB_ADMIN") {
            if (!findSubAdmin.adminPermissions?.isManageWithdrawal) throw new NotFoundException("You are not permited accesss this action");
        }

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
        const updateData: Prisma.MarketingUpdateInput = {
            ...this.buildMarketingData(data),
            image: imageUrl,
        };

        const updated = await this.prisma.marketing.update({
            where: { id },
            data: updateData,
        });

        return updated;
    }

    async updateBannerStatus(id: string, status: BannerStatus, userId: string) {


        const findSubAdmin = await this.prisma.user.findUnique({ where: { id: userId }, include: { adminPermissions: true } });


        if (!findSubAdmin) throw new NotFoundException("User not valid");

        if (findSubAdmin.role == "CLIENT" || findSubAdmin.role == "PROVIDER") throw new BadRequestException("You are not permited access this route");

        if (findSubAdmin.role == "SUB_ADMIN") {
            if (!findSubAdmin.adminPermissions?.isManageWithdrawal) throw new NotFoundException("You are not permited accesss this action");
        }

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


    async deleteBanner(id: string, userId: string) {

        const findSubAdmin = await this.prisma.user.findUnique({ where: { id: userId }, include: { adminPermissions: true } });


        if (!findSubAdmin) throw new NotFoundException("User not valid");

        if (findSubAdmin.role == "CLIENT" || findSubAdmin.role == "PROVIDER") throw new BadRequestException("You are not permited access this route");

        if (findSubAdmin.role == "SUB_ADMIN") {
            if (!findSubAdmin.adminPermissions?.isManageWithdrawal) throw new NotFoundException("You are not permited accesss this action");
        }

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
