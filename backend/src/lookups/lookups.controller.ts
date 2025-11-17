import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/users/jwt-auth.guard';
import { TenantContextGuard } from 'src/tenancy/tenant-context.guard';
import { ApisNetService } from './apisnet.service';
import { DecolectaService } from './decolecta.service';
import { ApisPeruService } from './apisperu.service';

@UseGuards(JwtAuthGuard, TenantContextGuard)
@Controller('lookups')
export class LookupsController {
  private readonly logger = new Logger(LookupsController.name);

  constructor(
    private readonly apisNet: ApisNetService,
    private readonly apisPeru: ApisPeruService,
    private readonly decolecta: DecolectaService,
  ) {}

  @Get('ruc/:ruc')
  async lookupRuc(
    @Param('ruc') ruc: string,
    @Query('refresh') refresh?: string,
  ) {
    const refreshFlag = refresh === 'true';
    return this.fetchFromProviders([
      {
        name: 'apisperu',
        enabled: this.apisPeru.isEnabled(),
        handler: () => this.apisPeru.lookupRuc(ruc, { refresh: refreshFlag }),
      },
      {
        name: 'apisnet',
        enabled: this.apisNet.isEnabled(),
        handler: () => this.apisNet.lookupRuc(ruc, { refresh: refreshFlag }),
      },
    ]);
  }

  @Get('dni/:dni')
  async lookupDni(
    @Param('dni') dni: string,
    @Query('refresh') refresh?: string,
  ) {
    const refreshFlag = refresh === 'true';
    return this.fetchFromProviders([
      {
        name: 'apisperu',
        enabled: this.apisPeru.isEnabled(),
        handler: () => this.apisPeru.lookupDni(dni, { refresh: refreshFlag }),
      },
      {
        name: 'apisnet',
        enabled: this.apisNet.isEnabled(),
        handler: () => this.apisNet.lookupDni(dni, { refresh: refreshFlag }),
      },
    ]);
  }

  @Get('decolecta/tipo-cambio')
  getDecolectaTipoCambio(
    @Query('date') date?: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    const params: { date?: string; month?: number; year?: number } = {};
    if (date) {
      params.date = date;
    } else {
      if (month !== undefined) {
        params.month = Number(month);
      }
      if (year !== undefined) {
        params.year = Number(year);
      }
    }

    return this.decolecta.getTipoCambio(params);
  }

  @Get('decolecta/ruc/:ruc')
  getDecolectaRuc(@Param('ruc') ruc: string) {
    return this.decolecta.getRuc(ruc);
  }

  @Get('decolecta/ruc/:ruc/full')
  getDecolectaRucFull(@Param('ruc') ruc: string) {
    return this.decolecta.getRucFull(ruc);
  }

  private async fetchFromProviders<T>(
    providers: {
      name: string;
      enabled: boolean;
      handler: () => Promise<T>;
    }[],
  ): Promise<T> {
    let lastError: unknown = null;

    for (const provider of providers) {
      if (!provider.enabled) {
        continue;
      }

      try {
        return await provider.handler();
      } catch (error) {
        lastError = error;
        const message =
          error instanceof Error ? error.message : 'Error desconocido';
        this.logger.warn(
          `Proveedor ${provider.name} fallo durante la consulta: ${message}`,
        );
      }
    }

    if (lastError) {
      throw lastError;
    }

    throw new ServiceUnavailableException(
      'No hay proveedores configurados para la consulta solicitada.',
    );
  }
}
