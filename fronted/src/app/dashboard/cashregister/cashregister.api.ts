import axios from "axios";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

// CAJA
export async function getCashRegisterBalance(storeId: number) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/cashregister/balance/${storeId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error('Error al obtener el balance');
    }

    const data = await response.json();
    // Si el backend devuelve null significa que no hay caja activa
    if (data === null || data.currentBalance === null || data.currentBalance === undefined) {
      return null;
    }

    return Number(data.currentBalance ?? 0);
  } catch (error: any) {
    console.error('Error al obtener el balance de la caja:', error.message || error);
    throw error;
  }
}

export async function getTodayTransactions(storeId: number) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/cashregister/transactions/${storeId}/today`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Error al obtener las transacciones del día.');
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('Error al obtener las transacciones del día:', error.message || error);
    throw error;
  }
}

export const createIndependentTransaction = async (data: {
  cashRegisterId: number;
  userId: number;
  type: "INCOME" | "EXPENSE";
  amount: number;
  employee: string;
  description?: string;
  paymentMethods: { method: string; amount: number }[]; // 👈 Agregado para permitir paymentMethods
}) => {
  const payload = {
    cashRegisterId: data.cashRegisterId,
    userId: data.userId,
    type: data.type,
    amount: data.amount,
    description: data.description || "",
    employee: data.employee,
    paymentMethods: data.paymentMethods.map(pm => ({
      method: pm.method,
      amount: Number(pm.amount),  // 👈 FORZAMOS QUE amount sea un número real
    })),
  };

  console.log('Payload final enviado a backend:', payload); // 👈

  const response = await fetch(`${BACKEND_URL}/api/cashregister/transaction`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text(); // Leer el error real
    console.error("Error Body:", text);
    throw new Error("Error al registrar la transacción");
  }

  return await response.json();
};

export async function getActiveCashRegister(storeId: number): Promise<{ id: number; name: string; currentBalance: number; initialBalance: number; } | null> {
  const token = localStorage.getItem('token'); // Obtén el token del localStorage

  if (!token) {
    throw new Error('No se encontró un token de autenticación');
  }

  try {
    const response = await fetch(`${BACKEND_URL}/api/cashregister/active/${storeId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error('No se pudo obtener la caja activa.');
    }

    const data = await response.json();

    // Si el backend responde null no existe caja activa
    if (data === null) {
      return null;
    }

    console.log('Response de la caja activa:', data);
    return data;
  } catch (error) {
    console.error('Error al obtener la caja activa:', error);
    throw new Error('Error al obtener la caja activa. Por favor, intente nuevamente.');
  }
}

// cashregister.api.ts
export async function createCashClosure(payload: any) {
  const cleanPayload = {
    ...payload,
    cashRegisterId: Number(payload.cashRegisterId),
    userId: Number(payload.userId),
    openingBalance: Number(payload.openingBalance),
    closingBalance: Number(payload.closingBalance),
    totalIncome: Number(payload.totalIncome),
    totalExpense: Number(payload.totalExpense),
  };

  const response = await fetch(`${BACKEND_URL}/api/cashregister/closure`, {
    method: "POST",
    body: JSON.stringify(cleanPayload),
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null); // intenta parsear JSON
  
    const errorMessage = errorBody?.message || "Error desconocido al cerrar la caja";
  
    console.error("❌ Error en createCashClosure:", errorMessage);
    throw new Error(errorMessage);
  }

  return await response.json();
}

export async function getClosuresByStore(storeId: number) {
  const response = await fetch(`${BACKEND_URL}/api/cashregister/closures/${storeId}`);
  if (!response.ok) throw new Error('Error al obtener los cierres de caja');
  return await response.json();
}

export async function getTransactionsByDate(storeId: number, date: string) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/cashregister/get-transactions/${storeId}/${date}`);
    if (!res.ok) {
      throw new Error("Error obteniendo transacciones por fecha");
    }
    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Error en getTransactionsByDate:", error);
    throw error;
  }
}

export async function getClosureByDate(storeId: number, date: string) {
  const response = await fetch(`${BACKEND_URL}/api/cashregister/closure/${storeId}/by-date/${date}`);
  if (!response.ok) return null;
  return await response.json();
}

export const createCashRegister = async (payload: any) => {
  const { data } = await axios.post(`${BACKEND_URL}/api/cashregister`, payload);
  return data;
};

export const getTransactions = async (cashRegisterId: number) => {
  const { data } = await axios.get(`${BACKEND_URL}/api/cashregister/transaction/cashregister/${cashRegisterId}`);
  return data;
};

export const getAllCashRegisters = () =>
    axios.get(`${BACKEND_URL}/api/cashregister`).then((res) => res.data);
  
