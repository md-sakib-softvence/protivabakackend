import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateSubCategoryDto } from './dto/create.sub.category.dto';
import { UpdateSubCategoryDto } from './dto/update.sub.category.dto';

@Injectable()
export class SubCategoryService {
    constructor(private readonly prisma: PrismaService) { }


    private slugify(text: string): string {
        return text
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)+/g, '');
    }


    private async generateUniqueSlug(
        categoryId: string,
        name: string,
    ): Promise<string> {
        const baseSlug = this.slugify(name);
        let slug = baseSlug;
        let counter = 1;

        while (true) {
            const exists = await this.prisma.subCategory.findFirst({
                where: {
                    categoryId,
                    slug,
                },
                select: { id: true },
            });

            if (!exists) break;

            slug = `${baseSlug}-${counter}`;
            counter++;
        }

        return slug;
    }

    async createSubCategory(data: CreateSubCategoryDto) {

        const categoryExists = await this.prisma.category.findUnique({
            where: { id: data.categoryId },
            select: { id: true },
        });

        if (!categoryExists) {
            throw new NotFoundException('Category not found');
        }

        const slug = await this.generateUniqueSlug(
            data.categoryId,
            data.name,
        );

        return this.prisma.subCategory.create({
            data: {
                categoryId: data.categoryId,
                name: data.name,
                slug,
                description: data.description,
                icon: data.icon,
                image: data.image,
                isActive: data.isActive ?? true,
            },
        });
    }


    async updateSubCategory(id: string, data: UpdateSubCategoryDto) {
        const subCategory = await this.prisma.subCategory.findUnique({
            where: { id },
        });
        if (!subCategory) throw new NotFoundException('Sub-category not found');

        let updatedSlug = subCategory.slug;
        if (data.name && data.name !== subCategory.name) {
            updatedSlug = await this.generateUniqueSlug(subCategory.categoryId, data.name);
        }

        const updateData: any = { slug: updatedSlug };
        for (const key of Object.keys(data)) {
            if (data[key] !== undefined) {
                updateData[key] = data[key];
            }
        }

        return this.prisma.subCategory.update({
            where: { id },
            data: updateData,
        });
    }

    async getSingleCategory(subCtgId: string) {
        const result = await this.prisma.subCategory.findUnique({
            where: {
                id: subCtgId
            }
        });

        if (!result) {
            throw new NotFoundException("Sub-category not exist");
        }

        return result;

    }

    async getAllSubCategory(page = 1, limit: 15) {
        const skip = (page - 1) * limit;

        const total = await this.prisma.subCategory.count();

        const subCatgoris = await this.prisma.category.findMany({
            where : {
                isActive : true
            },
            skip,
            take: limit,
            orderBy: {
                createdAt: "desc"
            }
        });

        return {
            page,
            limit,
            total,
            totalPage: Math.ceil(total / limit),
            data: subCatgoris
        }

    }


    async deleteSubCategory(categoryId: string) {

        const subCategory = await this.prisma.subCategory.findUnique({
            where: {
                id: categoryId
            }
        });

        if (!subCategory) throw new NotFoundException("Sub category not found");

        await this.prisma.subCategory.update({
            where: {
                id: categoryId
            },
            data: {
                isActive: false
            }
        });

        return null

    }

    async subCategoryUnderAllCategory(subCategoryId: string, page: number, limit: number) {

        const skip = (page - 1) * limit;

        const totalService = await this.prisma.job.count({
            where: {
                subCategoryId: subCategoryId
            }
        })

        const service = await this.prisma.job.findMany({
            where: {
                subCategoryId: subCategoryId
            },
            take: limit,
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true
                    }
                }
            },
            skip: skip
        });


        const totalPage = Math.ceil(totalService / limit);


        return {
            meta: {
                page,
                skip,
                limit,
                totalService,
                totalPage
            },
            data: service
        }

    }

}
