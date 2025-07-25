import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, NotFoundException, UseGuards, Query, BadRequestException } from '@nestjs/common';
import { CashregisterService } from './cashregister.service';
import { CreateCashRegisterDto } from './dto/create-cashregister.dto';
import { UpdateCashRegisterDto } from './dto/update-cashregister.dto';
import { CreateCashClosureDto } from './dto/create-cashclosure.dto';
import { CreateCashTransactionDto } from './dto/create-cashtransactions.dto';
import { JwtAuthGuard } from 'src/users/jwt-auth.guard';

@Controller('cashregister')
export class CashregisterController {
  constructor(private readonly cashregisterService: CashregisterService) {}

  @Post()
  async create(@Body() createCashRegisterDto: CreateCashRegisterDto) {
    return this.cashregisterService.create(createCashRegisterDto);
  }

  @Get()
  async findAll() {
    return this.cashregisterService.findAll();
  }

  @Get('balance/:storeId')
  async getCashRegisterBalance(@Param('storeId', ParseIntPipe) storeId: number) {
    const cashRegister = await this.cashregisterService.getCashRegisterBalance(storeId);

    // En lugar de devolver un 404 cuando no existe caja activa, respondemos con
    // null para que el cliente maneje el estado adecuadamente.
    if (!cashRegister) {
      return null;
    }

    return { currentBalance: cashRegister.currentBalance };
  }

  @Get('transactions/:storeId/today')
  async getTodayTransactions(@Param('storeId', ParseIntPipe) storeId: number) {
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const transactions = await this.cashregisterService.getTransactionsByStoreAndDate(storeId, startOfDay, endOfDay);
    return transactions;
  }

  @UseGuards(JwtAuthGuard)
  @Get('active/:storeId')
  async getActiveCashRegister(@Param('storeId') storeId: number) {
    const cashRegister = await this.cashregisterService.getActiveCashRegister(storeId);

    // Si no hay caja activa simplemente devuelve null. El cliente decidirá qué hacer.
    if (!cashRegister) {
      return null;
    }

    return cashRegister;
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.cashregisterService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCashRegisterDto: UpdateCashRegisterDto,
  ) {
    return this.cashregisterService.update(id, updateCashRegisterDto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.cashregisterService.remove(id);
  }
  
  //////////////////////////////// TRANSFER //////////////////////////////////

  @Post('transaction')
  async createTransaction(@Body() createCashTransactionDto: CreateCashTransactionDto) {
    return this.cashregisterService.createTransaction(createCashTransactionDto);
  }

  @Get('transaction')
  async findAllTransaction() {
    return this.cashregisterService.findAllTransaction();
  }

  @Get('transaction/cashregister/:cashRegisterId')
  async findByCashRegister(@Param('cashRegisterId', ParseIntPipe) cashRegisterId: number) {
    return this.cashregisterService.findByCashRegister(cashRegisterId);
  }

  @Get('get-transactions/:storeId/:date')
    getTransactionsByDate(
      @Param('storeId') storeIdRaw: string,
      @Param('date') date: string
    ) {
      console.log('[GET] /get-transactions', { storeIdRaw, date });

      const storeId = parseInt(storeIdRaw, 10);
      if (isNaN(storeId)) {
        throw new BadRequestException('storeId inválido.');
      }

      const [year, month, day] = date.split('-').map(Number);
      if (!year || !month || !day) {
        throw new BadRequestException('Fecha inválida.');
      }

      const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
      const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);

      return this.cashregisterService.getTransactionsByStoreAndDate(storeId, startOfDay, endOfDay); 
  }

  ///////////////////////////////// CLOSURE //////////////////////////////////

  @Post('closure')
  async createClosure(@Body() createCashClosureDto: CreateCashClosureDto) {
    return this.cashregisterService.createClosure(createCashClosureDto);
  }

  @Get('closures/:storeId')
  async getClosuresByStore(@Param('storeId', ParseIntPipe) storeId: number) {
    return this.cashregisterService.getClosuresByStore(storeId);
  }

  @Get('closure/:storeId/by-date/:date')
  getClosureByDate(
    @Param('storeId', ParseIntPipe) storeId: number,
    @Param('date') date: string,
  ) {
    return this.cashregisterService.getClosureByStoreAndDate(storeId, new Date(date));
  }

  @Get('closure')
  async findAllClosure() {
    return this.cashregisterService.findAllClosure();
  }

}
