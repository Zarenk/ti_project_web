import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
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
export class ApisPeruService {
  private readonly baseUrl: string;
  private readonly token: string | undefined;
  private readonly cacheTtlMs: number;
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    private readonly http: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl =
      this.configService.get<string>('APISPERU_BASE_URL') ??
      'https://dniruc.apisperu.com/api/v1';
    this.token = this.configService.get<string>('APISPERU_TOKEN');
    this.cacheTtlMs =
      Number(this.configService.get<string>('APISPERU_CACHE_TTL_MS')) ||
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
      `apisperu:ruc:${normalized}`,
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
      `apisperu:dni:${normalized}`,
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
        data?.razonSocial ??
        data?.nombreComercial ??
        data?.razon_social ??
        data?.nombre_comercial ??
        '--',
      address:
        data?.direccion ??
        data?.direccionFiscal ??
        data?.direccion_fiscal ??
        null,
      status: data?.estado ?? null,
      condition: data?.condicion ?? null,
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
    const nombresCompletos = [data?.nombres, data?.apellidoPaterno, data?.apellidoMaterno]
      .filter((part) => !!part?.toString?.().trim())
      .join(' ')
      .trim();

    return {
      type: 'DNI',
      identifier: dni,
      name: nombresCompletos || data?.nombreCompleto || data?.nombre_completo || '--',
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
        'Configura APISPERU_TOKEN para habilitar las consultas.',
      );
    }

    try {
      const response = await lastValueFrom(
        this.http.get(url, {
          params: { token: this.token },
          timeout: 5000,
        }),
      );
      if (response?.data?.success === false) {
        throw new BadRequestException(
          response.data.message ?? 'La solicitud a ApisPeru es invalida.',
        );
      }
      return response.data;
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 400 || status === 404) {
        const message =
          error?.response?.data?.message ??
          error?.response?.data?.error ??
          'La solicitud a ApisPeru es invalida.';
        throw new BadRequestException(message);
      }
      if (status === 401) {
        throw new UnauthorizedException(
          'El token de ApisPeru es invalido o ha expirado.',
        );
      }
      throw new InternalServerErrorException(
        'No se pudo obtener informacion desde ApisPeru.',
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
      throw new BadRequestException('El RUC debe tener 11 digitos numericos.');
    }
    return normalized;
  }

  private normalizeDni(dni: string): string {
    const normalized = (dni ?? '').trim();
    if (!/^\d{8}$/.test(normalized)) {
      throw new BadRequestException('El DNI debe tener 8 digitos numericos.');
    }
    return normalized;
  }
}
