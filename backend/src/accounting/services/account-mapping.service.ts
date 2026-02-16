import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { TenantContext } from 'src/tenancy/tenant-context.interface';

/**
 * Servicio para mapear códigos PCGE a accountId
 * Permite buscar cuentas por código sin hardcodear IDs
 */
@Injectable()
export class AccountMappingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtiene una cuenta por su código PCGE
   */
  async getAccountByCode(
    code: string,
    tenant: TenantContext | null
  ): Promise<{ id: number; code: string; name: string }> {
    if (!tenant?.organizationId) {
      throw new Error('Se requiere un tenant válido');
    }

    const account = await this.prisma.account.findFirst({
      where: {
        code,
        organizationId: tenant.organizationId,
      },
      select: {
        id: true,
        code: true,
        name: true,
      },
    });

    if (!account) {
      throw new NotFoundException(
        `Cuenta con código ${code} no encontrada. Configure la cuenta en el Plan de Cuentas primero.`
      );
    }

    return account;
  }

  /**
   * Obtiene múltiples cuentas por sus códigos
   */
  async getAccountsByCodes(
    codes: string[],
    tenant: TenantContext | null
  ): Promise<Map<string, { id: number; code: string; name: string }>> {
    if (!tenant?.organizationId) {
      throw new Error('Se requiere un tenant válido');
    }

    const accounts = await this.prisma.account.findMany({
      where: {
        code: { in: codes },
        organizationId: tenant.organizationId,
      },
      select: {
        id: true,
        code: true,
        name: true,
      },
    });

    const map = new Map<string, { id: number; code: string; name: string }>();

    for (const account of accounts) {
      map.set(account.code, account);
    }

    // Verificar que todas las cuentas existan
    const missingCodes = codes.filter((code) => !map.has(code));
    if (missingCodes.length > 0) {
      throw new NotFoundException(
        `Cuentas no encontradas: ${missingCodes.join(', ')}. Configure estas cuentas en el Plan de Cuentas primero.`
      );
    }

    return map;
  }

  /**
   * Verifica si una cuenta existe
   */
  async accountExists(code: string, tenant: TenantContext | null): Promise<boolean> {
    if (!tenant?.organizationId) {
      return false;
    }

    const count = await this.prisma.account.count({
      where: {
        code,
        organizationId: tenant.organizationId,
      },
    });

    return count > 0;
  }

  /**
   * Obtiene cuentas comunes del sistema (para generación automática)
   */
  async getCommonAccounts(tenant: TenantContext | null): Promise<{
    caja?: { id: number; code: string; name: string };
    banco?: { id: number; code: string; name: string };
    ventas?: { id: number; code: string; name: string };
    compras?: { id: number; code: string; name: string };
    igv?: { id: number; code: string; name: string };
    costoVentas?: { id: number; code: string; name: string };
    mercaderias?: { id: number; code: string; name: string };
  }> {
    if (!tenant?.organizationId) {
      return {};
    }

    const commonCodes = ['10', '104', '70', '60', '40', '69', '20'];

    const accounts = await this.prisma.account.findMany({
      where: {
        code: { in: commonCodes },
        organizationId: tenant.organizationId,
      },
      select: {
        id: true,
        code: true,
        name: true,
      },
    });

    const map = new Map(accounts.map((acc) => [acc.code, acc]));

    return {
      caja: map.get('10'),
      banco: map.get('104'),
      ventas: map.get('70'),
      compras: map.get('60'),
      igv: map.get('40'),
      costoVentas: map.get('69'),
      mercaderias: map.get('20'),
    };
  }
}
