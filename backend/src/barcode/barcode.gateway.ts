import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UnauthorizedException, Injectable } from '@nestjs/common';
import { ProductsService } from '../products/products.service';
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

@Injectable()
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
export class BarcodeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private logger = new Logger('BarcodeGateway');

  constructor(
    private readonly productsService: ProductsService,
    private readonly prisma: PrismaService,
  ) {
    console.log('🔧 ============================================');
    console.log('🔧 [CONSTRUCTOR] BarcodeGateway instantiated');
    console.log('🔧 [CONSTRUCTOR] PrismaService:', !!this.prisma);
    console.log('🔧 [CONSTRUCTOR] ProductsService:', !!this.productsService);
    console.log('🔧 ============================================');

    this.logger.log('BarcodeGateway constructor called');
    this.logger.log(`✅ PrismaService injected: ${!!this.prisma}`);
    this.logger.log(`✅ ProductsService injected: ${!!this.productsService}`);
    if (this.prisma) {
      this.logger.log(`✅ PrismaService has user method: ${typeof this.prisma.user}`);
    } else {
      this.logger.error('❌ PrismaService is UNDEFINED in constructor!');
    }
  }

  async handleConnection(client: Socket) {
    console.log('🚨 ================================================');
    console.log('🚨 [HANDLECONNECTION] Called!');
    console.log('🚨 Socket ID:', client?.id);
    console.log('🚨 this.prisma:', !!this.prisma);
    console.log('🚨 this.productsService:', !!this.productsService);
    console.log('🚨 ================================================');

    // Ensure logger is initialized
    const logger = this.logger || new Logger('BarcodeGateway');

    logger.log(`Connection attempt from socket ${client.id}`);
    logger.log(`Auth token present: ${!!client.handshake.auth?.token}`);
    logger.log(`Headers - orgId: ${client.handshake.headers?.['x-org-id']}, companyId: ${client.handshake.headers?.['x-company-id']}`);

    try {
      logger.log(`Resolving tenant context for socket ${client.id}...`);
      const context = await this.resolveSocketTenantContext(client);
      logger.log(`Context resolved - userId: ${context.userId}, orgId: ${context.organizationId}`);
      (client.data as { barcodeContext?: SocketTenantContext }).barcodeContext = context;
      logger.log(`Socket ${client.id} connected successfully`);
    } catch (error) {
      logger.error(`Connection REJECTED for socket ${client.id}`);
      logger.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      if (error instanceof Error && error.stack) {
        logger.error(error.stack);
      }

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
            product = await this.productsService.findOneForBarcode(
              Number(parsed.productId),
              orgId,
            );
          }
          if (!product && parsed.code) {
            product = await this.productsService.findByBarcode(
              String(parsed.code),
              orgId,
            );
          }
        }
      } catch {
        // Not JSON — will search as plain string below
      }

      // Fallback: search as plain barcode/qrCode string
      if (!product) {
        product = await this.productsService.findByBarcode(rawCode, orgId);
      }

      client.emit(
        'barcode:result',
        product
          ? this.mapProductResponse(product)
          : { error: 'Producto no encontrado' },
      );
    } catch (error) {
      // Use local reference to logger to avoid 'this' binding issues
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

  // ── Helpers ──────────────────────────────────────────────

  private mapProductResponse(product: any) {
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
    console.log(`[BarcodeGateway] 🔍 Starting tenant context resolution for socket ${client.id}`);
    const authPayload =
      (client.handshake.auth as Record<string, unknown> | undefined) ?? {};
    console.log(`[BarcodeGateway] Auth payload keys:`, Object.keys(authPayload));

    const token = this.resolveToken(client);
    console.log(`[BarcodeGateway] Token resolved:`, token ? `✅ ${token.substring(0, 20)}...` : '❌ No token');
    if (!token) {
      throw new UnauthorizedException('Token requerido.');
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error(`[BarcodeGateway] ❌ JWT_SECRET not configured in environment`);
      throw new UnauthorizedException('JWT secret no configurado.');
    }
    console.log(`[BarcodeGateway] JWT_SECRET configured: ✅`);

    console.log(`[BarcodeGateway] 🔐 Verifying JWT token...`);
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
      console.error(`[BarcodeGateway] ❌ JWT verification failed:`, err);
      throw new UnauthorizedException('Token inválido o expirado.');
    }

    console.log(`[BarcodeGateway] ✅ JWT verified. Payload:`, {
      sub: payload?.sub,
      role: payload?.role,
      tokenVersion: payload?.tokenVersion,
      defaultOrganizationId: payload?.defaultOrganizationId,
      defaultCompanyId: payload?.defaultCompanyId,
    });

    const userId = this.parseNumeric(payload?.sub);
    console.log(`[BarcodeGateway] Parsed userId from token:`, userId);
    if (!userId) {
      console.error(`[BarcodeGateway] ❌ Invalid userId in token`);
      throw new UnauthorizedException('Token inválido.');
    }

    console.log(`[BarcodeGateway] 🔍 Looking up user ${userId} in database...`);
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
    console.log(`[BarcodeGateway] User found:`, user ? `✅ User ${user.id}` : '❌ Not found');
    if (!user) {
      console.error(`[BarcodeGateway] ❌ User ${userId} not found in database`);
      throw new UnauthorizedException('Token revocado.');
    }
    console.log(`[BarcodeGateway] Token version check:`, {
      userVersion: user.tokenVersion,
      payloadVersion: payload.tokenVersion,
      match: user.tokenVersion === payload.tokenVersion,
    });
    if (user.tokenVersion !== payload.tokenVersion) {
      console.error(`[BarcodeGateway] ❌ Token version mismatch for user ${userId}`);
      throw new UnauthorizedException('Token revocado.');
    }
    console.log(`[BarcodeGateway] ✅ User validated:`, {
      id: user.id,
      role: user.role,
      organizationId: user.organizationId,
      lastOrgId: user.lastOrgId,
      lastCompanyId: user.lastCompanyId,
    });

    const normalizedRole = this.normalizeRole(payload.role ?? user.role);
    const isGlobalSuperAdmin =
      normalizedRole === 'SUPER_ADMIN_GLOBAL' ||
      normalizedRole === 'SUPER_ADMIN';
    console.log(`[BarcodeGateway] Role check:`, {
      normalizedRole,
      isGlobalSuperAdmin,
    });

    console.log(`[BarcodeGateway] 🔍 Looking up organization memberships for user ${userId}...`);
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
    console.log(`[BarcodeGateway] Allowed organization IDs:`, allowedOrganizationIds);

    const handshakeOrgId = this.parseNumeric(
      authPayload.orgId ?? client.handshake.headers?.['x-org-id'],
    );
    const handshakeCompanyId = this.parseNumeric(
      authPayload.companyId ?? client.handshake.headers?.['x-company-id'],
    );
    console.log(`[BarcodeGateway] Handshake values:`, {
      orgId: handshakeOrgId,
      companyId: handshakeCompanyId,
    });

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
    console.log(`[BarcodeGateway] Resolved tenant context (before company check):`, {
      organizationId,
      companyId,
    });

    if (companyId !== null) {
      console.log(`[BarcodeGateway] 🔍 Validating company ${companyId}...`);
      const company = await this.prisma.company.findUnique({
        where: { id: companyId },
        select: { id: true, organizationId: true },
      });
      console.log(`[BarcodeGateway] Company found:`, company ? `✅ Company ${company.id}, Org ${company.organizationId}` : '❌ Not found');
      if (!company) {
        console.error(`[BarcodeGateway] ❌ Company ${companyId} not found`);
        throw new UnauthorizedException('Compañía inválida.');
      }
      if (
        organizationId !== null &&
        organizationId !== company.organizationId
      ) {
        console.error(`[BarcodeGateway] ❌ Company ${companyId} belongs to org ${company.organizationId}, but user selected org ${organizationId}`);
        throw new UnauthorizedException(
          'La compañía no pertenece a la organización.',
        );
      }
      organizationId = company.organizationId;
      console.log(`[BarcodeGateway] ✅ Company validated. Using org ${organizationId}`);
    }

    console.log(`[BarcodeGateway] 🔒 Final authorization check...`);
    console.log(`[BarcodeGateway] isGlobalSuperAdmin:`, isGlobalSuperAdmin);
    console.log(`[BarcodeGateway] organizationId:`, organizationId);
    console.log(`[BarcodeGateway] allowedOrganizationIds:`, allowedOrganizationIds);

    if (!isGlobalSuperAdmin) {
      if (
        organizationId === null ||
        !allowedOrganizationIds.includes(organizationId)
      ) {
        console.error(`[BarcodeGateway] ❌ Authorization failed. Org ${organizationId} not in allowed list:`, allowedOrganizationIds);
        throw new UnauthorizedException(
          'No autorizado para la organización seleccionada.',
        );
      }
      console.log(`[BarcodeGateway] ✅ Authorization passed`);
    } else {
      console.log(`[BarcodeGateway] ✅ Authorization bypassed (global super admin)`);
    }

    const allowedCompanyIds = (payload.companies ?? payload.companyIds ?? [])
      .map((id) => this.parseNumeric(id))
      .filter((id): id is number => id !== null);

    const finalContext = {
      userId,
      organizationId,
      companyId,
      isGlobalSuperAdmin,
      allowedOrganizationIds,
      allowedCompanyIds,
    };
    console.log(`[BarcodeGateway] ✅ Final context:`, finalContext);

    return finalContext;
  }
}
