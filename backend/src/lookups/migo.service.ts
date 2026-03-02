import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { LookupResultDto } from './dto/lookup-result.dto';

interface CacheEntry {
  expiresAt: number;
  data: LookupResultDto;
}

@Injectable()
export class MigoService {
  private readonly baseUrl: string;
  private readonly token: string | undefined;
  private readonly cacheTtlMs: number;
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    private readonly http: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl =
      this.configService.get<string>('MIGO_BASE_URL') ??
      'https://api.migo.pe/api/v2';
    this.token = this.configService.get<string>('MIGO_TOKEN');
    this.cacheTtlMs =
      Number(this.configService.get<string>('MIGO_CACHE_TTL_MS')) ||
      1000 * 60 * 60 * 12;
  }

  isEnabled(): boolean {
    return !!this.token;
  }

  async lookupRuc(
    ruc: string,
    options?: { refresh?: boolean },
  ): Promise<LookupResultDto> {
    const normalized = this.normalizeRuc(ruc);
    return this.fetchWithCache(
      `migo:ruc:${normalized}`,
      () => this.fetchRuc(normalized),
      options?.refresh,
    );
  }

  async lookupDni(
    dni: string,
    options?: { refresh?: boolean },
  ): Promise<LookupResultDto> {
    const normalized = this.normalizeDni(dni);
    return this.fetchWithCache(
      `migo:dni:${normalized}`,
      () => this.fetchDni(normalized),
      options?.refresh,
    );
  }

  private async fetchRuc(ruc: string): Promise<LookupResultDto> {
    const endpoint = `${this.baseUrl.replace(/\/$/, '')}/ruc/${ruc}`;
    const data = await this.executeRequest(endpoint);
    return {
      type: 'RUC',
      identifier: ruc,
      name:
        data?.nombre_o_razon_social ??
        data?.nombre ??
        '--',
      address:
        data?.direccion ??
        data?.direccion_simple ??
        null,
      status: data?.estado_del_contribuyente ?? null,
      condition: data?.condicion_de_domicilio ?? null,
      ubigeo: data?.ubigeo ?? null,
      source: 'apisperu.com',
      cached: false,
      refreshedAt: new Date().toISOString(),
      raw: data ?? {},
    };
  }

  private async fetchDni(dni: string): Promise<LookupResultDto> {
    const endpoint = `${this.baseUrl.replace(/\/$/, '')}/dni/${dni}`;
    const data = await this.executeRequest(endpoint);
    return {
      type: 'DNI',
      identifier: dni,
      name: data?.nombre ?? '--',
      address: null,
      status: null,
      condition: null,
      ubigeo: null,
      source: 'apisperu.com',
      cached: false,
      refreshedAt: new Date().toISOString(),
      raw: data ?? {},
    };
  }

  private async executeRequest(url: string): Promise<any> {
    if (!this.token) {
      throw new UnauthorizedException(
        'Configura MIGO_TOKEN para habilitar consultas via Migo API.',
      );
    }

    try {
      const response = await lastValueFrom(
        this.http.get(url, {
          headers: {
            Authorization: `Bearer ${this.token}`,
            Accept: 'application/json',
          },
          timeout: 8000,
        }),
      );
      if (response?.data?.success === false) {
        const msg = response.data.message ?? 'No se encontraron resultados.';
        throw new NotFoundException(msg);
      }
      return response.data;
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }

      const status = error?.response?.status;
      const responseData = error?.response?.data;

      if (status === 404) {
        const msg =
          responseData?.message ?? 'Documento no encontrado en Migo API.';
        throw new NotFoundException(msg);
      }
      if (status === 401 || status === 403) {
        throw new UnauthorizedException(
          'El token de Migo API es invalido o ha expirado.',
        );
      }
      if (status === 422) {
        const msg =
          responseData?.message ?? 'Formato de documento invalido.';
        throw new BadRequestException(msg);
      }
      throw new InternalServerErrorException(
        `No se pudo obtener informacion desde Migo API (status=${status ?? 'unknown'}).`,
      );
    }
  }

  private async fetchWithCache(
    key: string,
    loader: () => Promise<LookupResultDto>,
    refresh?: boolean,
  ): Promise<LookupResultDto> {
    const now = Date.now();
    const cached = this.cache.get(key);
    if (!refresh && cached && cached.expiresAt > now) {
      return { ...cached.data, cached: true };
    }
    const fresh = await loader();
    const entry: CacheEntry = {
      data: fresh,
      expiresAt: now + this.cacheTtlMs,
    };
    this.cache.set(key, entry);
    return { ...fresh, cached: false };
  }

  private normalizeRuc(ruc: string): string {
    const normalized = (ruc ?? '').trim();
    if (!/^\d{11}$/.test(normalized)) {
      throw new BadRequestException(
        'El RUC debe tener 11 digitos numericos.',
      );
    }
    return normalized;
  }

  private normalizeDni(dni: string): string {
    const normalized = (dni ?? '').trim();
    if (!/^\d{8}$/.test(normalized)) {
      throw new BadRequestException(
        'El DNI debe tener 8 digitos numericos.',
      );
    }
    return normalized;
  }
}
