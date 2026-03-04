import {
  Controller,
  Get,
  HttpException,
  NotFoundException,
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
import { MigoService } from './migo.service';
import { PeruApiService } from './peruapi.service';

@UseGuards(JwtAuthGuard, TenantContextGuard)
@Controller('lookups')
export class LookupsController {
  private readonly logger = new Logger(LookupsController.name);

  constructor(
    private readonly apisNet: ApisNetService,
    private readonly apisPeru: ApisPeruService,
    private readonly decolecta: DecolectaService,
    private readonly migo: MigoService,
    private readonly peruApi: PeruApiService,
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
        name: 'migo',
        enabled: this.migo.isEnabled(),
        handler: () => this.migo.lookupRuc(ruc, { refresh: refreshFlag }),
      },
      {
        name: 'apisnet',
        enabled: this.apisNet.isEnabled(),
        handler: () => this.apisNet.lookupRuc(ruc, { refresh: refreshFlag }),
      },
      {
        name: 'peruapi',
        enabled: this.peruApi.isEnabled(),
        handler: () => this.peruApi.lookupRuc(ruc, { refresh: refreshFlag }),
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
        name: 'migo',
        enabled: this.migo.isEnabled(),
        handler: () => this.migo.lookupDni(dni, { refresh: refreshFlag }),
      },
      {
        name: 'apisnet',
        enabled: this.apisNet.isEnabled(),
        handler: () => this.apisNet.lookupDni(dni, { refresh: refreshFlag }),
      },
      {
        name: 'peruapi',
        enabled: this.peruApi.isEnabled(),
        handler: () => this.peruApi.lookupDni(dni, { refresh: refreshFlag }),
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
    let notFoundError: NotFoundException | null = null;

    for (const provider of providers) {
      if (!provider.enabled) {
        continue;
      }

      try {
        return await provider.handler();
      } catch (error) {
        lastError = error;

        // If a provider returns "not found", remember it but still try others
        // (another provider might have the data).
        if (error instanceof NotFoundException) {
          notFoundError = error;
        }

        const message =
          error instanceof Error ? error.message : 'Error desconocido';
        this.logger.warn(
          `Proveedor ${provider.name} fallo durante la consulta: ${message}`,
        );
      }
    }

    // If at least one provider said "not found" (valid response), return that
    // instead of a generic 503. This way the user sees "No se encontraron resultados"
    // rather than "servicio no disponible".
    if (notFoundError) {
      throw notFoundError;
    }

    if (lastError) {
      // Wrap in ServiceUnavailableException so upstream provider errors
      // (e.g. expired API tokens) never leak as 401 to the user.
      if (lastError instanceof ServiceUnavailableException) {
        throw lastError;
      }
      const message =
        lastError instanceof Error
          ? lastError.message
          : 'Todos los proveedores fallaron.';
      throw new ServiceUnavailableException(message);
    }

    throw new ServiceUnavailableException(
      'No hay proveedores configurados para la consulta solicitada.',
    );
  }
}
