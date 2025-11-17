import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';

export interface DecolectaExchangeDto {
  buy_price: string;
  sell_price: string;
  base_currency: string;
  quote_currency: string;
  date: string;
}

export interface DecolectaRucDto {
  razon_social: string;
  numero_documento: string;
  estado: string;
  condicion: string;
  direccion: string;
  ubigeo: string | null;
  departamento?: string | null;
  provincia?: string | null;
  distrito?: string | null;
  tipo?: string | null;
  actividad_economica?: string | null;
  numero_trabajadores?: string | null;
  tipo_facturacion?: string | null;
  tipo_contabilidad?: string | null;
  comercio_exterior?: string | null;
  [key: string]: unknown;
}

@Injectable()
export class DecolectaService {
  private readonly baseUrl: string;
  private readonly token: string | undefined;

  constructor(
    private readonly http: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl =
      this.configService.get<string>('DECOLECTA_BASE_URL') ??
      'https://api.decolecta.com/v1';
    this.token = this.configService.get<string>('DECOLECTA_TOKEN');
  }

  async getTipoCambio(params: {
    date?: string;
    month?: number;
    year?: number;
  }): Promise<DecolectaExchangeDto> {
    const endpoint = `${this.baseUrl.replace(/\/$/, '')}/tipo-cambio/sunat`;
    const query = this.buildExchangeQuery(params);
    return this.executeRequest<DecolectaExchangeDto>(endpoint, query);
  }

  async getRuc(numero: string): Promise<DecolectaRucDto> {
    const endpoint = `${this.baseUrl.replace(/\/$/, '')}/sunat/ruc`;
    const query = { numero: this.normalizeRuc(numero) };
    return this.executeRequest<DecolectaRucDto>(endpoint, query);
  }

  async getRucFull(numero: string): Promise<DecolectaRucDto> {
    const endpoint = `${this.baseUrl.replace(/\/$/, '')}/sunat/ruc/full`;
    const query = { numero: this.normalizeRuc(numero) };
    return this.executeRequest<DecolectaRucDto>(endpoint, query);
  }

  private async executeRequest<T>(
    url: string,
    params: Record<string, string | number>,
  ): Promise<T> {
    if (!this.token) {
      throw new UnauthorizedException(
        'Configura DECOLECTA_TOKEN para habilitar las consultas.',
      );
    }

    try {
      const response = await lastValueFrom(
        this.http.get(url, {
          headers: {
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'application/json',
          },
          params,
          timeout: 5000,
        }),
      );
      return response.data as T;
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 400 || status === 422 || status === 404) {
        const message =
          error?.response?.data?.message ??
          error?.response?.data?.error ??
          'La solicitud a Decolecta es inválida.';
        throw new BadRequestException(message);
      }

      if (status === 401) {
        throw new UnauthorizedException(
          'El token de Decolecta es inválido o ha expirado.',
        );
      }

      throw new InternalServerErrorException(
        'No se pudo obtener información desde Decolecta.',
      );
    }
  }

  private buildExchangeQuery(params: {
    date?: string;
    month?: number;
    year?: number;
  }): Record<string, string> {
    const query: Record<string, string> = {};

    if (params.date) {
      query.date = params.date;
      return query;
    }

    if (params.month !== undefined) {
      if (params.month < 1 || params.month > 12) {
        throw new BadRequestException('El mes debe estar entre 1 y 12.');
      }
      query.month = String(params.month);
    }

    if (params.year !== undefined) {
      if (String(params.year).length !== 4) {
        throw new BadRequestException(
          'El año debe tener 4 dígitos (ej. 2025).',
        );
      }
      query.year = String(params.year);
    }

    return query;
  }

  private normalizeRuc(ruc: string): string {
    const normalized = (ruc ?? '').trim();
    if (!/^\d{11}$/.test(normalized)) {
      throw new BadRequestException('El RUC debe tener 11 dígitos numéricos.');
    }
    return normalized;
  }
}
