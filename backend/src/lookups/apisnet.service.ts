import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { LookupResultDto, LookupType } from './dto/lookup-result.dto';

interface CacheEntry {
  expiresAt: number;
  data: LookupResultDto;
}

@Injectable()
export class ApisNetService {
  private readonly baseUrl: string;
  private readonly token: string | undefined;
  private readonly cacheTtlMs: number;
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    private readonly http: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl =
      this.configService.get<string>('APISNET_BASE_URL') ??
      'https://api.apis.net.pe/v2';
    this.token = this.configService.get<string>('APISNET_TOKEN');
    this.cacheTtlMs =
      Number(this.configService.get<string>('APISNET_CACHE_TTL_MS')) ||
      1000 * 60 * 60 * 12; // 12h
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
      `ruc:${normalized}`,
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
      `dni:${normalized}`,
      () => this.fetchDni(normalized),
      options?.refresh,
    );
  }

  private async fetchRuc(ruc: string): Promise<LookupResultDto> {
    const endpoint = `${this.baseUrl.replace(/\/$/, '')}/sunat/ruc`;
    const params = { numero: ruc };
    const data = await this.executeRequest(endpoint, params);
    return this.mapRucResponse(data, ruc);
  }

  private async fetchDni(dni: string): Promise<LookupResultDto> {
    const endpoint = `${this.baseUrl.replace(/\/$/, '')}/reniec/dni`;
    const params = { numero: dni };
    const data = await this.executeRequest(endpoint, params);
    return this.mapDniResponse(data, dni);
  }

  private async executeRequest(
    url: string,
    params: Record<string, string>,
  ): Promise<any> {
    if (!this.token) {
      throw new UnauthorizedException(
        'No se ha configurado APISNET_TOKEN para realizar consultas.',
      );
    }

    try {
      const response = await lastValueFrom(
        this.http.get(url, {
          headers: {
            Authorization: `Bearer ${this.token}`,
          },
          params,
          timeout: 5000,
        }),
      );
      return response.data;
    } catch (error: any) {
      if (error?.response?.status === 404) {
        throw new BadRequestException(
          'No se encontraron datos para el documento solicitado.',
        );
      }

      if (error?.response?.status === 401) {
        throw new UnauthorizedException(
          'Credenciales de apis.net.pe invalidas o caducadas.',
        );
      }

      throw new InternalServerErrorException(
        'No se pudo obtener datos desde apis.net.pe',
      );
    }
  }

  private mapRucResponse(data: any, ruc: string): LookupResultDto {
    return {
      type: 'RUC',
      identifier: ruc,
      name: data?.razonSocial ?? data?.nombre ?? data?.nombreComercial ?? '--',
      address: data?.direccion ?? data?.direccionCompleta ?? null,
      status: data?.estado ?? null,
      condition: data?.condicion ?? null,
      ubigeo: data?.ubigeo ?? null,
      source: 'apis.net.pe',
      cached: false,
      refreshedAt: new Date().toISOString(),
      raw: data ?? {},
    };
  }

  private mapDniResponse(data: any, dni: string): LookupResultDto {
    const nombres = [
      data?.nombres,
      data?.apellidoPaterno,
      data?.apellidoMaterno,
    ]
      .filter((part) => !!part?.trim?.())
      .join(' ')
      .trim();

    return {
      type: 'DNI',
      identifier: dni,
      name: nombres || data?.nombreCompleto || '--',
      address: data?.direccion ?? null,
      status: data?.estadoCivil ?? null,
      condition: null,
      ubigeo: data?.ubigeo ?? null,
      source: 'apis.net.pe',
      cached: false,
      refreshedAt: new Date().toISOString(),
      raw: data ?? {},
    };
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

    return {
      ...fresh,
      cached: false,
    };
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
