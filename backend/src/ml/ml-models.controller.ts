import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { MLModelsService } from './ml-models.service';
import { JwtAuthGuard } from '../users/jwt-auth.guard';
import { TenantRequiredGuard } from '../common/guards/tenant-required.guard';

@Controller('ml-models')
@UseGuards(JwtAuthGuard, TenantRequiredGuard)
export class MLModelsController {
  constructor(private readonly modelsService: MLModelsService) {}

  /**
   * GET /ml-models/status
   * Check which models are loaded and available.
   */
  @Get('status')
  getStatus() {
    return this.modelsService.getStatus();
  }

  /**
   * POST /ml-models/reload
   * Reload models from disk after retraining.
   */
  @Post('reload')
  reloadModels() {
    return this.modelsService.reloadModels();
  }

  /**
   * GET /ml-models/demand/:productId
   * Get demand forecast for a product (next 7 days).
   */
  @Get('demand/:productId')
  getDemandForecast(@Param('productId', ParseIntPipe) productId: number) {
    return this.modelsService.getDemandForecast(productId);
  }

  /**
   * GET /ml-models/basket/:productId
   * Get products frequently bought together.
   */
  @Get('basket/:productId')
  getFrequentlyBoughtTogether(
    @Param('productId', ParseIntPipe) productId: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.modelsService.getFrequentlyBoughtTogether(productId, limit || 5);
  }

  /**
   * POST /ml-models/price-check
   * Check if a price is anomalous for a product.
   */
  @Post('price-check')
  checkPriceAnomaly(
    @Body('productId', ParseIntPipe) productId: number,
    @Body('price') price: number,
  ) {
    return this.modelsService.checkPriceAnomaly(productId, Number(price));
  }

  /**
   * GET /ml-models/categories
   * Get the trained category map.
   */
  @Get('categories')
  getCategoryMap() {
    return this.modelsService.getCategoryMap();
  }

  /**
   * GET /ml-models/segments
   * Get client segmentation results.
   */
  @Get('segments')
  getClientSegments() {
    return this.modelsService.getClientSegments();
  }
}
