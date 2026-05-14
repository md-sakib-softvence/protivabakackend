import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateReviewDto } from './dto/create.review.dto';

@Injectable()
export class ReviewService {

    constructor(private readonly prisma: PrismaService) { }

    // bookingId, senderId , receiverId, jobId, rating, comment
    async createReview(sanderId: string, data: CreateReviewDto) {
        const findReview = await this.prisma.review.findUnique({ where: { bookingId: data.bookingId } });

        if (findReview) throw new NotFoundException("Already given review.");

        const booking = await this.prisma.booking.findUnique({
            where: { id: data.bookingId },
        });

        const findJob = await this.prisma.job.findUnique({ where: { id: data.jobId } });

        if (!findJob) throw new NotFoundException("Job not found. Please give a valid review");

        if (!booking) throw new Error("Invalid booking ID");

        const createReview = await this.prisma.review.create({
            data: {
                senderId: sanderId,
                bookingId: data.bookingId,
                jobId: data.jobId,
                receiverId: data.receiverId,
                rating: Number(data.rating),
                comment: data.comment,
                image: data.image
            }
        });

        return createReview;

    }


}



// model Review {
//   id           String   @id @default(cuid())
//   bookingId    String   @unique
//   senderId     String
//   receiverId   String
//   jobId        String
//   rating       Int      @db.SmallInt
//   comment      String?
//   images       String[] @default([])
//   helpfulCount Int      @default(0)
//   reportCount  Int      @default(0)
//   isVisible    Boolean  @default(true)
//   isVerified   Boolean  @default(false)
// }