export interface Transaction {
    id: string; // ID único de la transacción
    cashRegisterId: number; // ID de la caja asociada
    cashRegisterName?: string; // Nombre de la caja (opcional)
    type: "INCOME" | "EXPENSE" | "CLOSURE"; // Tipo de transacción (alineado con el backend)
    amount: number; // Monto de la transacción
    createdAt: Date; 
    currency?: string; // Moneda de la transacción (e.g., "PEN", "USD")
    description?: string; // Descripción de la transacción
    paymentMethods?: string[]; // Método de pago (e.g., "Efectivo", "Tarjeta")
    userId: number; // ID del empleado que realizó la transacción
    employee: string; // Nombre del empleado que realizó la transacción
    timestamp: Date; // Fecha y hora de la transacción
    status?: "completed" | "pending" | "failed"; // Estado de la transacción (opcional)
    expectedAmount?: number; // Monto esperado (para cierres de caja)
    discrepancy?: number; // Diferencia entre el monto esperado y el real (para cierres de caja)
    notes?: string; // Notas adicionales (opcional)

    internalType?: "INCOME" | "EXPENSE" | "CLOSURE" | "UNKNOWN"; // 👈 NUEVO
    clientName?: string | null;
    clientDocument?: string | null;
    clientDocumentType?: string | null;
    voucher?: string | null;
    invoiceUrl?: string | null;
  }
