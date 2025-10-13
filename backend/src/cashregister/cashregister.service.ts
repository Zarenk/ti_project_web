import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCashTransactionDto } from './dto/create-cashtransactions.dto';
import { CreateCashClosureDto } from './dto/create-cashclosure.dto';
import { CreateCashRegisterDto } from './dto/create-cashregister.dto';
import { UpdateCashRegisterDto } from './dto/update-cashregister.dto';

  @Injectable()
  export class CashregisterService {

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

    constructor(private prisma: PrismaService) {}

    // Crear una nueva caja
    async create(createCashRegisterDto: CreateCashRegisterDto) {
      const { storeId } = createCashRegisterDto;

      // Validar que no haya otra caja activa para esta tienda
      const existingActiveCash = await this.prisma.cashRegister.findFirst({
        where: {
          storeId,
          status: 'ACTIVE',
        },
      });

      if (existingActiveCash) {
        throw new BadRequestException('Ya existe una caja activa para esta tienda.');
      }

      return this.prisma.cashRegister.create({
        data: {
          ...createCashRegisterDto,
          currentBalance: createCashRegisterDto.initialBalance, // 👈 setear también el saldo actual
        },
      });
    }

    async getCashRegisterBalance(storeId: number) {
      const cashRegister = await this.prisma.cashRegister.findFirst({
        where: {
          storeId,
          status: 'ACTIVE',
        },
        select: {
          currentBalance: true,
        },
      });
    
      // Si no existe una caja activa simplemente retorna null para evitar un 404
      return cashRegister || null;
    }

    async getTransactionsByStoreAndDate(storeId: number, startOfDay: Date, endOfDay: Date) {
      const transactions = await this.prisma.cashTransaction.findMany({

        where: {
          cashRegister: {
            storeId: storeId,
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
          cashRegister: {
            storeId,
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
    async getActiveCashRegister(storeId: number) {
      return this.prisma.cashRegister.findFirst({
        where: {
          storeId,
          status: 'ACTIVE',
        },
        select: {
          id: true,
          name: true,
          currentBalance: true,
          initialBalance: true,
        },
      });
    }

    // Listar todas las cajas
    async findAll() {
      return this.prisma.cashRegister.findMany({
        include: {
          store: true,
          transactions: true,
          closures: true,
        },
      });
    }

    // Obtener una caja por ID
    async findOne(id: number) {
      const cashRegister = await this.prisma.cashRegister.findUnique({
        where: { id },
        include: {
          store: true,
          transactions: true,
          closures: true,
        },
      });

      if (!cashRegister) {
        throw new NotFoundException(`No se encontró la caja con ID ${id}`);
      }

      return cashRegister;
    }

    // Actualizar una caja
    async update(id: number, updateCashRegisterDto: UpdateCashRegisterDto) {
      await this.findOne(id); // Validar que existe

      return this.prisma.cashRegister.update({
        where: { id },
        data: updateCashRegisterDto,
      });
    }

    // Eliminar una caja
    async remove(id: number) {
      await this.findOne(id); // Validar que existe

      return this.prisma.cashRegister.delete({
        where: { id },
      });
    }

    /////////////////////////////CASH TRANSFER/////////////////////////////
    
    async createTransaction(data: CreateCashTransactionDto) {
      const { cashRegisterId, userId, type, amount, description, paymentMethods, clientName, clientDocument, clientDocumentType } = data;

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
      const cashRegister = await this.prisma.cashRegister.findUnique({ where: { id: cashRegisterId } });
      if (!cashRegister) {
        throw new NotFoundException(`No se encontró la caja con ID ${cashRegisterId}.`);
      }
    
      if (cashRegister.status !== 'ACTIVE') {
        throw new BadRequestException('No se puede registrar una transacción en una caja cerrada.');
      }
    
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
        },
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

    async findAllTransaction() {
      return this.prisma.cashTransaction.findMany({
        include: {
          cashRegister: true,
          paymentMethods: true,
          user: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    async findByCashRegister(cashRegisterId: number) {
      return this.prisma.cashTransaction.findMany({
        where: { cashRegisterId },
        include: {
          paymentMethods: true,
          user: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    /////////////////////////////CASH CLOSURE/////////////////////////////

    async createClosure(data: CreateCashClosureDto) {
      return this.prisma.$transaction(async (prisma) => {
        const cashRegister = await prisma.cashRegister.findFirst({
          where: {
            id: data.cashRegisterId,
            status: 'ACTIVE',
          },
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

        console.log('datos cashregister', cashRegister);
        console.log('Cierre de caja:', data);

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
          },
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
          },
        });

        return {
          closure: {
            ...closure,
            openingBalance: Number(closure.openingBalance),
            closingBalance: Number(closure.closingBalance),
            totalIncome: Number(closure.totalIncome),
            totalExpense: Number(closure.totalExpense),
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

    async getClosuresByStore(storeId: number) {
      return this.prisma.cashClosure.findMany({
        where: {
          cashRegister: {
            storeId,
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

    async getClosureByStoreAndDate(storeId: number, date: Date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
    
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
    
      return this.prisma.cashClosure.findFirst({
        where: {
          cashRegister: {
            storeId,
          },
          createdAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }

    async findAllClosure() {
      return this.prisma.cashClosure.findMany({
        include: {
          cashRegister: true,
          user: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    
  }