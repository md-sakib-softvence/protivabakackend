import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateJobDto } from './dto/create.job.dto';
import { ERROR_MESSAGES } from 'src/common/constants';
import { CloudinaryUploadService } from 'src/cloudinary/cloudinary.upload.service';
import slugify from 'slugify';
import { UpdateJobDto, UpdateJobDtoPro } from './dto/update.job.dto';
import * as admin from 'firebase-admin';

@Injectable()
export class JobService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly cloudinary: CloudinaryUploadService,
        @Inject('FIREBASE_MESSAGING')
        private readonly messaging: admin.messaging.Messaging,
    ) { }



    async createJob(data: CreateJobDto, userId: string, images: Express.Multer.File) {

        const user = await this.prisma.user.findUnique({ where: { id: userId } });

        if (!user) throw new NotFoundException("User not valid");

        if (!user.providerServiceAvailability) throw new NotFoundException("Your account is currently unavailable due to administrative restrictions. Please contact support for more information.");

        const isExistService = await this.prisma.job.findFirst({
            where: {
                userId,
                categoryId: data.categoryId,
                subCategoryId: data.subCategoryId,
                title: data.title,
            },
        });

        if (isExistService) {
            throw new BadRequestException(ERROR_MESSAGES.DUPLICATE_ENTRY);
        }

        // let imageUrls: string[] = [];

        // if (images?.length) {
        //     const uploadResults = await Promise.all(
        //         images.map((file) => this.cloudinary.uploadImageFromBuffer(file.buffer, 'jobs', `${Date.now()}-${file.originalname}`))
        //     );

        //     imageUrls = uploadResults.map((res: any) => res.secure_url);
        // }

        const upload: any = await this.cloudinary.uploadImageFromBuffer(images.buffer, "jobs", `${Date.now()}-${images.originalname}`);

        console.log(upload);

        const slug = slugify(data.title, { lower: true, strict: true });

        const result = await this.prisma.job.create({
            data: {
                userId,
                categoryId: data.categoryId,
                subCategoryId: data.subCategoryId,
                title: data.title,
                slug,
                basePrice: data.basePrice,
                priceType: data.priceType,
                description: data.description,
                thumbnail: upload.secure_url,
                status: data.status ?? 'DRAFT',
                includeService: data.includeService,
            },
        });

        return result;
    };


    async getAllJobForUserHomePage(isPopuler: boolean, page: number, limit: number) {
        const skip = (page - 1) * limit;

        const whereCondition: any = {};

        if (isPopuler) {
            whereCondition.isPopuler = true;
        }

        const result = await this.prisma.job.findMany({
            where: whereCondition,
            skip: skip,
            take: limit,
            orderBy: {
                createdAt: "desc"
            },
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true
                    }
                }
            }
        });
        //cmntym2og00031wbgt2z0knsz cmntylmxe00021wbgftf9afuf cmntylmxe00021wbgftf9afuf cmntym2og00031wbgt2z0knsz

        const total = await this.prisma.job.count({
            where: whereCondition,
        });

        return {
            meta: {
                total,
                page,
                limit,
                totalPage: Math.ceil(total / limit),
            },
            data: result,
        };
    }

    async getSingleJob(jobId: string) {
        const result = await this.prisma.job.findUnique({
            where: {
                id: jobId
            },
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true
                    }
                }
            }
        });

        if (!result) throw new NotFoundException(ERROR_MESSAGES.RECORD_NOT_FOUND);

        return result

    };

    async updateJob(jobId: string, data: UpdateJobDto, images: Express.Multer.File[] | undefined, userId: string) {
        const job = await this.prisma.job.findUnique({
            where: { id: jobId },
            select: {
                id: true,
                userId: true,
                title: true,
                includeService: true,
                images: true,
            }
        });

        if (!job || job.userId !== userId) {
            throw new NotFoundException(ERROR_MESSAGES.RECORD_NOT_FOUND);
        }

        function isValidValue(value: any): boolean {
            return value !== undefined && value !== null && value !== '';
        }

        const updateData: any = {};

        if (isValidValue(data.title)) {
            updateData.title = data.title;
            if (data.title !== job.title) {
                updateData.slug = slugify(data.title as string, {
                    lower: true,
                    strict: true
                });
            }
        }

        const scalarFields = ['description', 'basePrice', 'priceType', 'status', 'categoryId', 'subCategoryId'];

        for (const field of scalarFields) {
            if (isValidValue(data[field])) {
                updateData[field] = data[field];
            }
        }

        let finalIncludeService = [...(job.includeService || [])];

        if (
            Array.isArray(data.includeServiceRemove) &&
            data.includeServiceRemove.length > 0
        ) {
            finalIncludeService = finalIncludeService.filter(
                (item) => !data.includeServiceRemove!.includes(item),
            );
        }

        if (Array.isArray(data.includeService) && data.includeService.length > 0) {
            finalIncludeService = data.includeService;
        }

        if (
            (data.includeServiceRemove?.length ?? 0) > 0 ||
            (data.includeService?.length ?? 0) > 0
        ) {
            updateData.includeService = finalIncludeService;
        }



        let finalImages = [...(job.images || [])];

        if (Array.isArray(data.removedImages) && data.removedImages.length > 0) {
            finalImages = finalImages.filter(
                (img) => !data.removedImages!.includes(img),
            );

        }

        if (images && images.length > 0) {
            const uploaded = await Promise.all(
                images.map((file) =>
                    this.cloudinary.uploadImageFromBuffer(
                        file.buffer,
                        'jobs',
                        `${Date.now()}-${file.originalname}`,
                    ),
                ),
            );
            finalImages.push(...uploaded.map((r: any) => r.secure_url));
        }

        if (
            (Array.isArray(data.removedImages) && data.removedImages.length > 0) ||
            (Array.isArray(images) && images.length > 0)
        ) {
            updateData.images = finalImages;
        }

        if (Object.keys(updateData).length === 0) {
            return job;
        }

        return this.prisma.job.update({
            where: { id: jobId },
            data: updateData,
        });
    }

    async getMyAllJob(userId: string, page: number, limit: number) {

        const skip = (page - 1) * limit

        const total = await this.prisma.job.count({
            where: {
                userId: userId
            }
        })

        const result = await this.prisma.job.findMany({
            where: {
                userId: userId
            },
            take: limit,
            skip: skip,
            orderBy: {
                createdAt: "desc"
            }
        });

        return {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            result,
        };

    }

    async getAllActiveJob(userId: string, page: number, limit: number) {

        const skip = (page - 1) * limit;

        const total = await this.prisma.job.count({
            where: {
                userId: userId,
                status: "ACTIVE"
            }
        });


        const result = await this.prisma.job.findMany({
            where: {
                userId: userId,
                status: "ACTIVE"
            },
            take: limit,
            skip: skip,
            orderBy: {
                createdAt: "desc"
            }
        });

        return {
            page,
            limit,
            skip,
            totalPage: Math.ceil(total / limit),
            data: result
        }

    }

    async singleJobWithReview(jobId: string) {
        const job = await this.prisma.job.findUnique({
            where: {
                id: jobId
            },
            include: {
                reviews: true
            }
        });

        if (!job) throw new NotFoundException("Job Not Found");

        return job;
    }


    async updateJObContent(userId: string, jobId: string, data: UpdateJobDtoPro) {
        const user = await this.prisma.user.findUnique({
            where: {
                id: userId
            }
        });

        if (!user) throw new NotFoundException("User not found");

        const job = await this.prisma.job.findUnique({
            where: {
                id: jobId
            }
        });

        if (!job) throw new NotFoundException("Job not found");

        if (userId !== job?.userId) {
            throw new BadRequestException("You are not permited access this route.");
        };

        if (!user.providerServiceAvailability) throw new NotFoundException("Your account is currently unavailable due to administrative restrictions. Please contact support for more information.");

        const update = await this.prisma.job.update({
            where: {
                id: jobId
            },
            data: {
                title: data.title,
                description: data.description,
                basePrice: data.basePrice,
                priceType: data.priceType,
                includeService: data.includeService
            }
        });
        return update;
    }

    async updateJObThumbnail(userId: string, jobId: string, thumbnail: Express.Multer.File) {
        const user = await this.prisma.user.findUnique({
            where: {
                id: userId
            }
        });

        if (!user) throw new NotFoundException("User not found");

        if (!user.providerServiceAvailability) throw new NotFoundException("Your account is currently unavailable due to administrative restrictions. Please contact support for more information.");


        const job = await this.prisma.job.findUnique({
            where: {
                id: jobId
            }
        });

        if (!job) throw new NotFoundException("Job not found");

        if (userId !== job?.userId) {
            throw new BadRequestException("You are not permited access this route.");
        };

        const upload: any = await this.cloudinary.uploadImageFromBuffer(thumbnail.buffer, "jobs", `${Date.now()}-${thumbnail.originalname}`);

        const update: any = await this.prisma.job.update({
            where: {
                id: jobId
            },
            data: {
                thumbnail: upload.secure_url
            }
        });

        return update;

    }


    async makePopuler(jobId: string, isPopuler: boolean) {

        const job = await this.prisma.job.findUnique({
            where: {
                id: jobId
            }
        });

        if (!job) throw new NotFoundException("Job not found");

        await this.prisma.job.update({
            where: {
                id: jobId
            },
            data: {
                isPopuler: isPopuler
            }
        })

    };


    async deleteJob(userId: string, jobId: string) {
        const job = await this.prisma.job.findUnique({
            where: {
                id: jobId
            }
        });

        if (!job) throw new NotFoundException("Job not found");

        if (userId !== job.userId) throw new NotFoundException("You are not job owner.");

        await this.prisma.job.delete({
            where: {
                id: jobId
            }
        });

        return true

    }

    async HomeSearch(search: string) {
        const result = await this.prisma.$queryRawUnsafe(
            `SELECT * FROM "jobs"
     WHERE "deletedAt" IS NULL
     AND (
       title ILIKE $1
       OR description ILIKE $1
     )
     ORDER BY "createdAt" DESC
     LIMIT 10`,
            `%${search}%`
        );

        return result;
    };


    async providerServiceDetails(providerId: string) {
        const jobs = await this.prisma.job.findMany({
            where: {
                userId: providerId
            },
            select: {
                bookings: true
            }
        });

        if (!jobs) throw new NotFoundException("No jobs found for this provider");

        return jobs;
    }

    async serviceAvailability(providerId: string, value: boolean) {
        const user = await this.prisma.user.findUnique({
            where: {
                id: providerId
            }
        });

        if (!user) throw new NotFoundException("User not found");

        const update = await this.prisma.user.update({
            where: {
                id: providerId
            },
            data: {
                providerServiceAvailability: value
            }
        });

        return {
            isAvailable: update.providerServiceAvailability
        };
    }

}
