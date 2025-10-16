import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { logOrganizationContext } from 'src/tenancy/organization-context.logger';
import { resolveOrganizationId } from 'src/tenancy/organization.utils';
import { CreateCashTransactionDto } from './dto/create-cashtransactions.dto';
import { CreateCashClosureDto } from './dto/create-cashclosure.dto';
import { CreateCashRegisterDto } from './dto/create-cashregister.dto';
import { UpdateCashRegisterDto } from './dto/update-cashregister.dto';

@Injectable()
export class CashregisterService {

  constructor(private readonly prisma: PrismaService) {}

  private formatPaymentMethods(
    paymentMethods: Array<
      Prisma.CashTransactionPaymentMethodGetPayload<{ include: { paymentMethod: true } }>
    >,
    options?: { includeAmounts?: boolean; currencySymbol?: string },
  ) {
    const includeAmounts = options?.includeAmounts ?? false;
    const currencySymbol = options?.currencySymbol?.trim() || 'S/.';

    return paymentMethods
      .map((paymentMethod) => {
        const methodName = paymentMethod.paymentMethod?.name?.trim();

        if (includeAmounts && paymentMethod.amount !== null && paymentMethod.amount !== undefined) {
          const numericAmount = Number(paymentMethod.amount);

          if (Number.isFinite(numericAmount)) {
            const formattedAmount = `${currencySymbol} ${numericAmount.toFixed(2)}`;
            return methodName ? `${methodName}: ${formattedAmount}` : formattedAmount;
          }
        }

        return methodName ?? null;
      })
      .filter((entry): entry is string => Boolean(entry && entry.trim().length > 0));
  }

  private buildOrganizationFilter(organizationId?: number | null) {
    if (organizationId === undefined) {
      return {};
    }

    return { organizationId };
  }

  private resolveOrganizationId({
    provided,
    fallback,
    fallbacks = [],
    mismatchMessage,
  }: {
    provided?: number | null;
    fallback?: number | null;
    fallbacks?: Array<number | null | undefined>;
    mismatchMessage: string;
  }): number | null {
    const normalizedFallbacks = [
      ...(fallback !== undefined ? [fallback] : []),
      ...fallbacks,
    ].filter((value): value is number | null => value !== undefined);

    return resolveOrganizationId({
      provided,
      fallbacks: normalizedFallbacks,
      mismatchError: mismatchMessage,
    });
  }

  // Crear una nueva caja
  async create(createCashRegisterDto: CreateCashRegisterDto) {
    const { storeId, organizationId: providedOrganizationId, ...rest } = createCashRegisterDto;

    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      throw new NotFoundException(`No se encontró la tienda con ID ${storeId}.`);
    }

    const organizationId = this.resolveOrganizationId({
      provided: providedOrganizationId,
      fallbacks: [
        (store as { organizationId?: number | null }).organizationId ?? null,
      ],
      mismatchMessage: 'La tienda pertenece a otra organización.',
    });

    // Validar que no haya otra caja activa para esta tienda y organización
    const existingActiveCash = await this.prisma.cashRegister.findFirst({
      where: {
        storeId,
        status: 'ACTIVE',
        ...(this.buildOrganizationFilter(organizationId) as any),
      },
    });

    if (existingActiveCash) {
      throw new BadRequestException('Ya existe una caja activa para esta tienda.');
    }

    logOrganizationContext({
      service: CashregisterService.name,
      operation: 'create',
      organizationId,
      metadata: { storeId },
    });

    return this.prisma.cashRegister.create({
      data: {
        ...rest,
        storeId,
        organizationId,
        currentBalance: rest.initialBalance, // 👈 setear también el saldo actual
      } as Prisma.CashRegisterUncheckedCreateInput,
    });
  }

  async getCashRegisterBalance(
    storeId: number,
    options?: { organizationId?: number | null },
  ) {
    const cashRegister = await this.prisma.cashRegister.findFirst({
      where: {
        storeId,
        status: 'ACTIVE',
        ...(this.buildOrganizationFilter(options?.organizationId) as any),
      },
      select: {
        currentBalance: true,
        organizationId: true,
      } as any,
    });

    // Si no existe una caja activa simplemente retorna null para evitar un 404
    return cashRegister || null;
  }

  async getTransactionsByStoreAndDate(
    storeId: number,
    startOfDay: Date,
    endOfDay: Date,
    options?: { organizationId?: number | null },
  ) {
    const organizationFilter = this.buildOrganizationFilter(options?.organizationId) as any;

    const transactions = await this.prisma.cashTransaction.findMany({
      where: {
        ...organizationFilter,
        cashRegister: {
          storeId: storeId,
          ...organizationFilter,
        },
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        cashRegister: true, // 🔧 necesario para que el filtro por relación funcione
        user: true,
        paymentMethods: {
          include: {
              paymentMethod: true,
            }
          },
          salePayments: {
            include: {
              sale: {
                include: {
                  client: true,
                  invoices: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      const closures = await this.prisma.cashClosure.findMany({
        where: {
          ...organizationFilter,
          cashRegister: {
            storeId,
            ...organizationFilter,
          },
          createdAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        include: {
          user: true,
          cashRegister: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    
      const formattedTransactions = transactions.map((tx) => {
        
        const linkedClient = tx.salePayments[0]?.sale?.client;
        return {
          id: tx.id.toString(),
          cashRegisterId: tx.cashRegisterId,
          type: tx.type,
          amount: Number(tx.amount),
          createdAt: tx.createdAt,
          timestamp: tx.createdAt,
          userId: tx.userId,
          employee: tx.user?.username || "Sistema",
          description: tx.description,
          paymentMethods: this.formatPaymentMethods(tx.paymentMethods ?? [], {
            includeAmounts:
              (tx.salePayments ?? []).length === 0 &&
              (tx.paymentMethods ?? []).some((method) => {
                if (method.amount === null || method.amount === undefined) {
                  return false;
                }

                const numericAmount = Number(method.amount);
                return Number.isFinite(numericAmount) && numericAmount !== 0;
              }),
          }),
          voucher: tx.salePayments[0]?.sale?.invoices[0]
            ? `${tx.salePayments[0].sale.invoices[0].serie}-${tx.salePayments[0].sale.invoices[0].nroCorrelativo}`
            : null,
          clientName: linkedClient?.name ?? tx.clientName ?? null,
          clientDocument: linkedClient?.typeNumber ?? tx.clientDocument ?? null,
          clientDocumentType:
            linkedClient?.type ?? tx.clientDocumentType ?? null,
        };
      });
    
      const formattedClosures = closures.map((closure) => ({
        id: `closure-${closure.id}`,
        cashRegisterId: closure.cashRegisterId,
        cashRegisterName: closure.cashRegister?.name ?? null,
        type: "CLOSURE",
        amount: Number(closure.closingBalance),
        createdAt: closure.createdAt,
        timestamp: closure.createdAt,
        userId: closure.userId,
        employee: closure.user?.username || "Sistema",
        description: closure.notes || "Cierre de caja",
        paymentMethods: [],
        openingBalance: Number(closure.openingBalance),
        closingBalance: Number(closure.closingBalance),
        totalIncome: Number(closure.totalIncome),
        totalExpense: Number(closure.totalExpense),
        nextOpeningBalance:
          (closure as any).nextOpeningBalance !== null &&
          (closure as any).nextOpeningBalance !== undefined
            ? Number((closure as any).nextOpeningBalance)
            : null,
        notes: closure.notes ?? null,
        currency: "S/.",
      }));
    
      const allRecords = [...formattedTransactions, ...formattedClosures].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      console.log(`✅ Total registros: ${allRecords.length}`);
      
      return allRecords;
    }

    // Obtener la caja activa de una tienda
    async getActiveCashRegister(
      storeId: number,
      options?: { organizationId?: number | null },
    ) {
      return this.prisma.cashRegister.findFirst({
        where: {
          storeId,
          status: 'ACTIVE',
          ...(this.buildOrganizationFilter(options?.organizationId) as any),
        },
        select: {
          id: true,
          name: true,
          currentBalance: true,
          initialBalance: true,
          organizationId: true,
        } as any,
      });
    }

    // Listar todas las cajas
  async findAll(options?: { organizationId?: number | null }) {
    return this.prisma.cashRegister.findMany({
      where: this.buildOrganizationFilter(options?.organizationId) as any,
      include: {
        store: true,
        transactions: true,
        closures: true,
      },
    });
  }

  // Obtener una caja por ID
  async findOne(
    id: number,
    options?: { organizationId?: number | null },
  ) {
    const cashRegister = await this.prisma.cashRegister.findFirst({
      where: {
        id,
        ...(this.buildOrganizationFilter(options?.organizationId) as any),
      },
      include: {
        store: true,
        transactions: true,
        closures: true,
      } as any,
    });

    if (!cashRegister) {
      throw new NotFoundException(
        `No se encontró la caja con ID ${id}` +
          (options?.organizationId !== undefined
            ? ' para la organización solicitada.'
            : '.'),
      );
    }

    // Obtener una caja por ID
    return cashRegister;
  }

      // Actualizar una caja
  async update(id: number, updateCashRegisterDto: UpdateCashRegisterDto) {
    const existing = await this.findOne(id, {
      organizationId: updateCashRegisterDto.organizationId,
    });

    const normalizedExisting = existing as {
      organizationId?: number | null;
      store?: { organizationId?: number | null } | null;
    };

    const organizationId = this.resolveOrganizationId({
      provided: updateCashRegisterDto.organizationId,
      fallbacks: [
        normalizedExisting.organizationId ?? null,
        normalizedExisting.store?.organizationId ?? null,
      ],
      mismatchMessage: 'La caja pertenece a otra organización.',
    });

    logOrganizationContext({
      service: CashregisterService.name,
      operation: 'update',
      organizationId,
      metadata: { cashRegisterId: id },
    });

    return this.prisma.cashRegister.update({
      where: { id },
      data: {
        ...updateCashRegisterDto,
        organizationId,
      } as Prisma.CashRegisterUncheckedUpdateInput,
    });
  }

    // Eliminar una caja
  async remove(
    id: number,
    options?: { organizationId?: number | null },
  ) {
    const existing = await this.findOne(id, options);

    const normalizedExisting = existing as { organizationId?: number | null };

    logOrganizationContext({
      service: CashregisterService.name,
      operation: 'remove',
      organizationId: normalizedExisting.organizationId ?? null,
      metadata: { cashRegisterId: id },
    });

    return this.prisma.cashRegister.delete({
      where: { id },
    });
  }

    /////////////////////////////CASH TRANSFER/////////////////////////////
    
    async createTransaction(data: CreateCashTransactionDto) {
    const {
      cashRegisterId,
      userId,
      type,
      amount,
      description,
      paymentMethods,
      clientName,
      clientDocument,
      clientDocumentType,
      organizationId: providedOrganizationId,
    } = data;

      // Validaciones básicas
      if (!['INCOME', 'EXPENSE'].includes(type)) {
        throw new BadRequestException('El tipo de transacción debe ser INCOME o EXPENSE.');
      }
      
      if (amount <= 0) {
        throw new BadRequestException('El monto debe ser mayor a 0.');
      }
    
      // Verificar existencia de usuario
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException(`No se encontró el usuario con ID ${userId}.`);
      }
    
      // Verificar existencia de caja activa
      const cashRegister = await this.prisma.cashRegister.findUnique({
        where: { id: cashRegisterId },
        include: {
          store: {
            select: {
              organizationId: true,
            },
          },
        } as any,
      });
      if (!cashRegister) {
        throw new NotFoundException(`No se encontró la caja con ID ${cashRegisterId}.`);
      }
    
      if (cashRegister.status !== 'ACTIVE') {
        throw new BadRequestException('No se puede registrar una transacción en una caja cerrada.');
      }

      const organizationId = this.resolveOrganizationId({
        provided: providedOrganizationId,
        fallbacks: [
          (cashRegister as any).organizationId ?? null,
          (cashRegister as any).store?.organizationId ?? null,
        ],
        mismatchMessage: 'La caja pertenece a otra organización.',
      });

      logOrganizationContext({
        service: CashregisterService.name,
        operation: 'createTransaction',
        organizationId,
        metadata: { cashRegisterId, userId, type },
      });
    
      // Calcular nuevo balance
      const newBalance = type === 'INCOME'
        ? Number(cashRegister.currentBalance) + Number(amount)
        : Number(cashRegister.currentBalance) - Number(amount);
    
      if (newBalance < 0) {
        throw new BadRequestException('El saldo de la caja no puede ser negativo.');
      }
    
      // Crear la transacción de caja
      const transaction = await this.prisma.cashTransaction.create({
        data: {
          cashRegisterId,
          type,
          amount,
          description: description || '',
          userId,
          createdAt: new Date(),
          clientName: clientName || null,
          clientDocument: clientDocument || null,
          clientDocumentType: clientDocumentType || null,
          organizationId,
        } as Prisma.CashTransactionUncheckedCreateInput,
      });
    
      // Asociar métodos de pago
      for (const method of paymentMethods) {
        let paymentMethodRecord = await this.prisma.paymentMethod.findFirst({
          where: { name: method.method },
        });

        console.log("Métodos de pago recibidos en backend:", paymentMethods);

        // Si el método no existe, lo CREO automáticamente
        if (!paymentMethodRecord) {
          paymentMethodRecord = await this.prisma.paymentMethod.create({
            data: {
              name: method.method,
              isActive: true, // Opcional si tienes este campo en tu modelo
            },
          });
          console.log(`⚡ Método de pago '${method.method}' creado automáticamente.`);
        }

        // Luego síguelo registrando en cashTransactionPaymentMethod
        await this.prisma.cashTransactionPaymentMethod.create({
          data: {
            cashTransactionId: transaction.id,
            paymentMethodId: paymentMethodRecord.id, // ← Ahora seguro que existe
            amount: new Prisma.Decimal(method.amount),
          },
        });
      }
    
      // Actualizar el saldo de la caja
      await this.prisma.cashRegister.update({
        where: { id: cashRegisterId },
        data: {
          currentBalance: newBalance,
        },
      });
    
      return transaction;
    }

    async findAllTransaction(options?: { organizationId?: number | null }) {
      return this.prisma.cashTransaction.findMany({
        where: this.buildOrganizationFilter(options?.organizationId) as any,
        include: {
          cashRegister: true,
          paymentMethods: true,
          user: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    async findByCashRegister(
    cashRegisterId: number,
    options?: { organizationId?: number | null },
    ) {
      return this.prisma.cashTransaction.findMany({
        where: {
          cashRegisterId,
          ...(this.buildOrganizationFilter(options?.organizationId) as any),
        },
        include: {
          paymentMethods: true,
          user: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    /////////////////////////////CASH CLOSURE/////////////////////////////

    async createClosure(data: CreateCashClosureDto) {
    const { organizationId: providedOrganizationId } = data;

    return this.prisma.$transaction(async (prisma) => {
      const cashRegister = await prisma.cashRegister.findFirst({
        where: {
          id: data.cashRegisterId,
          status: 'ACTIVE',
          ...(this.buildOrganizationFilter(providedOrganizationId) as any),
        },
        include: {
          store: {
            select: {
              organizationId: true,
            },
          },
        } as any,
      });

      if (!cashRegister) {
        throw new NotFoundException('Caja activa no encontrada.');
      }

      if (cashRegister.status !== 'ACTIVE') {
        throw new BadRequestException('La caja ya ha sido cerrada.');
      }

      if (cashRegister.storeId !== data.storeId) {
        throw new BadRequestException(
          'La caja seleccionada no pertenece a la tienda indicada para el cierre.',
        );
      }

      const organizationId = this.resolveOrganizationId({
        provided: providedOrganizationId,
        fallbacks: [
          (cashRegister as any).organizationId ?? null,
          (cashRegister as any).store?.organizationId ?? null,
        ],
        mismatchMessage: 'La caja pertenece a otra organización.',
      });

      logOrganizationContext({
        service: CashregisterService.name,
        operation: 'createClosure',
        organizationId,
        metadata: {
          storeId: data.storeId,
          cashRegisterId: data.cashRegisterId,
          userId: data.userId,
        },
      });

      const closedCashRegister = await prisma.cashRegister.update({
        where: { id: data.cashRegisterId },
        data: {
          status: 'CLOSED',
          currentBalance: data.closingBalance,
        },
      });

      const requestedNextInitialBalance =
        typeof data.nextInitialBalance === 'number'
          ? Number(data.nextInitialBalance)
          : Number(data.closingBalance);

      if (requestedNextInitialBalance < 0) {
        throw new BadRequestException('El saldo inicial de la siguiente caja no puede ser negativo.');
      }

      const closure = await prisma.cashClosure.create({
        data: {
          cashRegisterId: data.cashRegisterId,
          userId: data.userId,
          openingBalance: data.openingBalance,
          closingBalance: data.closingBalance,
          totalIncome: data.totalIncome,
          totalExpense: data.totalExpense,
          notes: data.notes,
          nextOpeningBalance: requestedNextInitialBalance,
          organizationId,
        } as Prisma.CashClosureUncheckedCreateInput,
      });

    const nextCashRegisterName = await this.generateNextCashRegisterName(
        prisma,
        cashRegister.name,
      );

      const nextCashRegister = await prisma.cashRegister.create({
        data: {
          name: nextCashRegisterName,
          description: cashRegister.description,
          storeId: cashRegister.storeId,
          initialBalance: requestedNextInitialBalance,
          currentBalance: requestedNextInitialBalance,
          status: 'ACTIVE',
          organizationId,
        } as Prisma.CashRegisterUncheckedCreateInput,
      });

    return {
        closure: {
          ...closure,
          openingBalance: Number(closure.openingBalance),
          closingBalance: Number(closure.closingBalance),
          totalIncome: Number(closure.totalIncome),
          totalExpense: Number(closure.totalExpense),
          nextOpeningBalance:
            (closure as any).nextOpeningBalance !== null &&
            (closure as any).nextOpeningBalance !== undefined
              ? Number((closure as any).nextOpeningBalance)
              : null,
        },
        closedCashRegister: {
          ...closedCashRegister,
          initialBalance: Number(closedCashRegister.initialBalance),
          currentBalance: Number(closedCashRegister.currentBalance),
        },
        nextCashRegister: {
          ...nextCashRegister,
          initialBalance: Number(nextCashRegister.initialBalance),
          currentBalance: Number(nextCashRegister.currentBalance),
        },
      requestedNextInitialBalance,
      };
    });
  }

  private async generateNextCashRegisterName(
    prisma: Prisma.TransactionClient,
    baseName: string,
  ): Promise<string> {
    const normalizedBase = baseName
      .replace(/\s+-\s+Turno\s+.+$/i, '')
      .trim() || baseName.trim() || 'Caja';

    const now = new Date();
    const pad = (value: number) => value.toString().padStart(2, '0');
    const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

    let attempt = 0;
    let candidate = `${normalizedBase} - Turno ${timestamp}`;

    // Garantiza nombres únicos en caso de cierres simultáneos
    while (
      await prisma.cashRegister.findUnique({
        where: { name: candidate },
      })
    ) {
      attempt += 1;
      candidate = `${normalizedBase} - Turno ${timestamp}-${attempt}`;
    }

    return candidate;
  }

  async getClosuresByStore(
    storeId: number,
    options?: { organizationId?: number | null },
  ) {
    const organizationFilter = this.buildOrganizationFilter(options?.organizationId) as any;

    return this.prisma.cashClosure.findMany({
      where: {
        ...organizationFilter,
        cashRegister: {
          storeId,
          ...organizationFilter,
        },
        },
      include: {
        user: true,
        cashRegister: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getClosureByStoreAndDate(
    storeId: number,
    date: Date,
    options?: { organizationId?: number | null },
  ) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const organizationFilter = this.buildOrganizationFilter(options?.organizationId) as any;

    return this.prisma.cashClosure.findFirst({
      where: {
        ...organizationFilter,
        cashRegister: {
          storeId,
          ...organizationFilter,
        },
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllClosure(options?: { organizationId?: number | null  }) {
    return this.prisma.cashClosure.findMany({
      where: this.buildOrganizationFilter(options?.organizationId) as any,
      include: {
        cashRegister: true,
        user: true,
      },
      orderBy: { createdAt: 'desc' },
    });   
  }
}
