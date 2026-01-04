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

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: VerticalEventsService,
  ) {
    if (redisEnabled) {
      this.redis = new Redis(redisConfig);
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
    if (!this.redis) {
      return null;
    }
    try {
      const cached = await this.redis.get(this.getRedisKey(companyId));
      if (!cached) {
        return null;
      }
      const parsed = JSON.parse(cached) as RedisCacheEntry;
      if (parsed?.config) {
        return parsed;
      }
    } catch (error) {
      this.logger.warn(
        `No se pudo leer el cache Redis para la empresa ${companyId}: ${
          (error as Error).message
        }`,
      );
    }
    return null;
  }

  private async setRedisEntry(
    companyId: number,
    entry: RedisCacheEntry,
  ): Promise<void> {
    if (!this.redis) {
      return;
    }
    try {
      await this.redis.set(
        this.getRedisKey(companyId),
        JSON.stringify(entry),
        'EX',
        this.ttlSeconds,
      );
    } catch (error) {
      this.logger.warn(
        `No se pudo escribir el cache Redis para la empresa ${companyId}: ${
          (error as Error).message
        }`,
      );
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
      return cached;
    }

    const redisEntry = await this.getRedisEntry(companyId);
    if (redisEntry) {
      this.cache.set(companyId, redisEntry.config);
      this.versions.set(companyId, redisEntry.version);
      return redisEntry.config;
    }

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
}


