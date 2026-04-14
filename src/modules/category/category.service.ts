import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create.category.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateCategoryDto } from './dto/update.category.dto';

@Injectable()
export class CategoryService {

    constructor(private readonly prisma: PrismaService) { }


    private slugify(text: string): string {
        return text
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)+/g, '');
    }

    private async generateUniqueSlug(name: string): Promise<string> {
        const baseSlug = this.slugify(name);
        let slug = baseSlug;
        let counter = 1;

        while (true) {
            const exists = await this.prisma.category.findUnique({
                where: { slug },
                select: { id: true },
            });
            if (!exists) break;
            slug = `${baseSlug}-${counter}`;
            counter++;
        }

        return slug;
    }

    async createCategory(data: CreateCategoryDto) {
        const slug = await this.generateUniqueSlug(data.name);

        return this.prisma.category.create({
            data: {
                name: data.name,
                slug,
                description: data.description,
                icon: data.icon,
                image: data.image,
                isActive: data.isActive ?? true,
            },
        });
    }

    async updateCategory(id: string, data: UpdateCategoryDto) {
        const category = await this.prisma.category.findUnique({
            where: { id },
        });

        if (!category) {
            throw new NotFoundException('Category not found');
        }

        

        let updatedSlug = category.slug;
        if (data.name && data.name !== category.name) {
            updatedSlug = await this.generateUniqueSlug(data.name);
        }

        const updateData: any = { slug: updatedSlug };

        Object.entries(data).forEach(([key, value]) => {
            if (value !== undefined) {
                updateData[key] = value;
            }
        });

        return this.prisma.category.update({
            where: { id },
            data: updateData,
        });
    }

    async getSingleCategory(categoryId: string) {
        console.log("Single Category hit")
        const result = await this.prisma.category.findUnique({
            where: {
                id: categoryId
            }
        });

        if (!result) {
            throw new NotFoundException("Category not exist");
        }

        return result;

    }

    async ClientHomeCategory(page = 1, limit = 15) {
        const skip = (page - 1) * limit;

        const whereCondition = {
            isActive: true
        };

        const total = await this.prisma.category.count({
            where: whereCondition,
            
        });

        const categories = await this.prisma.category.findMany({
            where: whereCondition,
            skip,
            take: limit
        });

        return {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            data: categories,
        };
    }


    async getAllSubCategoryByCategoryId(categoryId: string, page = 1, limit = 15) {

        const skip = (page - 1) * limit;

        const category = await this.prisma.category.findUnique({
            where: {
                id: categoryId
            }
        });

        if (!category) throw new NotFoundException("Category not found");

        if (!category.isActive) throw new BadRequestException("This category is currently unavailable. Please choose another category.");


        const count = await this.prisma.subCategory.count({
            where: {
                categoryId: categoryId,
                isActive: true
            }
        })

        const result = await this.prisma.subCategory.findMany({
            where: {
                categoryId: categoryId,
                isActive: true
            },
            include: {
                _count: {
                    select: {
                        jobs: true
                    }
                }
            },
            skip,
            take: limit,
            orderBy: {
                createdAt: "desc"
            }
        });

        if (!result) throw new NotFoundException("Category not exist");

        return {
            page,
            limit,
            total: count,
            totalPage: Math.ceil(count / limit),
            data: result
        };
    }

    async deleteCategory(categoryId: string) {

        const result = await this.prisma.category.findUnique({
            where: {
                id: categoryId
            }
        });

        if (!result) throw new NotFoundException("Category not found");

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

}
