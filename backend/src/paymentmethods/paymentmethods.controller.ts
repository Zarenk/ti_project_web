import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { PaymentMethodsService } from './paymentmethods.service';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller('paymentmethods')
export class PaymentMethodsController {
  constructor(private readonly paymentMethodsService: PaymentMethodsService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener todos los métodos de pago activos' })
  @ApiResponse({ status: 200, description: 'Lista de métodos de pago activos' })
  async getAllActivePaymentMethods() {
    const methods = await this.paymentMethodsService.getAllActivePaymentMethods();
    return methods; // 🔥 asegurarte que realmente devuelves los datos
  }

  @Post()
  async createPaymentMethod(@Body() data: { name: string; description?: string }) {
    return this.paymentMethodsService.createPaymentMethod(data);
  }

  @Patch(':id')
  async updatePaymentMethod(
    @Param('id') id: number,
    @Body() data: { name?: string; description?: string; isActive?: boolean },
  ) {
    return this.paymentMethodsService.updatePaymentMethod(id, data);
  }
}