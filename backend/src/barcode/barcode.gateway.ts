import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { PrismaService } from 'src/prisma/prisma.service';
import { isAllowedOrigin } from 'src/common/cors/allowed-origins';
import * as jwt from 'jsonwebtoken';

interface SocketTenantContext {
  userId: number;
  organizationId: number | null;
  companyId: number | null;
  isGlobalSuperAdmin: boolean;
  allowedOrganizationIds: number[];
  allowedCompanyIds: number[];
}

@WebSocketGateway({
  namespace: '/barcode',
  cors: {
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (isAllowedOrigin(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  },
})
export class BarcodeGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
  @WebSocketServer()
  server!: Server;

  private logger = new Logger('BarcodeGateway');
  private prisma!: PrismaService;

  constructor(private readonly moduleRef: ModuleRef) {
    this.logger.log('BarcodeGateway constructor called');
  }

  afterInit() {
    try {
      this.prisma = this.moduleRef.get(PrismaService, { strict: false });
      this.logger.log('PrismaService resolved successfully');
    } catch (error) {
      this.logger.error(`Failed to resolve PrismaService: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async handleConnection(client: Socket) {
    const logger = this.logger || new Logger('BarcodeGateway');
    logger.log(`Connection attempt from socket ${client.id}`);

    try {
      const context = await this.resolveSocketTenantContext(client);
      (client.data as { barcodeContext?: SocketTenantContext }).barcodeContext = context;
      logger.log(`Socket ${client.id} connected successfully`);
    } catch (error) {
      logger.error(`Connection rejected for socket ${client.id}: ${error instanceof Error ? error.message : String(error)}`);

      const errorMessage = error instanceof Error ? error.message : 'No autorizado.';
      client.emit('barcode:error', { message: errorMessage });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const logger = this.logger;
    if (logger) {
      logger.log(`Barcode socket ${client.id} disconnected`);
    }
    // Cleanup para prevenir memory leaks
    delete (client.data as { barcodeContext?: SocketTenantContext }).barcodeContext;
  }

  @SubscribeMessage('barcode:scan')
  async handleBarcodeScan(
    @MessageBody() rawCode: string,
    @ConnectedSocket() client: Socket,
  ) {
    const logger = this.logger;
    try {
      const context = this.getSocketContext(client);
      const orgId = context.organizationId;

      let product: any = null;

      // Attempt to parse QR JSON format: {productId, code, serial}
      try {
        const parsed = JSON.parse(rawCode);
        if (parsed && typeof parsed === 'object') {
          if (parsed.productId) {
            product = await this.findProductById(Number(parsed.productId), orgId);
          }
          if (!product && parsed.code) {
            product = await this.findProductByBarcode(String(parsed.code), orgId);
          }
        }
      } catch {
        // Not JSON — will search as plain string below
      }

      // Fallback: search as plain barcode/qrCode string
      if (!product) {
        product = await this.findProductByBarcode(rawCode, orgId);
      }

      client.emit(
        'barcode:result',
        product
          ? this.mapProductResponse(product)
          : { error: 'Producto no encontrado' },
      );
    } catch (error) {
      if (logger) {
        logger.error(
          `Barcode scan error for socket ${client.id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
      client.emit('barcode:error', {
        message:
          error instanceof Error
            ? error.message
            : 'Error al buscar producto.',
      });
    }
  }

  // ── Product Query Methods ──────────────────────────────────

  private readonly productInclude = {
    brand: true,
    category: true,
    inventory: {
      include: {
        storeOnInventory: {
          include: { store: { select: { id: true, name: true } } },
        },
      },
    },
  } as const;

  private async findProductById(productId: number, orgId: number | null) {
    return await this.prisma.product.findFirst({
      where: {
        id: productId,
        ...(orgId !== null && { organizationId: orgId }),
      },
      include: this.productInclude,
    });
  }

  private async findProductByBarcode(code: string, orgId: number | null) {
    return await this.prisma.product.findFirst({
      where: {
        OR: [
          { barcode: code },
          { qrCode: code },
        ],
        ...(orgId !== null && { organizationId: orgId }),
      },
      include: this.productInclude,
    });
  }

  // ── Helpers ──────────────────────────────────────────────

  private mapProductResponse(product: any) {
    // Calcular stock por tienda desde inventory → storeOnInventory
    const stockByStore: { storeId: number; storeName: string; stock: number }[] = [];
    let totalStock = 0;

    if (product.inventory) {
      for (const inv of product.inventory) {
        for (const soi of inv.storeOnInventory ?? []) {
          stockByStore.push({
            storeId: soi.store?.id ?? soi.storeId,
            storeName: soi.store?.name ?? 'Tienda',
            stock: soi.stock ?? 0,
          });
          totalStock += soi.stock ?? 0;
        }
      }
    }

    return {
      id: product.id,
      name: product.name,
      description: product.description,
      image: product.image,
      images: product.images,
      price: product.price,
      priceSell: product.priceSell,
      barcode: product.barcode,
      qrCode: product.qrCode,
      brand: product.brand ?? null,
      brandName: product.brandName ?? null,
      categoryName: product.category?.name ?? null,
      status: product.status,
      code: product.code ?? null,
      stockByStore,
      totalStock,
    };
  }

  private getSocketContext(client: Socket): SocketTenantContext {
    const socketData = client.data as {
      barcodeContext?: SocketTenantContext;
    };
    const context = socketData.barcodeContext;
    if (!context) {
      throw new UnauthorizedException(
        'Contexto de barcode no disponible.',
      );
    }
    return context;
  }

  private resolveToken(client: Socket): string | null {
    const authPayload =
      (client.handshake.auth as Record<string, unknown> | undefined) ?? {};
    const authToken = authPayload.token;
    const headerAuth = client.handshake.headers?.authorization;
    const raw =
      (typeof authToken === 'string' ? authToken : null) ??
      (typeof headerAuth === 'string' ? headerAuth : null);
    if (!raw) return null;
    return raw.startsWith('Bearer ') ? raw.slice(7).trim() : raw.trim();
  }

  private parseNumeric(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number.parseInt(value, 10);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  private normalizeRole(role: unknown): string {
    if (typeof role !== 'string') return '';
    return role.trim().toUpperCase().replace(/\s+/g, '_');
  }

  private async resolveSocketTenantContext(
    client: Socket,
  ): Promise<SocketTenantContext> {
    const authPayload =
      (client.handshake.auth as Record<string, unknown> | undefined) ?? {};

    const token = this.resolveToken(client);
    if (!token) {
      throw new UnauthorizedException('Token requerido.');
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new UnauthorizedException('JWT secret no configurado.');
    }

    let payload: {
      sub?: number;
      role?: string;
      tokenVersion?: number;
      defaultOrganizationId?: number | null;
      defaultCompanyId?: number | null;
      organizations?: Array<number | string>;
      companies?: Array<number | string>;
      companyIds?: Array<number | string>;
    };

    try {
      payload = jwt.verify(token, secret) as any;
    } catch (err) {
      throw new UnauthorizedException('Token inválido o expirado.');
    }

    const userId = this.parseNumeric(payload?.sub);
    if (!userId) {
      throw new UnauthorizedException('Token inválido.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        tokenVersion: true,
        role: true,
        organizationId: true,
        lastOrgId: true,
        lastCompanyId: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Token revocado.');
    }

    if (user.tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedException('Token revocado.');
    }

    const normalizedRole = this.normalizeRole(payload.role ?? user.role);
    const isGlobalSuperAdmin =
      normalizedRole === 'SUPER_ADMIN_GLOBAL' ||
      normalizedRole === 'SUPER_ADMIN';

    const memberships = await this.prisma.organizationMembership.findMany({
      where: { userId },
      select: { organizationId: true },
    });
    const allowedOrganizationIds = Array.from(
      new Set([
        ...memberships.map((m) => m.organizationId),
        ...(user.organizationId ? [user.organizationId] : []),
      ]),
    );

    const handshakeOrgId = this.parseNumeric(
      authPayload.orgId ?? client.handshake.headers?.['x-org-id'],
    );
    const handshakeCompanyId = this.parseNumeric(
      authPayload.companyId ?? client.handshake.headers?.['x-company-id'],
    );

    let organizationId =
      handshakeOrgId ??
      this.parseNumeric(payload.defaultOrganizationId) ??
      user.lastOrgId ??
      user.organizationId ??
      allowedOrganizationIds[0] ??
      null;
    const companyId =
      handshakeCompanyId ??
      this.parseNumeric(payload.defaultCompanyId) ??
      user.lastCompanyId ??
      null;

    if (companyId !== null) {
      const company = await this.prisma.company.findUnique({
        where: { id: companyId },
        select: { id: true, organizationId: true },
      });

      if (!company) {
        throw new UnauthorizedException('Compañía inválida.');
      }

      if (
        organizationId !== null &&
        organizationId !== company.organizationId
      ) {
        throw new UnauthorizedException(
          'La compañía no pertenece a la organización.',
        );
      }
      organizationId = company.organizationId;
    }

    if (!isGlobalSuperAdmin) {
      if (
        organizationId === null ||
        !allowedOrganizationIds.includes(organizationId)
      ) {
        throw new UnauthorizedException(
          'No autorizado para la organización seleccionada.',
        );
      }
    }

    const allowedCompanyIds = (payload.companies ?? payload.companyIds ?? [])
      .map((id) => this.parseNumeric(id))
      .filter((id): id is number => id !== null);

    return {
      userId,
      organizationId,
      companyId,
      isGlobalSuperAdmin,
      allowedOrganizationIds,
      allowedCompanyIds,
    };
  }
}
