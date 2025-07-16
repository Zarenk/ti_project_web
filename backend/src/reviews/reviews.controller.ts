import { Body, Controller, Get, Param, ParseIntPipe, Post, Request, UseGuards } from '@nestjs/common'
import { ReviewsService } from './reviews.service'
import { JwtAuthGuard } from '../users/jwt-auth.guard'

@Controller()
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('reviews')
  create(@Request() req, @Body() body: { productId: number; rating: number; comment?: string }) {
    const userId = req.user.userId
    return this.reviewsService.upsertReview({
      userId,
      productId: body.productId,
      rating: body.rating,
      comment: body.comment ?? null,
    })
  }

  @Get('products/:id/reviews')
  findAll(@Param('id', ParseIntPipe) id: number) {
    return this.reviewsService.getReviewsForProduct(id)
  }
}