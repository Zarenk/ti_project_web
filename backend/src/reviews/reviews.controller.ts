import { Body, Controller, Get, Param, ParseIntPipe, Post, Request, UseGuards } from '@nestjs/common'
import { ReviewsService } from './reviews.service'
import { JwtAuthGuard } from '../users/jwt-auth.guard'
import { CreateReviewDto } from './dto/create-review.dto'

@Controller()
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('reviews')
  create(@Request() req, @Body() body: CreateReviewDto) {
    const userId = req.user.userId
    return this.reviewsService.upsertReview({
      userId,
      productId: body.productId,
      rating: body.rating,
      comment: body.comment,
    })
  }

  @Get('products/:id/reviews')
  findAll(@Param('id', ParseIntPipe) id: number) {
    return this.reviewsService.getReviewsForProduct(id)
  }
}