import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

const FALLBACK_COUNTRY = 'PE';
const FALLBACK_RATE = 0.18;

type TaxRateInfo = {
  rate: number;
  countryCode: string;
  regionCode: string | null;
  description?: string;
};

@Injectable()
export class TaxRateService {
  private readonly logger = new Logger(TaxRateService.name);
  private readonly defaultCountry: string;
  private readonly defaultRate: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.defaultCountry =
      this.configService.get<string>('DEFAULT_TAX_COUNTRY')?.toUpperCase() ??
      FALLBACK_COUNTRY;
    this.defaultRate = Number(
      this.configService.get<string>('DEFAULT_TAX_RATE') ?? FALLBACK_RATE,
    );
  }

  async getRateForOrganization(organizationId: number): Promise<TaxRateInfo> {
    const country =
      this.configService.get<string>('DEFAULT_TAX_COUNTRY_FOR_ORG') ??
      this.defaultCountry;
    return this.getRateForCountry(country);
  }

  async getRateForCountry(
    countryCode?: string,
    regionCode?: string,
  ): Promise<TaxRateInfo> {
    const country = (countryCode ?? this.defaultCountry).toUpperCase();
    const normalizedRegion = regionCode ? regionCode.toUpperCase() : null;

    const rate = await this.prisma.taxRate.findFirst({
      where: {
        countryCode: country,
        OR: [{ regionCode: normalizedRegion }, { regionCode: null }],
      },
      orderBy: [{ regionCode: 'desc' }, { isDefault: 'desc' }],
    });

    if (!rate) {
      return {
        rate: this.defaultRate,
        countryCode: country,
        regionCode: normalizedRegion,
      };
    }

    return {
      rate: Number(rate.rate),
      countryCode: rate.countryCode,
      regionCode: rate.regionCode ?? null,
      description: rate.description ?? undefined,
    };
  }

  async upsertDefaultRate() {
    try {
      const existing = await this.prisma.taxRate.findFirst({
        where: {
          countryCode: this.defaultCountry,
          regionCode: null,
        },
      });

      if (existing) {
        await this.prisma.taxRate.update({
          where: { id: existing.id },
          data: {
            rate: new Prisma.Decimal(this.defaultRate),
            isDefault: true,
          },
        });
      } else {
        await this.prisma.taxRate.create({
          data: {
            countryCode: this.defaultCountry,
            regionCode: null,
            rate: new Prisma.Decimal(this.defaultRate),
            isDefault: true,
            description: 'Tarifa IGV predeterminada',
          },
        });
      }
    } catch (error) {
      this.logger.warn(`Failed to upsert default tax rate: ${error}`);
    }
  }
}
