import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  OrganizationCleanupStatus,
  OrganizationDataExport,
  OrganizationDataExportStatus,
  SubscriptionStatus,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { resolveBackendPath } from 'src/utils/path-utils';
import archiver from 'archiver';
import * as fs from 'fs';
import * as path from 'path';

const EXPORT_DIR = resolveBackendPath('exports', 'organizations');
const CLEANUP_RETENTION_DAYS = 7;
const EXPORT_EXPIRATION_DAYS = 30;

@Injectable()
export class OrganizationExportService {
  private readonly logger = new Logger(OrganizationExportService.name);

  constructor(private readonly prisma: PrismaService) {}

  async requestExport(organizationId: number, requestedBy?: number | null) {
    const existing = await this.prisma.organizationDataExport.findFirst({
      where: {
        organizationId,
        status: {
          in: [
            OrganizationDataExportStatus.PENDING,
            OrganizationDataExportStatus.PROCESSING,
          ],
        },
      },
    });
    if (existing) {
      return existing;
    }

    return this.prisma.organizationDataExport.create({
      data: {
        organizationId,
        requestedBy: requestedBy ?? null,
      },
    });
  }

  async listExports(organizationId: number) {
    return this.prisma.organizationDataExport.findMany({
      where: { organizationId },
      orderBy: { requestedAt: 'desc' },
    });
  }

  async getExportFile(organizationId: number, exportId: number) {
    const record = await this.prisma.organizationDataExport.findUnique({
      where: { id: exportId },
    });
    if (!record || record.organizationId !== organizationId) {
      throw new NotFoundException('Solicitud de exportación no encontrada');
    }
    if (!record.filePath) {
      throw new BadRequestException('La exportación aún no está lista');
    }
    const fullPath = resolveBackendPath(record.filePath);
    if (!fs.existsSync(fullPath)) {
      throw new NotFoundException(
        'El archivo exportado ya no se encuentra en el servidor',
      );
    }
    return {
      path: fullPath,
      filename: path.basename(fullPath),
    };
  }

  async processPendingExports(limit = 2) {
    const pending = await this.prisma.organizationDataExport.findMany({
      where: {
        status: {
          in: [
            OrganizationDataExportStatus.PENDING,
            OrganizationDataExportStatus.PROCESSING,
          ],
        },
      },
      orderBy: { requestedAt: 'asc' },
      take: limit,
    });

    for (const item of pending) {
      await this.handleExport(item);
    }
  }

  async cleanupCancelledOrganizations() {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - CLEANUP_RETENTION_DAYS);

    const exports = await this.prisma.organizationDataExport.findMany({
      where: {
        status: OrganizationDataExportStatus.COMPLETED,
        cleanupStatus: {
          in: [
            OrganizationCleanupStatus.PENDING,
            OrganizationCleanupStatus.SCHEDULED,
          ],
        },
        organization: {
          subscription: {
            status: SubscriptionStatus.CANCELED,
            canceledAt: { not: null, lte: threshold },
          },
        },
      },
      take: 5,
    });

    for (const record of exports) {
      await this.cleanupOrganization(record);
    }
  }

  private async handleExport(record: OrganizationDataExport) {
    try {
      await this.prisma.organizationDataExport.update({
        where: { id: record.id },
        data: {
          status: OrganizationDataExportStatus.PROCESSING,
          errorMessage: null,
        },
      });

      const filePath = await this.generateExportZip(
        record.organizationId,
        record.id,
      );

      await this.prisma.organizationDataExport.update({
        where: { id: record.id },
        data: {
          status: OrganizationDataExportStatus.COMPLETED,
          filePath,
          completedAt: new Date(),
          expiresAt: this.addDays(new Date(), EXPORT_EXPIRATION_DAYS),
          cleanupStatus: OrganizationCleanupStatus.SCHEDULED,
        },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Falló la generación del ZIP';
      this.logger.error(`Organization export failed: ${message}`);
      await this.prisma.organizationDataExport.update({
        where: { id: record.id },
        data: {
          status: OrganizationDataExportStatus.FAILED,
          errorMessage: message,
        },
      });
    }
  }

  private async cleanupOrganization(record: {
    id: number;
    organizationId: number;
  }) {
    try {
      await this.prisma.organizationDataExport.update({
        where: { id: record.id },
        data: { cleanupStatus: OrganizationCleanupStatus.PROCESSING },
      });

      await this.prisma.$transaction([
        this.prisma.subscriptionInvoice.deleteMany({
          where: { organizationId: record.organizationId },
        }),
        this.prisma.billingPaymentMethod.deleteMany({
          where: { organizationId: record.organizationId },
        }),
        this.prisma.monitoringAlert.deleteMany({
          where: { organizationId: record.organizationId },
        }),
        this.prisma.monitoringAlertEvent.deleteMany({
          where: { organizationId: record.organizationId },
        }),
      ]);

      await this.prisma.organizationDataExport.update({
        where: { id: record.id },
        data: {
          cleanupStatus: OrganizationCleanupStatus.COMPLETED,
          cleanupCompletedAt: new Date(),
        },
      });
    } catch (error) {
      const message = (error as Error).message ?? 'Cleanup failed';
      this.logger.error(
        `Cleanup failed for org ${record.organizationId}: ${message}`,
      );
      await this.prisma.organizationDataExport.update({
        where: { id: record.id },
        data: {
          cleanupStatus: OrganizationCleanupStatus.FAILED,
          errorMessage: message,
        },
      });
    }
  }

  private async generateExportZip(
    organizationId: number,
    exportId: number,
  ): Promise<string> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        companies: true,
        memberships: {
          include: {
            user: true,
          },
        },
        subscription: {
          include: { plan: true },
        },
      },
    });
    if (!organization) {
      throw new NotFoundException('Organización no encontrada');
    }

    const invoices = await this.prisma.subscriptionInvoice.findMany({
      where: { organizationId },
      include: {
        subscription: { include: { plan: true } },
        paymentMethod: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const subscriptionMetadata =
      organization.subscription?.metadata &&
      typeof organization.subscription.metadata === 'object'
        ? (organization.subscription.metadata as Record<string, unknown>)
        : null;
    const complimentary =
      subscriptionMetadata && typeof subscriptionMetadata.complimentary === 'object'
        ? subscriptionMetadata.complimentary
        : null;

    const exportData = {
      organization: {
        id: organization.id,
        name: organization.name,
        status: organization.status,
        createdAt: organization.createdAt,
        updatedAt: organization.updatedAt,
        plan: organization.subscription?.plan?.code ?? null,
        subscriptionStatus: organization.subscription?.status ?? null,
        complimentary,
      },
      companies: organization.companies,
      members: organization.memberships.map((membership) => ({
        id: membership.id,
        role: membership.role,
        createdAt: membership.createdAt,
        user: membership.user
          ? {
              id: membership.user.id,
              email: membership.user.email,
              role: membership.user.role,
              status: membership.user.status,
            }
          : null,
      })),
      invoices: invoices.map((invoice) => ({
        id: invoice.id,
        status: invoice.status,
        amount: invoice.amount,
        currency: invoice.currency,
        periodStart: invoice.billingPeriodStart,
        periodEnd: invoice.billingPeriodEnd,
        paidAt: invoice.paidAt,
        plan: invoice.subscription?.plan?.code ?? null,
        paymentMethod: invoice.paymentMethod
          ? {
              brand: invoice.paymentMethod.brand,
              last4: invoice.paymentMethod.last4,
            }
          : null,
      })),
    };

    await fs.promises.mkdir(EXPORT_DIR, { recursive: true });
    const exportDir = path.join(EXPORT_DIR, `org-${organizationId}`);
    await fs.promises.mkdir(exportDir, { recursive: true });

    const jsonPath = path.join(exportDir, `export-${exportId}.json`);
    await fs.promises.writeFile(
      jsonPath,
      JSON.stringify(exportData, null, 2),
      'utf-8',
    );

    const zipFilename = `org-${organizationId}-export-${exportId}.zip`;
    const zipPath = path.join(exportDir, zipFilename);

    await new Promise<void>((resolve, reject) => {
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });
      output.on('close', () => resolve());
      archive.on('error', (err) => reject(err));
      archive.pipe(output);
      archive.file(jsonPath, { name: 'data.json' });
      archive.finalize();
    });

    await fs.promises.unlink(jsonPath).catch(() => null);

    const relativePath = path
      .relative(resolveBackendPath(), zipPath)
      .replace(/\\/g, '/');
    return relativePath;
  }

  private addDays(date: Date, days: number) {
    const value = new Date(date);
    value.setDate(value.getDate() + days);
    return value;
  }
}
