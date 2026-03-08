import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  ParseIntPipe,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { MLModelsService } from './ml-models.service';
import { MLTrainingService } from './ml-training.service';
import { JwtAuthGuard } from '../users/jwt-auth.guard';
import { TenantRequiredGuard } from '../common/guards/tenant-required.guard';

@Controller('ml-models')
@UseGuards(JwtAuthGuard, TenantRequiredGuard)
export class MLModelsController {
  constructor(
    private readonly modelsService: MLModelsService,
    private readonly trainingService: MLTrainingService,
  ) {}

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
   * GET /ml-models/demand/products
   * Get list of product IDs that have demand forecast models.
   */
  @Get('demand/products')
  getDemandProductIds() {
    return this.modelsService.getDemandProductIds();
  }

  /**
   * GET /ml-models/demand/:productId?days=7
   * Get demand forecast for a product (default 7 days, max 90).
   */
  @Get('demand/:productId')
  getDemandForecast(
    @Param('productId', ParseIntPipe) productId: number,
    @Query('days', new ParseIntPipe({ optional: true })) days?: number,
  ) {
    const clampedDays = Math.min(Math.max(days || 7, 1), 90);
    return this.modelsService.getDemandForecast(productId, clampedDays);
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

  // ── Training Endpoints ──────────────────────────────────────────────────

  /**
   * GET /ml-models/training/status
   * Get current training status (running, last run, schedule).
   */
  @Get('training/status')
  getTrainingStatus() {
    return this.trainingService.getStatus();
  }

  /**
   * POST /ml-models/training/run
   * Start a training run (optional: specific steps).
   */
  @Post('training/run')
  @HttpCode(200)
  async runTraining(@Body('steps') steps?: string[]) {
    return this.trainingService.runTraining(steps);
  }

  /**
   * POST /ml-models/training/cancel
   * Cancel a running training process.
   */
  @Post('training/cancel')
  @HttpCode(200)
  cancelTraining() {
    return this.trainingService.cancelTraining();
  }

  /**
   * POST /ml-models/training/toggle-cron
   * Enable/disable automatic scheduled training.
   */
  @Post('training/toggle-cron')
  @HttpCode(200)
  toggleCron(@Body('enabled') enabled: boolean) {
    return this.trainingService.toggleCron(enabled);
  }
}
