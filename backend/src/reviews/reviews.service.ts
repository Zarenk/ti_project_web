import { Injectable } from '@nestjs/common';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  upsertReview(data: { userId: number; productId: number; rating: number; comment?: string }) {
    return this.prisma.review.upsert({
      where: { productId_userId: { productId: data.productId, userId: data.userId } },
      update: { rating: data.rating, comment: data.comment },
      create: {
        rating: data.rating,
        comment: data.comment,
        product: { connect: { id: data.productId } },
        user: { connect: { id: data.userId } },
      },
    })
  }

  getReviewsForProduct(productId: number) {
    return this.prisma.review.findMany({
      where: { productId },
      include: { user: { select: { id: true, username: true } } },
      orderBy: { createdAt: 'desc' },
    })
  }
}
