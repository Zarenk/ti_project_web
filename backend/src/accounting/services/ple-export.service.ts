import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { TenantContext } from 'src/tenancy/tenant-context.interface';
import { startOfMonth, endOfMonth, format } from 'date-fns';

@Injectable()
export class PleExportService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Exporta Libro Diario formato PLE 5.1
   * Estructura: RUC|Año|Mes|Asiento|Línea|Fecha|Glosa|CodCta|Descripción|Debe|Haber|Moneda|Indicador|...
   */
  async exportLibroDiario(
    period: string, // "2026-02"
    tenant?: TenantContext | null,
  ): Promise<string> {
    const [year, month] = period.split('-');
    const periodStart = startOfMonth(new Date(parseInt(year), parseInt(month) - 1));
    const periodEnd = endOfMonth(periodStart);

    const entries = await this.prisma.accEntry.findMany({
      where: {
        organizationId: tenant?.organizationId ?? null,
        companyId: tenant?.companyId ?? null,
        period: { name: period },
        status: 'POSTED',
      },
      include: {
        lines: true,
        provider: true,
      },
      orderBy: { date: 'asc' },
    });

    // Obtener RUC de la empresa
    const company = await this.prisma.company.findFirst({
      where: { id: tenant?.companyId ?? undefined },
      select: { sunatRuc: true },
    });
    const ruc = company?.sunatRuc || '00000000000';

    const lines: string[] = [];
    let globalLineNumber = 1;

    for (const entry of entries) {
      const entryDate = format(entry.date, 'dd/MM/yyyy');
      const glosa = this.buildGlosa(entry);

      for (let i = 0; i < entry.lines.length; i++) {
        const line = entry.lines[i];
        const debe = Number(line.debit).toFixed(2);
        const haber = Number(line.credit).toFixed(2);

        // Formato PLE 5.1 (simplificado):
        // RUC|Año|Mes|CodAsiento|NroCorrelativo|FechaOperacion|Libro|Serie|Numero|FechaDoc|CodCta|Descripción|Debe|Haber|Moneda|Estado|...
        const pleRow = [
          ruc,                                                    // 1. RUC
          year,                                                   // 2. Año
          month,                                                  // 3. Mes
          `M${entry.id.toString().padStart(6, '0')}`,            // 4. Código único de asiento
          String(globalLineNumber++).padStart(6, '0'),           // 5. Número correlativo
          entryDate,                                              // 6. Fecha de operación
          '10',                                                   // 7. Código de libro (10 = diario)
          (entry as any).serie || '',                             // 8. Serie comprobante
          (entry as any).correlativo || '',                       // 9. Número comprobante
          '',                                                     // 10. Fecha doc (opcional)
          line.account,                                           // 11. Código de cuenta
          line.description || glosa,                              // 12. Descripción línea
          debe,                                                   // 13. Debe
          haber,                                                  // 14. Haber
          'PEN',                                                  // 15. Moneda (PEN = soles)
          '1',                                                    // 16. Estado operación (1 = activo)
          '',                                                     // 17-22. Campos adicionales vacíos
          '',
          '',
          '',
          '',
          '',
        ].join('|');

        lines.push(pleRow);
      }
    }

    return lines.join('\n');
  }

  /**
   * Exporta Libro Mayor formato PLE 6.1
   * Estructura similar pero agrupado por cuenta
   */
  async exportLibroMayor(
    period: string,
    tenant?: TenantContext | null,
  ): Promise<string> {
    const [year, month] = period.split('-');
    const periodStart = startOfMonth(new Date(parseInt(year), parseInt(month) - 1));
    const periodEnd = endOfMonth(periodStart);

    // Obtener todas las líneas del período
    const lines = await this.prisma.accEntryLine.findMany({
      where: {
        entry: {
          organizationId: tenant?.organizationId ?? null,
          companyId: tenant?.companyId ?? null,
          period: { name: period },
          status: 'POSTED',
        },
      },
      include: {
        entry: true,
      },
      orderBy: [{ account: 'asc' }, { entry: { date: 'asc' } }],
    });

    // Obtener RUC
    const company = await this.prisma.company.findFirst({
      where: { id: tenant?.companyId ?? undefined },
      select: { sunatRuc: true },
    });
    const ruc = company?.sunatRuc || '00000000000';

    const pleLines: string[] = [];
    let lineNumber = 1;

    for (const line of lines) {
      const entry = line.entry;
      const entryDate = format(entry.date, 'dd/MM/yyyy');
      const debe = Number(line.debit).toFixed(2);
      const haber = Number(line.credit).toFixed(2);

      // Formato PLE 6.1 (Libro Mayor):
      const pleRow = [
        ruc,
        year,
        month,
        line.account,                                           // Código de cuenta
        '',                                                     // Descripción cuenta (se puede agregar)
        `M${entry.id.toString().padStart(6, '0')}`,            // Código asiento
        String(lineNumber++).padStart(6, '0'),
        entryDate,
        line.description || '',
        debe,
        haber,
        'PEN',
        '1',
        '',
        '',
      ].join('|');

      pleLines.push(pleRow);
    }

    return pleLines.join('\n');
  }

  private buildGlosa(entry: any): string {
    // Generar glosa descriptiva
    if (entry.serie && entry.correlativo) {
      return `${entry.serie}-${entry.correlativo}`;
    }
    if (entry.provider) {
      return `Compra ${entry.provider.name}`;
    }
    return `Asiento ${entry.id}`;
  }
}
