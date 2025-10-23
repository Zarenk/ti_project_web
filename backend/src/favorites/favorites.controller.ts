import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/users/jwt-auth.guard';
import { FavoritesService } from './favorites.service';

@Controller()
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @UseGuards(JwtAuthGuard)
  @Post('favorites')
  toggle(@Request() req, @Body('productId', ParseIntPipe) productId: number) {
    const userId = req.user.userId;
    return this.favoritesService.toggleFavorite(userId, productId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('favorites')
  findMine(@Request() req) {
    const userId = req.user.userId;
    return this.favoritesService.getFavoritesForUser(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('favorites/:id')
  remove(@Request() req, @Param('id', ParseIntPipe) id: number) {
    const userId = req.user.userId;
    return this.favoritesService.removeFavorite(userId, id);
  }
}
