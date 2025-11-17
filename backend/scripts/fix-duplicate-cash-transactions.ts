import { PrismaClient } from '@prisma/client';

type DuplicateGroup = {
  salesId: number;
  paymentMethodId: number;
  currency: string;
  amount: number;
  transactionId: string | null;
  _count: { _all: number };
};

const prisma = new PrismaClient();

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const rawGroups = await prisma.salePayment.groupBy({
    by: ['salesId', 'paymentMethodId', 'currency', 'amount', 'transactionId'],
    _count: { _all: true },
    orderBy: [
      { salesId: 'asc' },
      { paymentMethodId: 'asc' },
    ],
  });

  const groups: DuplicateGroup[] = rawGroups
    .filter((group) => (group._count?._all ?? 0) > 1)
    .map((group) => ({
      salesId: group.salesId,
      paymentMethodId: group.paymentMethodId,
      currency: group.currency,
      amount: group.amount,
      transactionId: group.transactionId,
      _count: { _all: group._count?._all ?? 0 },
    }));

  if (groups.length === 0) {
    console.log('No se encontraron pagos duplicados.');
    return;
  }

  let paymentsRemoved = 0;
  let transactionsRemoved = 0;

  for (const group of groups) {
    await handleGroup(group, dryRun).then((result) => {
      paymentsRemoved += result.removedPayments;
      transactionsRemoved += result.removedTransactions;
    });
  }

  if (dryRun) {
    console.log(
      `DRY-RUN: Se detectarían ${paymentsRemoved} salePayments y ${transactionsRemoved} cashTransactions duplicados.`,
    );
  } else {
    console.log(
      `Se eliminaron ${paymentsRemoved} salePayments y ${transactionsRemoved} cashTransactions duplicados.`,
    );
  }
}

async function handleGroup(
  group: DuplicateGroup,
  dryRun: boolean,
): Promise<{ removedPayments: number; removedTransactions: number }> {
  const payments = await prisma.salePayment.findMany({
    where: {
      salesId: group.salesId,
      paymentMethodId: group.paymentMethodId,
      currency: group.currency,
      amount: group.amount,
      transactionId: group.transactionId,
    },
    orderBy: { id: 'asc' },
    include: {
      cashTransaction: true,
    },
  });

  if (payments.length <= 1) {
    return { removedPayments: 0, removedTransactions: 0 };
  }

  const [, ...duplicates] = payments;
  let removedPayments = 0;
  let removedTransactions = 0;

  for (const duplicate of duplicates) {
    removedPayments += 1;
    if (dryRun) {
      console.log(
        `[DRY-RUN] Eliminaría salePayment ${duplicate.id} (venta ${duplicate.salesId})`,
      );
      if (duplicate.cashTransactionId) {
        removedTransactions += 1;
        console.log(
          `[DRY-RUN]   y cashTransaction ${duplicate.cashTransactionId}`,
        );
      }
      continue;
    }

    await prisma.$transaction(async (tx) => {
      if (duplicate.cashTransactionId) {
        await tx.cashTransactionPaymentMethod.deleteMany({
          where: { cashTransactionId: duplicate.cashTransactionId },
        });
        await tx.cashTransaction.delete({
          where: { id: duplicate.cashTransactionId },
        });
        removedTransactions += 1;
      }

      await tx.salePayment.delete({ where: { id: duplicate.id } });
    });
  }

  return { removedPayments, removedTransactions };
}

main()
  .catch((error) => {
    console.error('Error corrigiendo duplicados de caja:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
