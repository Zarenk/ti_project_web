import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import Redis from 'ioredis';
import { BusinessVertical } from 'src/types/business-vertical.enum';
import {
  VERTICAL_REGISTRY,
  VerticalConfig,
} from 'src/config/verticals.config';
import { redisConfig, redisEnabled } from 'src/config/redis.config';
import { VerticalEventsService } from './vertical-events.service';

export interface ResolvedVerticalConfig extends VerticalConfig {
  enforcedProductSchema: boolean;
}

interface RedisCacheEntry {
  version: string;
  config: ResolvedVerticalConfig;
}

@Injectable()
export class VerticalConfigService {
  private readonly cache = new Map<number, ResolvedVerticalConfig>();
  private readonly versions = new Map<number, string>();
  private readonly logger = new Logger(VerticalConfigService.name);
  private readonly redis?: Redis;
  private readonly ttlSeconds = 60 * 60 * 24;
  private readonly redisTimeout = 1000; // 1 second timeout for Redis operations
  private redisAvailable = false;

  // Cache metrics
  private cacheHits = 0;
  private cacheMisses = 0;
  private redisHits = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: VerticalEventsService,
  ) {
    if (redisEnabled) {
      try {
        this.redis = new Redis({
          ...redisConfig,
          lazyConnect: true,
          enableOfflineQueue: false, // Don't queue commands when disconnected
          maxRetriesPerRequest: 1,
          retryStrategy: (times: number) => {
            // Exponential backoff with max 3 seconds
            const delay = Math.min(times * 100, 3000);
            return delay;
          },
        });

        // Set up event listeners for connection monitoring
        this.redis.on('connect', () => {
          this.logger.log('[Redis] Connected successfully');
          this.redisAvailable = true;
        });

        this.redis.on('ready', () => {
          this.logger.log('[Redis] Ready to accept commands');
          this.redisAvailable = true;
        });

        this.redis.on('error', (error) => {
          this.logger.warn(
            `[Redis] Connection error: ${error.message}. Falling back to in-memory cache.`,
          );
          this.redisAvailable = false;
        });

        this.redis.on('close', () => {
          this.logger.warn('[Redis] Connection closed. Using in-memory cache only.');
          this.redisAvailable = false;
        });

        this.redis.on('reconnecting', () => {
          this.logger.log('[Redis] Attempting to reconnect...');
        });

        // Attempt initial connection
        this.redis.connect().catch((error) => {
          this.logger.warn(
            `[Redis] Initial connection failed: ${error.message}. Continuing with in-memory cache.`,
          );
          this.redisAvailable = false;
        });
      } catch (error) {
        this.logger.error(
          `[Redis] Failed to initialize: ${(error as Error).message}. Using in-memory cache only.`,
        );
        this.redisAvailable = false;
      }
    } else {
      this.logger.log('[Redis] Disabled by configuration. Using in-memory cache only.');
    }
  }

  private resolveBaseConfig(vertical: BusinessVertical): VerticalConfig {
    return (
      VERTICAL_REGISTRY[vertical] ??
      VERTICAL_REGISTRY[BusinessVertical.GENERAL]
    );
  }

  private mergeConfigs(
    baseConfig: VerticalConfig,
    override: Partial<VerticalConfig> | null,
  ): VerticalConfig {
    if (!override) {
      return baseConfig;
    }
    const mergedFeatures = override.features
      ? { ...baseConfig.features, ...override.features }
      : baseConfig.features;
    const mergedUi = override.ui
      ? { ...baseConfig.ui, ...override.ui }
      : baseConfig.ui;
    const mergedSchema = override.productSchema
      ? {
          ...baseConfig.productSchema,
          ...override.productSchema,
          fields:
            override.productSchema.fields ??
            baseConfig.productSchema.fields ??
            [],
        }
      : baseConfig.productSchema;
    const mergedFiscal = override.fiscal
      ? { ...baseConfig.fiscal, ...override.fiscal }
      : baseConfig.fiscal;
    const mergedMigrations = override.migrations
      ? {
          onActivate:
            override.migrations.onActivate ??
            baseConfig.migrations?.onActivate,
          onDeactivate:
            override.migrations.onDeactivate ??
            baseConfig.migrations?.onDeactivate,
          dataTransformations:
            override.migrations.dataTransformations ??
            baseConfig.migrations?.dataTransformations,
        }
      : baseConfig.migrations;
    const mergedAlternates = override.alternateSchemas
      ? {
          ...(baseConfig.alternateSchemas ?? {}),
          ...override.alternateSchemas,
        }
      : baseConfig.alternateSchemas;
    return {
      ...baseConfig,
      ...override,
      features: mergedFeatures,
      ui: mergedUi,
      productSchema: mergedSchema,
      fiscal: mergedFiscal,
      migrations: mergedMigrations,
      alternateSchemas: mergedAlternates,
    };
  }

  private parseOverride(
    value: Prisma.JsonValue | null,
  ): Partial<VerticalConfig> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }
    return value as Partial<VerticalConfig>;
  }

  private getVersionKey(
    vertical: BusinessVertical,
    updatedAt: Date,
  ): string {
    return `${vertical}:${updatedAt.getTime()}`;
  }

  private getRedisKey(companyId: number): string {
    return `vertical:config:company:${companyId}`;
  }

  private async getRedisEntry(
    companyId: number,
  ): Promise<RedisCacheEntry | null> {
    if (!this.redis || !this.redisAvailable) {
      return null;
    }
    try {
      // Add timeout to prevent hanging
      const cached = await Promise.race([
        this.redis.get(this.getRedisKey(companyId)),
        new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error('Redis timeout')), this.redisTimeout),
        ),
      ]);

      if (!cached) {
        return null;
      }
      const parsed = JSON.parse(cached) as RedisCacheEntry;
      if (parsed?.config) {
        return parsed;
      }
    } catch (error) {
      const message = (error as Error).message;
      if (message === 'Redis timeout') {
        this.logger.warn(
          `[Redis] Timeout al leer cache para empresa ${companyId}. Fallback a DB.`,
        );
      } else {
        this.logger.warn(
          `[Redis] Error al leer cache para empresa ${companyId}: ${message}. Fallback a DB.`,
        );
      }
      this.redisAvailable = false;
    }
    return null;
  }

  private async setRedisEntry(
    companyId: number,
    entry: RedisCacheEntry,
  ): Promise<void> {
    if (!this.redis || !this.redisAvailable) {
      return;
    }
    try {
      // Add timeout to prevent hanging
      await Promise.race([
        this.redis.set(
          this.getRedisKey(companyId),
          JSON.stringify(entry),
          'EX',
          this.ttlSeconds,
        ),
        new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error('Redis timeout')), this.redisTimeout),
        ),
      ]);
    } catch (error) {
      const message = (error as Error).message;
      if (message === 'Redis timeout') {
        this.logger.warn(
          `[Redis] Timeout al escribir cache para empresa ${companyId}. Cache solo en memoria.`,
        );
      } else {
        this.logger.warn(
          `[Redis] Error al escribir cache para empresa ${companyId}: ${message}. Cache solo en memoria.`,
        );
      }
      this.redisAvailable = false;
    }
  }

  private deleteRedisEntry(companyId: number): void {
    if (!this.redis) {
      return;
    }
    this.redis
      .del(this.getRedisKey(companyId))
      .catch((error) =>
        this.logger.warn(
          `No se pudo eliminar el cache Redis para la empresa ${companyId}: ${
            (error as Error).message
          }`,
        ),
      );
  }

  async getConfig(companyId: number): Promise<ResolvedVerticalConfig> {
    const cached = this.cache.get(companyId);
    if (cached) {
      this.cacheHits++;
      return cached;
    }

    const redisEntry = await this.getRedisEntry(companyId);
    if (redisEntry) {
      this.redisHits++;
      this.cache.set(companyId, redisEntry.config);
      this.versions.set(companyId, redisEntry.version);
      return redisEntry.config;
    }

    this.cacheMisses++;

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        organizationId: true,
        businessVertical: true,
        productSchemaEnforced: true,
        updatedAt: true,
      },
    });

    if (!company) {
      throw new NotFoundException(
        `No se encontrИ la empresa ${companyId}`,
      );
    }

    const override = await this.prisma.companyVerticalOverride.findUnique({
      where: { companyId },
      select: { configJson: true },
    });

    const baseConfig = this.resolveBaseConfig(company.businessVertical);
    const merged = this.mergeConfigs(
      baseConfig,
      this.parseOverride(override?.configJson ?? null),
    );
    const resolved: ResolvedVerticalConfig = {
      ...merged,
      enforcedProductSchema: company.productSchemaEnforced,
    };
    const version = this.getVersionKey(
      company.businessVertical,
      company.updatedAt,
    );

    this.cache.set(companyId, resolved);
    this.versions.set(companyId, version);
    await this.setRedisEntry(companyId, { version, config: resolved });
    return resolved;
  }

  async getFeatures(companyId: number) {
    const config = await this.getConfig(companyId);
    return config.features;
  }

  async isFeatureEnabled(
    companyId: number,
    feature: keyof VerticalConfig['features'],
  ): Promise<boolean> {
    const features = await this.getFeatures(companyId);
    return Boolean(features?.[feature]);
  }

  invalidateCache(companyId: number, organizationId?: number | null): void {
    this.cache.delete(companyId);
    this.versions.delete(companyId);
    this.deleteRedisEntry(companyId);
    this.events.emitConfigInvalidated({ companyId, organizationId });
  }

  /** @deprecated mantener por compatibilidad con llamadas existentes */
  invalidate(companyId: number): void {
    this.invalidateCache(companyId);
  }

  /**
   * Health check for Redis connection
   * Returns status of cache layers (memory + Redis)
   */
  async getHealthStatus(): Promise<{
    memoryCache: { enabled: boolean; size: number };
    redisCache: { enabled: boolean; available: boolean; status: string };
  }> {
    const memoryStatus = {
      enabled: true,
      size: this.cache.size,
    };

    if (!this.redis) {
      return {
        memoryCache: memoryStatus,
        redisCache: {
          enabled: false,
          available: false,
          status: 'disabled',
        },
      };
    }

    let redisStatus = 'unknown';
    let available = this.redisAvailable;

    try {
      await Promise.race([
        this.redis.ping(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), this.redisTimeout),
        ),
      ]);
      redisStatus = 'healthy';
      available = true;
      this.redisAvailable = true;
    } catch (error) {
      const message = (error as Error).message;
      redisStatus = message === 'timeout' ? 'timeout' : 'error';
      available = false;
      this.redisAvailable = false;
    }

    return {
      memoryCache: memoryStatus,
      redisCache: {
        enabled: true,
        available,
        status: redisStatus,
      },
    };
  }

  /**
   * Batch invalidate cache for multiple companies (e.g., all companies in an organization)
   */
  async invalidateBatch(companyIds: number[]): Promise<void> {
    for (const companyId of companyIds) {
      this.cache.delete(companyId);
      this.versions.delete(companyId);
    }

    // Batch delete from Redis if available
    if (this.redis && this.redisAvailable && companyIds.length > 0) {
      try {
        const keys = companyIds.map((id) => this.getRedisKey(id));
        await Promise.race([
          this.redis.del(...keys),
          new Promise<void>((_, reject) =>
            setTimeout(() => reject(new Error('Redis timeout')), this.redisTimeout),
          ),
        ]);
        this.logger.log(`[Cache] Invalidated ${companyIds.length} company configs in batch`);
      } catch (error) {
        this.logger.warn(
          `[Redis] Batch delete failed: ${(error as Error).message}. Memory cache cleared.`,
        );
      }
    }
  }

  /**
   * Warmup cache for frequently accessed companies
   * Call this on application startup or after deployments
   */
  async warmupCache(companyIds: number[]): Promise<void> {
    this.logger.log(`[Cache] Warming up cache for ${companyIds.length} companies...`);
    const startTime = Date.now();

    const promises = companyIds.map(async (companyId) => {
      try {
        await this.getConfig(companyId);
      } catch (error) {
        this.logger.warn(
          `[Cache] Warmup failed for company ${companyId}: ${(error as Error).message}`,
        );
      }
    });

    await Promise.allSettled(promises);
    const duration = Date.now() - startTime;
    this.logger.log(`[Cache] Warmup completed in ${duration}ms. Cache size: ${this.cache.size}`);
  }

  /**
   * Get cache performance metrics
   */
  getCacheMetrics(): {
    hits: number;
    misses: number;
    redisHits: number;
    hitRate: number;
    size: number;
  } {
    const total = this.cacheHits + this.cacheMisses + this.redisHits;
    const hitRate = total > 0 ? ((this.cacheHits + this.redisHits) / total) * 100 : 0;

    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      redisHits: this.redisHits,
      hitRate: Math.round(hitRate * 100) / 100,
      size: this.cache.size,
    };
  }

  /**
   * Reset cache metrics (useful for testing or monitoring)
   */
  resetMetrics(): void {
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.redisHits = 0;
  }
}


