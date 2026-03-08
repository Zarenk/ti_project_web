import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';
import { DecolectaService } from 'src/lookups/decolecta.service';
import { zonedTimeToUtc } from 'date-fns-tz';

/**
 * Fetches the official SUNAT exchange rate (USD→PEN) once per day
 * and upserts it for every active organization.
 *
 * Runs at 9:00 AM Lima time — SUNAT typically publishes rates before 9 AM.
 * Also runs at 2:00 PM as a fallback for late publication days.
 */
@Injectable()
export class ExchangeRateCronService {
  private readonly logger = new Logger(ExchangeRateCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly decolecta: DecolectaService,
  ) {}

  /** Primary run: 9:00 AM Lima (14:00 UTC) */
  @Cron('0 14 * * 1-6') // Mon-Sat (SUNAT doesn't publish on Sundays)
  async fetchDailyRate() {
    await this.syncExchangeRate();
  }

  /** Fallback run: 2:00 PM Lima (19:00 UTC) */
  @Cron('0 19 * * 1-6')
  async fetchDailyRateFallback() {
    await this.syncExchangeRate();
  }

  private async syncExchangeRate() {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10); // YYYY-MM-DD

    this.logger.log(`Fetching SUNAT exchange rate for ${dateStr}`);

    let rate: { buy_price: string; sell_price: string };
    try {
      rate = await this.decolecta.getTipoCambio({ date: dateStr });
    } catch (error) {
      this.logger.warn(
        `Failed to fetch exchange rate for ${dateStr}: ${
          error instanceof Error ? error.message : error
        }`,
      );
      return;
    }

    const sellPrice = parseFloat(rate.sell_price);
    if (!sellPrice || isNaN(sellPrice) || sellPrice <= 0) {
      this.logger.warn(
        `Invalid sell_price from Decolecta: ${rate.sell_price}`,
      );
      return;
    }

    this.logger.log(
      `SUNAT rate for ${dateStr}: buy=${rate.buy_price} sell=${rate.sell_price}`,
    );

    // Get all active organizations
    const organizations = await this.prisma.organization.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true },
    });

    const fechaUtc = zonedTimeToUtc(dateStr, 'America/Lima');
    let upserted = 0;

    for (const org of organizations) {
      try {
        await this.prisma.tipoCambio.upsert({
          where: {
            fecha_moneda_organizationId: {
              fecha: fechaUtc,
              moneda: 'USD',
              organizationId: org.id,
            },
          },
          update: { valor: sellPrice },
          create: {
            fecha: fechaUtc,
            moneda: 'USD',
            valor: sellPrice,
            organizationId: org.id,
          },
        });
        upserted++;
      } catch (error) {
        this.logger.warn(
          `Failed to upsert rate for org ${org.id}: ${
            error instanceof Error ? error.message : error
          }`,
        );
      }
    }

    this.logger.log(
      `Exchange rate synced: ${sellPrice} PEN/USD for ${upserted}/${organizations.length} orgs`,
    );
  }
}
