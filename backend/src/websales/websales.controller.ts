import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Patch,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { Request } from 'express';
import { WebSalesService } from './websales.service';
import { CreateWebSaleDto } from './dto/create-websale.dto';
import { CompleteOrderDto } from './dto/complete-order.dto';
import { JwtAuthGuard } from '../users/jwt-auth.guard';
import { RolesGuard } from '../users/roles.guard';
import { Roles } from '../users/roles.decorator';
import { CurrentTenant } from 'src/tenancy/tenant-context.decorator';

const ORDERS_ALLOWED_ROLES = [
  'ADMIN',
  'SUPER_ADMIN_GLOBAL',
  'SUPER_ADMIN_ORG',
] as const;

@Controller('web-sales')
export class WebSalesController {
  constructor(private readonly webSalesService: WebSalesService) {}

  @Post()
  async create(
    @Body() dto: CreateWebSaleDto,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.webSalesService.createWebSale(
      { ...dto, organizationId: dto.organizationId ?? organizationId ?? undefined, companyId: dto.companyId ?? companyId ?? undefined },
    );
  }

  @Post('order')
  async createOrder(
    @Body() dto: CreateWebSaleDto,
    @Req() req: Request,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.webSalesService.createWebOrder(
      { ...dto, organizationId: dto.organizationId ?? organizationId ?? undefined, companyId: dto.companyId ?? companyId ?? undefined },
      req,
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }

  @Post('payments/culqi')
  async payCulqi(
    @Body('token') token: string,
    @Body('amount') amount: number,
    @Body('order') order: CreateWebSaleDto,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    const dto = {
      ...order,
      organizationId: order.organizationId ?? organizationId ?? undefined,
      companyId: order.companyId ?? companyId ?? undefined,
    };
    return this.webSalesService.payWithCulqi(token, amount, dto);
  }

  @Post('order/:id/complete')
  async completeOrder(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CompleteOrderDto,
    @Req() req: Request,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.webSalesService.completeWebOrder(
      id,
      dto,
      req,
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }

  @Patch('order/:id/series')
  async updateOrderSeries(
    @Param('id', ParseIntPipe) id: number,
    @Body('items') items: { productId: number; series: string[] }[],
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    if (!Array.isArray(items)) {
      throw new BadRequestException('Formato inválido: items debe ser un arreglo');
    }
    return this.webSalesService.updateOrderSeries(
      id,
      items,
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }

  @Post('order/:id/reject')
  async rejectOrder(
    @Param('id', ParseIntPipe) id: number,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.webSalesService.rejectWebOrder(
      id,
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }

  @Post('order/:id/proofs')
  @UseInterceptors(
    FilesInterceptor('files', 5, {
      storage: diskStorage({
        destination: './uploads/order-proofs',
        filename: (req, file, cb) => {
          const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${unique}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
          return cb(
            new BadRequestException('Solo se permiten imagenes'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadOrderProofs(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles() files: Express.Multer.File[],
    @Body('description') description: string,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    if (!files?.length) throw new BadRequestException('No se proporcionaron imagenes');
    const urls = files.map((f) => `/uploads/order-proofs/${f.filename}`);
    return this.webSalesService.addOrderProofs(
      id,
      urls,
      description,
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN','SUPER_ADMIN_GLOBAL','SUPER_ADMIN_ORG')
  @Get('orders')
  async getOrders(
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('clientId') clientId?: string,
    @Query('code') code?: string,
    @CurrentTenant('organizationId') organizationId?: number | null,
    @CurrentTenant('companyId') companyId?: number | null,
  ) {
    return this.webSalesService.getOrders({
      status, from, to, clientId, code,
      organizationId: organizationId ?? undefined,
      companyId: companyId ?? undefined,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN','SUPER_ADMIN_GLOBAL','SUPER_ADMIN_ORG')
  @Get('orders/count')
  async getOrdersCount(
    @Query('status') status?: string,
    @CurrentTenant('organizationId') organizationId?: number | null,
    @CurrentTenant('companyId') companyId?: number | null,
  ) {
    const count = await this.webSalesService.getOrderCount(
      status,
      organizationId ?? undefined,
      companyId ?? undefined,
    );
    return { count };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN','SUPER_ADMIN_GLOBAL','SUPER_ADMIN_ORG')
  @Get('orders/recent')
  async getRecentOrders(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
    @CurrentTenant('organizationId') organizationId?: number | null,
    @CurrentTenant('companyId') companyId?: number | null,
  ) {
    const lim = limit ? parseInt(limit, 10) : undefined;
    return this.webSalesService.getRecentOrders({
      from, to, limit: lim,
      organizationId: organizationId ?? undefined,
      companyId: companyId ?? undefined,
    });
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.webSalesService.getWebSaleById(id, organizationId ?? undefined, companyId ?? undefined);
  }

  @Get('order/:id')
  async findOrder(
    @Param('id', ParseIntPipe) id: number,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.webSalesService.getWebOrderById(id, organizationId ?? undefined, companyId ?? undefined);
  }

  @Get('order/by-code/:code')
  async findOrderByCode(
    @Param('code') code: string,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.webSalesService.getWebOrderByCode(code, organizationId ?? undefined, companyId ?? undefined);
  }

  @Get('order/by-user/:id')
  async findOrdersByUser(
    @Param('id', ParseIntPipe) id: number,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.webSalesService.getWebOrdersByUser(id, organizationId ?? undefined, companyId ?? undefined);
  }

  @Get('order/by-email/:email')
  async findOrdersByEmail(
    @Param('email') email: string,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.webSalesService.getWebOrdersByEmail(email, organizationId ?? undefined, companyId ?? undefined);
  }

  @Get('order/by-dni/:dni')
  async findOrdersByDni(
    @Param('dni') dni: string,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.webSalesService.getWebOrdersByDni(dni, organizationId ?? undefined, companyId ?? undefined);
  }
}
