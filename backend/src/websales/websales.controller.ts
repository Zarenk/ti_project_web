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

@Controller('web-sales')
export class WebSalesController {
  constructor(private readonly webSalesService: WebSalesService) {}

  @Post()
  async create(@Body() dto: CreateWebSaleDto) {
    return this.webSalesService.createWebSale(dto);
  }

  @Post('order')
  async createOrder(@Body() dto: CreateWebSaleDto, @Req() req: Request) {
    return this.webSalesService.createWebOrder(dto, req);
  }

  @Post('payments/culqi')
  async payCulqi(
    @Body('token') token: string,
    @Body('amount') amount: number,
    @Body('order') order: CreateWebSaleDto,
  ) {
    return this.webSalesService.payWithCulqi(token, amount, order);
  }

  @Post('order/:id/complete')
  async completeOrder(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CompleteOrderDto,
    @Req() req: Request,
  ) {
    return this.webSalesService.completeWebOrder(id, dto, req);
  }

  @Patch('order/:id/series')
  async updateOrderSeries(
    @Param('id', ParseIntPipe) id: number,
    @Body('items') items: { productId: number; series: string[] }[],
  ) {
    if (!Array.isArray(items)) {
      throw new BadRequestException(
        'Formato inválido: items debe ser un arreglo',
      );
    }
    return this.webSalesService.updateOrderSeries(id, items);
  }
  
  @Post('order/:id/reject')
  async rejectOrder(@Param('id', ParseIntPipe) id: number) {
    return this.webSalesService.rejectWebOrder(id);
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
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No se proporcionaron imagenes');
    }
    const urls = files.map((f) => `/uploads/order-proofs/${f.filename}`);
    return this.webSalesService.addOrderProofs(id, urls, description);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('orders')
  async getOrders(
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('clientId') clientId?: string,
    @Query('code') code?: string,
  ) {
    return this.webSalesService.getOrders({ status, from, to, clientId, code });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('orders/count')
  async getOrdersCount(@Query('status') status?: string) {
    const count = await this.webSalesService.getOrderCount(status);
    return { count };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('orders/recent')
  async getRecentOrders(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    const lim = limit ? parseInt(limit, 10) : undefined;
    return this.webSalesService.getRecentOrders({ from, to, limit: lim });
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.webSalesService.getWebSaleById(id);
  }

  @Get('order/:id')
  async findOrder(@Param('id', ParseIntPipe) id: number) {
    return this.webSalesService.getWebOrderById(id);
  }

  @Get('order/by-code/:code')
  async findOrderByCode(@Param('code') code: string) {
    return this.webSalesService.getWebOrderByCode(code);
  }

  @Get('order/by-user/:id')
  async findOrdersByUser(@Param('id', ParseIntPipe) id: number) {
    return this.webSalesService.getWebOrdersByUser(id);
  }

  @Get('order/by-email/:email')
  async findOrdersByEmail(@Param('email') email: string) {
    return this.webSalesService.getWebOrdersByEmail(email);
  }

  @Get('order/by-dni/:dni')
  async findOrdersByDni(@Param('dni') dni: string) {
    return this.webSalesService.getWebOrdersByDni(dni);
  }
}
