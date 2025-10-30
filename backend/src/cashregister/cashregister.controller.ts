import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  UseGuards,
  Query,
} from '@nestjs/common';
import { CashregisterService } from './cashregister.service';
import { CreateCashRegisterDto } from './dto/create-cashregister.dto';
import { UpdateCashRegisterDto } from './dto/update-cashregister.dto';
import { CreateCashClosureDto } from './dto/create-cashclosure.dto';
import { CreateCashTransactionDto } from './dto/create-cashtransactions.dto';
import { JwtAuthGuard } from 'src/users/jwt-auth.guard';
import { CurrentTenant } from 'src/tenancy/tenant-context.decorator';

@Controller('cashregister')
export class CashregisterController {
  constructor(private readonly cashregisterService: CashregisterService) {}

  private parseOrganizationId(raw?: string): number | null | undefined {
    if (raw === undefined) {
      return undefined;
    }

    const normalized = raw.trim().toLowerCase();

    if (normalized.length === 0 || normalized === 'undefined') {
      return undefined;
    }

    if (normalized === 'null') {
      return null;
    }

    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
      throw new BadRequestException('organizationId invalido.');
    }

    return parsed;
  }

  private mergeOrganizationId(
    provided?: number | null,
    context?: number | null,
  ): number | null | undefined {
    if (provided === undefined) {
      return context === undefined ? undefined : context;
    }

    if (context === undefined || context === null) {
      return provided;
    }

    if (provided === context) {
      return provided;
    }

    throw new BadRequestException(
      'La organizacion proporcionada no coincide con el contexto actual.',
    );
  }

  private parseCompanyId(raw?: string): number | null | undefined {
  if (raw === undefined) return undefined;

  const normalized = raw.trim().toLowerCase();
  if (normalized.length === 0 || normalized === 'undefined') return undefined;
  if (normalized === 'null') return null;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    throw new BadRequestException('companyId invalido.');
  }
  return parsed;
  }

private mergeCompanyId(
  provided?: number | null,
  context?: number | null,
): number | null | undefined {
  if (provided === undefined) {
    return context === undefined ? undefined : context;
  }
  if (context === undefined || context === null) {
    return provided;
  }
  if (provided === context) {
    return provided;
  }
  throw new BadRequestException(
    'La compania proporcionada no coincide con el contexto actual.',
  );
}

  @Post()
  async create(
    @Body() createCashRegisterDto: CreateCashRegisterDto,
    @CurrentTenant('organizationId') organizationIdFromContext: number | null,
    @CurrentTenant('companyId') companyIdFromContext: number | null,
  ) {
    const organizationId = this.mergeOrganizationId(
      createCashRegisterDto.organizationId,
      organizationIdFromContext,
    );
    const companyId = this.mergeCompanyId(
      createCashRegisterDto.companyId,
      companyIdFromContext,
    );

    return this.cashregisterService.create({
      ...createCashRegisterDto,
      organizationId,
      companyId,
    });
  }

  @Get()
  async findAll(
    @Query('organizationId') organizationIdRaw?: string,
    @CurrentTenant('organizationId') organizationIdFromContext?: number | null,
    @Query('companyId') companyIdRaw?: string,
    @CurrentTenant('companyId') companyIdFromContext?: number | null,
  ) {
    const organizationId = this.mergeOrganizationId(
      this.parseOrganizationId(organizationIdRaw),
      organizationIdFromContext,
    );
    const companyId = this.mergeCompanyId(
      this.parseCompanyId(companyIdRaw),
      companyIdFromContext,
    );
    return this.cashregisterService.findAll({ organizationId, companyId });
  }

  @Get('balance/:storeId')
  async getCashRegisterBalance(
    @Param('storeId', ParseIntPipe) storeId: number,
    @Query('organizationId') organizationIdRaw?: string,
    @CurrentTenant('organizationId') organizationIdFromContext?: number | null,
    @Query('companyId') companyIdRaw?: string,
    @CurrentTenant('companyId') companyIdFromContext?: number | null,
  ) {
    const organizationId = this.mergeOrganizationId(
      this.parseOrganizationId(organizationIdRaw),
      organizationIdFromContext,
    );
    const companyId = this.mergeCompanyId(
      this.parseCompanyId(companyIdRaw),
      companyIdFromContext,
    );
    const cashRegister = await this.cashregisterService.getCashRegisterBalance(
      storeId,
      {
        organizationId,
        companyId,
      },
    );

    // En lugar de devolver un 404 cuando no existe caja activa, respondemos con
    // null para que el cliente maneje el estado adecuadamente.
    if (!cashRegister) {
      return null;
    }

    return { currentBalance: cashRegister.currentBalance };
  }

  @Get('transactions/:storeId/today')
  async getTodayTransactions(
    @Param('storeId', ParseIntPipe) storeId: number,
    @Query('organizationId') organizationIdRaw?: string,
    @CurrentTenant('organizationId') organizationIdFromContext?: number | null,
    @Query('companyId') companyIdRaw?: string,
    @CurrentTenant('companyId') companyIdFromContext?: number | null,
  ) {
    const organizationId = this.mergeOrganizationId(
      this.parseOrganizationId(organizationIdRaw),
      organizationIdFromContext,
    );
    const companyId = this.mergeCompanyId(
      this.parseCompanyId(companyIdRaw),
      companyIdFromContext,
    );
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const transactions =
      await this.cashregisterService.getTransactionsByStoreAndDate(
        storeId,
        startOfDay,
        endOfDay,
        { organizationId, companyId },
      );
    return transactions;
  }

  @UseGuards(JwtAuthGuard)
  @Get('active/:storeId')
  async getActiveCashRegister(
    @Param('storeId') storeId: number,
    @Query('organizationId') organizationIdRaw?: string,
    @CurrentTenant('organizationId') organizationIdFromContext?: number | null,
    @Query('companyId') companyIdRaw?: string,
    @CurrentTenant('companyId') companyIdFromContext?: number | null,
  ) {
    const organizationId = this.mergeOrganizationId(
      this.parseOrganizationId(organizationIdRaw),
      organizationIdFromContext,
    );
    const companyId = this.mergeCompanyId(
      this.parseCompanyId(companyIdRaw),
      companyIdFromContext,
    );
    const cashRegister = await this.cashregisterService.getActiveCashRegister(
      storeId,
      {
        organizationId,
        companyId,
      },
    );

    // Si no hay caja activa simplemente devuelve null. El cliente decidira que hacer.
    if (!cashRegister) {
      return null;
    }

    return cashRegister;
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query('organizationId') organizationIdRaw?: string,
    @CurrentTenant('organizationId')
    organizationIdFromContext?: number | null,
    @Query('companyId') companyIdRaw?: string,
    @CurrentTenant('companyId') companyIdFromContext?: number | null,
  ) {
    const organizationId = this.mergeOrganizationId(
      this.parseOrganizationId(organizationIdRaw),
      organizationIdFromContext,
    );
    const companyId = this.mergeCompanyId(
      this.parseCompanyId(companyIdRaw),
      companyIdFromContext,
    );

    return this.cashregisterService.findOne(id, { organizationId, companyId });
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCashRegisterDto: UpdateCashRegisterDto,
    @CurrentTenant('organizationId') organizationIdFromContext: number | null,
    @CurrentTenant('companyId') companyIdFromContext: number | null,
  ) {
    const organizationId = this.mergeOrganizationId(
      updateCashRegisterDto.organizationId,
      organizationIdFromContext,
    );
    const companyId = this.mergeCompanyId(
      updateCashRegisterDto.companyId,
      companyIdFromContext,
    );
    return this.cashregisterService.update(id, {
      ...updateCashRegisterDto,
      organizationId,
      companyId,
    });
  }

  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Query('organizationId') organizationIdRaw?: string,
    @CurrentTenant('organizationId')
    organizationIdFromContext?: number | null,
    @Query('companyId') companyIdRaw?: string,
    @CurrentTenant('companyId') companyIdFromContext?: number | null,
  ) {
    const organizationId = this.mergeOrganizationId(
      this.parseOrganizationId(organizationIdRaw),
      organizationIdFromContext,
    );
    const companyId = this.mergeCompanyId(
      this.parseCompanyId(companyIdRaw),
      companyIdFromContext,
    );

    return this.cashregisterService.remove(id, { organizationId, companyId });
  }

  //////////////////////////////// TRANSFER //////////////////////////////////

  @Post('transaction')
  async createTransaction(
    @Body() createCashTransactionDto: CreateCashTransactionDto,
    @CurrentTenant('organizationId') organizationIdFromContext: number | null,
    @CurrentTenant('companyId') companyIdFromContext: number | null,
  ) {
    const organizationId = this.mergeOrganizationId(
      createCashTransactionDto.organizationId,
      organizationIdFromContext,
    );
    const companyId = this.mergeCompanyId(
      createCashTransactionDto.companyId,
      companyIdFromContext,
    );
    return this.cashregisterService.createTransaction({
      ...createCashTransactionDto,
      organizationId,
      companyId,
    });
  }

  @Get('transaction')
  async findAllTransaction(
    @Query('organizationId') organizationIdRaw?: string,
    @CurrentTenant('organizationId') organizationIdFromContext?: number | null,
    @Query('companyId') companyIdRaw?: string,
    @CurrentTenant('companyId') companyIdFromContext?: number | null,
  ) {
    const organizationId = this.mergeOrganizationId(
      this.parseOrganizationId(organizationIdRaw),
      organizationIdFromContext,
    );
    const companyId = this.mergeCompanyId(
      this.parseCompanyId(companyIdRaw),
      companyIdFromContext,
    );
    return this.cashregisterService.findAllTransaction({
      organizationId,
      companyId,
    });
  }

  @Get('transaction/cashregister/:cashRegisterId')
  async findByCashRegister(
    @Param('cashRegisterId', ParseIntPipe) cashRegisterId: number,
    @Query('organizationId') organizationIdRaw?: string,
    @CurrentTenant('organizationId') organizationIdFromContext?: number | null,
    @Query('companyId') companyIdRaw?: string,
    @CurrentTenant('companyId') companyIdFromContext?: number | null,
  ) {
    const organizationId = this.mergeOrganizationId(
      this.parseOrganizationId(organizationIdRaw),
      organizationIdFromContext,
    );
    const companyId = this.mergeCompanyId(
      this.parseCompanyId(companyIdRaw),
      companyIdFromContext,
    );
    return this.cashregisterService.findByCashRegister(cashRegisterId, {
      organizationId,
      companyId,
    });
  }

  @Get('get-transactions/:storeId/:date')
  getTransactionsByDate(
    @Param('storeId') storeIdRaw: string,
    @Param('date') date: string,
    @Query('organizationId') organizationIdRaw?: string,
    @CurrentTenant('organizationId') organizationIdFromContext?: number | null,
    @Query('companyId') companyIdRaw?: string,
    @CurrentTenant('companyId') companyIdFromContext?: number | null,
  ) {
    console.log('[GET] /get-transactions', { storeIdRaw, date });

    const storeId = parseInt(storeIdRaw, 10);
    if (isNaN(storeId)) {
      throw new BadRequestException('storeId invalido.');
    }

    const organizationId = this.mergeOrganizationId(
      this.parseOrganizationId(organizationIdRaw),
      organizationIdFromContext,
    );
    const companyId = this.mergeCompanyId(
      this.parseCompanyId(companyIdRaw),
      companyIdFromContext,
    );

    const [year, month, day] = date.split('-').map(Number);
    if (!year || !month || !day) {
      throw new BadRequestException('Fecha invalida.');
    }

    const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
    const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);

    return this.cashregisterService.getTransactionsByStoreAndDate(
      storeId,
      startOfDay,
      endOfDay,
      {
        organizationId,
        companyId,
      },
    );
  }

  ///////////////////////////////// CLOSURE //////////////////////////////////

  @Post('closure')
  async createClosure(
    @Body() createCashClosureDto: CreateCashClosureDto,
    @CurrentTenant('organizationId') organizationIdFromContext: number | null,
    @CurrentTenant('companyId') companyIdFromContext: number | null,
  ) {
    const organizationId = this.mergeOrganizationId(
      createCashClosureDto.organizationId,
      organizationIdFromContext,
    );
    const companyId = this.mergeCompanyId(
      createCashClosureDto.companyId,
      companyIdFromContext,
    );
    return this.cashregisterService.createClosure({
      ...createCashClosureDto,
      organizationId,
      companyId,
    });
  }

  @Get('closures/:storeId')
  async getClosuresByStore(
    @Param('storeId', ParseIntPipe) storeId: number,
    @Query('organizationId') organizationIdRaw?: string,
    @CurrentTenant('organizationId') organizationIdFromContext?: number | null,
    @Query('companyId') companyIdRaw?: string,
    @CurrentTenant('companyId') companyIdFromContext?: number | null,
  ) {
    const organizationId = this.mergeOrganizationId(
      this.parseOrganizationId(organizationIdRaw),
      organizationIdFromContext,
    );
    const companyId = this.mergeCompanyId(
      this.parseCompanyId(companyIdRaw),
      companyIdFromContext,
    );
    return this.cashregisterService.getClosuresByStore(storeId, {
      organizationId,
      companyId,
    });
  }

  @Get('closure/:storeId/by-date/:date')
  getClosureByDate(
    @Param('storeId', ParseIntPipe) storeId: number,
    @Param('date') date: string,
    @Query('organizationId') organizationIdRaw?: string,
    @CurrentTenant('organizationId') organizationIdFromContext?: number | null,
    @Query('companyId') companyIdRaw?: string,
    @CurrentTenant('companyId') companyIdFromContext?: number | null,
  ) {
    const organizationId = this.mergeOrganizationId(
      this.parseOrganizationId(organizationIdRaw),
      organizationIdFromContext,
    );
    const companyId = this.mergeCompanyId(
      this.parseCompanyId(companyIdRaw),
      companyIdFromContext,
    );
    return this.cashregisterService.getClosureByStoreAndDate(
      storeId,
      new Date(date),
      { organizationId, companyId },
    );
  }

  @Get('closure')
  async findAllClosure(
    @Query('organizationId') organizationIdRaw?: string,
    @CurrentTenant('organizationId') organizationIdFromContext?: number | null,
    @Query('companyId') companyIdRaw?: string,
    @CurrentTenant('companyId') companyIdFromContext?: number | null,
  ) {
    const organizationId = this.mergeOrganizationId(
      this.parseOrganizationId(organizationIdRaw),
      organizationIdFromContext,
    );
    const companyId = this.mergeCompanyId(
      this.parseCompanyId(companyIdRaw),
      companyIdFromContext,
    );
    return this.cashregisterService.findAllClosure({ organizationId, companyId });
  }
}
