import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Service that loads and serves predictions from trained ML models.
 * Models are trained offline (Python scripts in backend/ml/training/)
 * and loaded as JSON at startup.
 */
@Injectable()
export class MLModelsService implements OnModuleInit {
  private readonly logger = new Logger(MLModelsService.name);
  private readonly MODELS_BASE = process.env.ML_MODELS_PATH || path.join(process.cwd(), 'ml', 'models');

  // Loaded model data
  private demandForecasts: Record<string, any> = {};
  private associationRules: any[] = [];
  private priceStats: Record<string, any> = {};
  private categoryMap: Record<string, string> = {};
  private clientSegments: Record<string, any> = {};

  onModuleInit() {
    this.loadModels();
  }

  /**
   * Load all trained models from disk. Non-blocking — logs warnings if models aren't available.
   */
  private loadModels() {
    this.demandForecasts = this.loadJson('demand', 'forecast_results.json');
    this.associationRules = this.loadJson('baskets', 'association_rules.json') || [];
    this.priceStats = this.loadJson('prices', 'price_stats.json');
    this.categoryMap = this.loadJson('products', 'category_map.json');
    this.clientSegments = this.loadJson('clients', 'segments.json');

    const loaded = [
      Object.keys(this.demandForecasts).length && 'demand',
      this.associationRules.length && 'baskets',
      Object.keys(this.priceStats).length && 'prices',
      Object.keys(this.categoryMap).length && 'products',
      Object.keys(this.clientSegments).length && 'clients',
    ].filter(Boolean);

    if (loaded.length > 0) {
      this.logger.log(`Loaded ML models: ${loaded.join(', ')}`);
    } else {
      this.logger.warn('No ML models found. Run training scripts in backend/ml/training/');
    }
  }

  private loadJson(subdir: string, filename: string): any {
    const filePath = path.join(this.MODELS_BASE, subdir, filename);
    try {
      if (!fs.existsSync(filePath)) return {};
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (err) {
      this.logger.warn(`Failed to load ${subdir}/${filename}: ${(err as Error).message}`);
      return {};
    }
  }

  /**
   * Reload models from disk (e.g., after retraining).
   */
  reloadModels(): { loaded: string[] } {
    this.loadModels();
    return {
      loaded: [
        Object.keys(this.demandForecasts).length ? 'demand' : null,
        this.associationRules.length ? 'baskets' : null,
        Object.keys(this.priceStats).length ? 'prices' : null,
        Object.keys(this.categoryMap).length ? 'products' : null,
        Object.keys(this.clientSegments).length ? 'clients' : null,
      ].filter(Boolean) as string[],
    };
  }

  // ==================== B.1 Demand Forecast ====================

  /**
   * Get demand forecast for a product (next 7 days).
   */
  getDemandForecast(productId: number): {
    available: boolean;
    method?: string;
    forecast?: Array<{ ds: string; yhat: number; yhat_lower: number; yhat_upper: number }>;
  } {
    const data = this.demandForecasts[String(productId)];
    if (!data) return { available: false };
    return {
      available: true,
      method: data.method,
      forecast: data.forecast,
    };
  }

  // ==================== B.2 Market Basket ====================

  /**
   * Get products frequently bought together with the given product.
   */
  getFrequentlyBoughtTogether(
    productId: number,
    limit = 5,
  ): Array<{
    productIds: number[];
    productNames: string[];
    confidence: number;
    lift: number;
  }> {
    const matches = this.associationRules
      .filter((rule) => rule.antecedents.includes(productId))
      .sort((a, b) => b.lift - a.lift)
      .slice(0, limit)
      .map((rule) => ({
        productIds: rule.consequents,
        productNames: rule.consequent_names,
        confidence: rule.confidence,
        lift: rule.lift,
      }));

    return matches;
  }

  // ==================== B.3 Price Anomaly ====================

  /**
   * Check if a price is anomalous for a product (using statistical bounds).
   */
  checkPriceAnomaly(
    productId: number,
    price: number,
  ): {
    available: boolean;
    isAnomaly?: boolean;
    reason?: string;
    stats?: {
      mean: number;
      min: number;
      max: number;
      p5: number;
      p95: number;
    };
  } {
    const stats = this.priceStats[String(productId)];
    if (!stats) return { available: false };

    // Use P5-P95 range as "normal" bounds (simpler than Isolation Forest for API)
    const isBelow = price < stats.price_p5;
    const isAbove = price > stats.price_p95;
    const isAnomaly = isBelow || isAbove;

    let reason: string | undefined;
    if (isBelow) {
      reason = `Precio S/${price.toFixed(2)} está por debajo del rango normal (S/${stats.price_p5.toFixed(2)} - S/${stats.price_p95.toFixed(2)})`;
    } else if (isAbove) {
      reason = `Precio S/${price.toFixed(2)} está por encima del rango normal (S/${stats.price_p5.toFixed(2)} - S/${stats.price_p95.toFixed(2)})`;
    }

    return {
      available: true,
      isAnomaly,
      reason,
      stats: {
        mean: stats.price_mean,
        min: stats.price_min,
        max: stats.price_max,
        p5: stats.price_p5,
        p95: stats.price_p95,
      },
    };
  }

  // ==================== B.4 Product Classification ====================

  /**
   * Note: The actual classification requires Python (TF-IDF + SVM).
   * This returns the category map for the frontend to display.
   * For actual predictions, use the Python predict endpoint.
   */
  getCategoryMap(): Record<string, string> {
    return this.categoryMap;
  }

  // ==================== B.5 Client Segmentation ====================

  /**
   * Get client segments overview.
   */
  getClientSegments(): Record<string, any> {
    return this.clientSegments;
  }

  // ==================== Status ====================

  /**
   * Get status of all loaded models.
   */
  getStatus(): Record<string, { loaded: boolean; count?: number }> {
    return {
      demand: {
        loaded: Object.keys(this.demandForecasts).length > 0,
        count: Object.keys(this.demandForecasts).length,
      },
      baskets: {
        loaded: this.associationRules.length > 0,
        count: this.associationRules.length,
      },
      prices: {
        loaded: Object.keys(this.priceStats).length > 0,
        count: Object.keys(this.priceStats).length,
      },
      products: {
        loaded: Object.keys(this.categoryMap).length > 0,
        count: Object.keys(this.categoryMap).length,
      },
      clients: {
        loaded: Object.keys(this.clientSegments).length > 0,
        count: Object.keys(this.clientSegments).length,
      },
    };
  }
}
