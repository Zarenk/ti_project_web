import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { LookupResultDto } from './dto/lookup-result.dto';

interface CacheEntry {
  expiresAt: number;
  data: LookupResultDto;
}

@Injectable()
export class PeruApiService {
  private readonly baseUrl: string;
  private readonly token: string | undefined;
  private readonly cacheTtlMs: number;
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    private readonly http: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl =
      this.configService.get<string>('PERUAPI_BASE_URL') ??
      'https://peruapi.com/api';
    this.token = this.configService.get<string>('PERUAPI_TOKEN');
    this.cacheTtlMs =
      Number(this.configService.get<string>('PERUAPI_CACHE_TTL_MS')) ||
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
      `peruapi:ruc:${normalized}`,
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
      `peruapi:dni:${normalized}`,
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
      name: data?.razon_social ?? '--',
      address: data?.direccion ?? null,
      status: data?.estado ?? null,
      condition: data?.condicion ?? null,
      ubigeo: data?.ubigeo ?? null,
      source: 'peruapi.com',
      cached: false,
      refreshedAt: new Date().toISOString(),
      raw: data ?? {},
    };
  }

  private async fetchDni(dni: string): Promise<LookupResultDto> {
    const endpoint = `${this.baseUrl.replace(/\/$/, '')}/dni/${dni}`;
    const data = await this.executeRequest(endpoint);

    const fullName = [
      data?.nombres,
      data?.apellido_paterno,
      data?.apellido_materno,
    ]
      .filter((p: string | undefined) => !!p?.trim?.())
      .join(' ')
      .trim();

    const nombre = data?.cliente ?? (fullName || '--');

    return {
      type: 'DNI',
      identifier: dni,
      name: nombre,
      address: null,
      status: null,
      condition: null,
      ubigeo: null,
      source: 'peruapi.com',
      cached: false,
      refreshedAt: new Date().toISOString(),
      raw: data ?? {},
    };
  }

  private async executeRequest(url: string): Promise<any> {
    if (!this.token) {
      throw new ServiceUnavailableException(
        'Configura PERUAPI_TOKEN para habilitar consultas via PeruAPI.',
      );
    }

    try {
      const response = await lastValueFrom(
        this.http.get(url, {
          params: { api_token: this.token },
          timeout: 5000,
        }),
      );

      const data = response.data;

      if (data?.code && String(data.code) === '404') {
        throw new NotFoundException(
          data?.mensaje ?? 'No se encontraron resultados en PeruAPI.',
        );
      }

      if (data?.code && String(data.code) !== '200') {
        throw new BadRequestException(
          data?.mensaje ?? 'Error en consulta a PeruAPI.',
        );
      }

      return data;
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }

      const status = error?.response?.status;
      const responseData = error?.response?.data;

      if (status === 404) {
        const msg =
          responseData?.mensaje ?? 'Documento no encontrado en PeruAPI.';
        throw new NotFoundException(msg);
      }
      if (status === 401 || status === 403) {
        throw new ServiceUnavailableException(
          'El token de PeruAPI es invalido o ha expirado.',
        );
      }
      if (status === 429) {
        throw new ServiceUnavailableException(
          'Limite de consultas de PeruAPI alcanzado.',
        );
      }
      throw new InternalServerErrorException(
        `No se pudo obtener informacion desde PeruAPI (status=${status ?? 'unknown'}).`,
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
