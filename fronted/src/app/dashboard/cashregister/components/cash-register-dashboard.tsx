"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Transaction } from "../types/cash-register"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import CashTransferForm from "./cash-transfer-form"
import CashClosureForm from "./cash-closure-form"
import TransactionHistory from "./transaction-history"
import { createCashRegister, getActiveCashRegister, getCashRegisterBalance, getClosureByDate, getClosuresByStore, getTodayTransactions, getTransactionsByDate } from "../cashregister.api"
import { getStores } from "../../stores/stores.api"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getUserDataFromToken, isTokenValid } from "@/lib/auth"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Plus } from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { format, isSameDay } from "date-fns"; // ya lo tienes en tus imports

export default function CashRegisterDashboard() {

  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [userId, setUserId] = useState<number | null>(null);

  // Validar sesión
  useEffect(() => {
    async function check() {
      const userData = await getUserDataFromToken();
      if (!userData || !(await isTokenValid())) {
        router.replace("/login");
      } else {
        setUserId(userData.userId);
      }
      setCheckingSession(false);
    }
    check();
  }, [router]);

  // -------------------- HOOKS PRINCIPALES --------------------
  const [balance, setBalance] = useState(0)
  const [initialBalance, setInitialBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [storeId, setStoreId] = useState<number | null>(null); // Estado para la tienda seleccionada
  const [stores, setStores] = useState<{ id: number; name: string }[]>([]); // Lista de tiendas
  const [hasCashRegister, setHasCashRegister] = useState(true); // 👈 Estado nuevo
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [activeCashRegisterId, setActiveCashRegisterId] = useState<number | null>(null);
  const [closures, setClosures] = useState<any[]>([]);
  const [showOpenCashDialog, setShowOpenCashDialog] = useState(false);
  const [initialAmountToOpen, setInitialAmountToOpen] = useState<number>(0);
  const [selectedDate, setSelectedDate] = useState(() => new Date())

  // -------------------- FUNCIONES --------------------
  // Nueva función para recargar balance y transacciones
  const refreshCashData = async () => {
    if (storeId === null) return;

    try {
      const [newBalance, newTransactions] = await Promise.all([
        getCashRegisterBalance(storeId),
        getTodayTransactions(storeId)
      ]);

      setBalance(Number(newBalance));
      const validTransactions = newTransactions.map((transaction: any) => ({
        id: transaction.id,
        type: transaction.type, // ⚡ deja el original
        internalType: transaction.type, // ⚡ crea uno nuevo para cálculos
        amount: Number(transaction.amount) || 0,
        timestamp: transaction.createdAt || new Date().toISOString(),
        employee: transaction.employee || "",
        description: transaction.description || "",
        paymentMethods: transaction.paymentMethods || [],
      }));

      const income = validTransactions
      .filter((t:any) => t.internalType === "INCOME")
      .reduce((sum:any, t:any) => sum + t.amount, 0);

      const expense = validTransactions
        .filter((t:any) => t.internalType === "EXPENSE")
        .reduce((sum:any, t:any) => sum + t.amount, 0);

      setTransactions(validTransactions);
      setTotalIncome(income);
      setTotalExpense(expense);

      console.log("✅ Recalculado totalIncome:", income);
      console.log("✅ Recalculado totalExpense:", expense);

    } catch (error) {
      console.error("Error actualizando datos de caja:", error);
    }
  };

  const reinitializeCashRegister = async (): Promise<string | null> => {
    if (!storeId) return null;
  
    try {
      const res = await getActiveCashRegister(storeId);
      const userData = await getUserDataFromToken();
  
      setActiveCashRegisterId(res.id);
      setBalance(Number(res.currentBalance));
      setInitialBalance(Number(res.initialBalance));
      setHasCashRegister(true);
  
      return userData?.name ?? null; // 👈 garantizamos que es string o null
    } catch (error) {
      console.error("Error al reiniciar caja:", error);
      setActiveCashRegisterId(null);
      setBalance(0);
      setInitialBalance(0);
      setHasCashRegister(false);
      return null;
    }
  };

  const handleRequestOpenCashRegister = () => {
    if (!storeId || closures.length === 0) return;
  
    const lastClosureAmount = Number(closures[0].closingBalance || 0);
    setInitialAmountToOpen(lastClosureAmount); // pre-fill
    setShowOpenCashDialog(true); // abre el diálogo
  };

  const isToday = isSameDay(selectedDate, new Date());

  const [dailyClosureInfo, setDailyClosureInfo] = useState<{
    openingBalance: number;
    closingBalance: number;
  } | null>(null);

   // -------------------- USE EFFECTS --------------------

  useEffect(() => {
    async function fetchStores() {
      try {
        const data = await getStores();
        const sortedStores = data.sort((a: { name: string }, b: { name: string }) =>
          a.name.localeCompare(b.name)
        );
        setStores(sortedStores);
    
        if (sortedStores.length > 0) {
          setStoreId(sortedStores[0].id);
        }
      } catch (error) {
        console.error("Error al obtener las tiendas:", error);
      }
    }
  
    fetchStores();
  }, []);

  // Obtener el balance de la caja activa al cambiar la tienda seleccionada
  useEffect(() => {
    if (storeId !== null) {

      getActiveCashRegister(storeId)
      .then((res) => {
        setActiveCashRegisterId(res.id);
        setBalance(Number(res.currentBalance));
        setInitialBalance(Number(res.initialBalance)); // ✅ Aquí lo guardas
        setHasCashRegister(true);
      })
      .catch(() => {
        setActiveCashRegisterId(null);
        setBalance(0);
        setInitialBalance(0); // ✅ También lo limpias si no hay caja
        setHasCashRegister(false);
      });

      getClosuresByStore(storeId)
      .then(setClosures)
      .catch((err) => {
        console.error("Error al obtener cierres:", err);
        setClosures([]);
      });
      
      async function fetchBalance(storeId: number) {
        try {
          const currentBalance = await getCashRegisterBalance(storeId);
          if (currentBalance === null) {
            setBalance(0);
            setHasCashRegister(false); // Marcar que no hay caja
          } else {
            setBalance(Number(currentBalance));
            setHasCashRegister(true);  // Hay caja
          }
        } catch (error) {
          console.error("Error real al obtener el balance:", error);
          setBalance(0);
          setHasCashRegister(false);
        }
      }

      fetchBalance(storeId);
    }
  }, [storeId]);

  useEffect(() => {
    if (storeId !== null && selectedDate !== null) {
      async function fetchTransactionsForSelectedDate() {
        try {
          
          const isoDate = selectedDate.toISOString().split("T")[0];
          getClosuresByStore(storeId!) // ✅ ahora TS sabe que storeId es un number
            .then((closures) => {
              const closureOfDay = closures.find((c: any) =>
                new Date(c.createdAt).toISOString().startsWith(isoDate)
              );

              if (closureOfDay) {
                setDailyClosureInfo({
                  openingBalance: Number(closureOfDay.openingBalance),
                  closingBalance: Number(closureOfDay.closingBalance),
                });
              } else {
                setDailyClosureInfo(null);
              }
            })
            .catch(() => setDailyClosureInfo(null));

          const transactionsFromServer = await getTransactionsByDate(storeId!, isoDate);

          if (!Array.isArray(transactionsFromServer)) {
            console.error("❌ No es un array:", transactionsFromServer);
            return setTransactions([]);
          }

          const validTransactions = transactionsFromServer.map((transaction: any) => ({
            id: transaction.id,
            type: transaction.type,
            internalType: transaction.type,
            amount: Number(transaction.amount) || 0,
            timestamp: new Date(transaction.createdAt),
            employee: transaction.employee || "",
            description: transaction.description || "",
            paymentMethods: transaction.paymentMethods || [],
            createdAt: new Date(transaction.createdAt),
            userId: transaction.userId,
            cashRegisterId: transaction.cashRegisterId,
          }));
  
          setTransactions(validTransactions);
        } catch (error) {
          console.error("Error al obtener transacciones por fecha:", error);
          setTransactions([]);
        }
      }
  
      fetchTransactionsForSelectedDate();
    }
  }, [storeId, selectedDate]);

  useEffect(() => {
    // Solo considera transacciones válidas (evita CLOSURE)
    const financialTransactions = transactions.filter(
      (t) => t.internalType === "INCOME" || t.internalType === "EXPENSE"
    );
  
    const income = financialTransactions
      .filter((t) => t.internalType === "INCOME")
      .reduce((sum, t) => sum + t.amount, 0);
  
    const expense = financialTransactions
      .filter((t) => t.internalType === "EXPENSE")
      .reduce((sum, t) => sum + t.amount, 0);
  
    setTotalIncome(income);
    setTotalExpense(expense);
  
    console.log("✅ Ingresos calculados:", income);
    console.log("✅ Egresos calculados:", expense);
  }, [transactions]);

  useEffect(() => {
    if (storeId !== null) {
      getActiveCashRegister(storeId)
        .then((res) => setActiveCashRegisterId(res.id))
        .catch(() => setActiveCashRegisterId(null));
    }
  }, [storeId]);

  // Calcula el openingBalance
  const openingBalance = transactions.length > 0 ? transactions[0].amount : 0;

  const financialTransactions = transactions.filter(
    (t) => t.internalType === "INCOME" || t.internalType === "EXPENSE"
  );

  // Mostrar loader mientras se revisa sesión
  if (checkingSession) {
    return <div className="p-8 text-center">Verificando sesión...</div>;
  }

  // -------------------- UI --------------------

  return (
    <div className="grid gap-6">

      {/* Selector de tienda */}
      <div>
        <label htmlFor="store-select" className="block text-sm font-medium mb-1">
          Seleccionar Tienda
        </label>
        <Select
          value={storeId !== null ? String(storeId) : ""}
          onValueChange={(value) => setStoreId(Number(value))}
        >
          <SelectTrigger id="store-select" className="w-full">
            <SelectValue placeholder="Seleccione una tienda" />
          </SelectTrigger>
          <SelectContent>
            {stores.map((store) => (
              <SelectItem key={store.id} value={String(store.id)}>
                {store.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!hasCashRegister && storeId && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">Caja Cerrada</CardTitle>
              <CardDescription>No hay una caja activa para esta tienda.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleRequestOpenCashRegister} 
                size="sm" 
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Abrir Nueva Caja
              </Button>
            </CardContent>
          </Card>
        )}

        <AlertDialog open={showOpenCashDialog} onOpenChange={setShowOpenCashDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Abrir nueva caja</AlertDialogTitle>
              <AlertDialogDescription>
                El saldo inicial sugerido es el del último cierre: 
                <strong className="text-green-600"> S/. {initialAmountToOpen.toFixed(2)}</strong>.
                Puedes modificarlo si es necesario.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="mt-4">
              <label className="block text-sm font-medium mb-1">Saldo Inicial</label>
              <Input
                type="number"
                value={initialAmountToOpen}
                onChange={(e) => setInitialAmountToOpen(Number(e.target.value))}
                step="0.01"
                min="0"
              />
            </div>
            <AlertDialogFooter className="mt-4">
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  try {
                    const newName = `Caja Principal - Tienda ${storeId} - ${Date.now()}`;
                    await createCashRegister({
                      storeId,
                      initialBalance: initialAmountToOpen,
                      name: newName,
                    });
                    toast.success("Caja creada exitosamente");
                    await refreshCashData();
                  } catch (error: any) {
                    console.error("Error al abrir nueva caja:", error);
                    toast.error("No se pudo crear la caja.");
                  } finally {
                    setShowOpenCashDialog(false);
                  }
                }}
              >
                Confirmar Apertura
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>
              {isSameDay(selectedDate, new Date()) ? "Saldo Actual" : `Saldo del ${format(selectedDate, "dd/MM/yyyy")}`}
            </CardTitle>
            <CardDescription>
              Dinero disponible en caja {isSameDay(selectedDate, new Date()) ? "hoy" : "según último cierre de ese día"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {isSameDay(selectedDate, new Date()) && hasCashRegister && !isNaN(Number(balance)) ? (
                `S/.${Number(balance).toFixed(2)}`
              ) : dailyClosureInfo ? (
                `S/.${Number(dailyClosureInfo.closingBalance).toFixed(2)}`
              ) : (
                "Sin cierre ese día"
              )}
            </div>
            {dailyClosureInfo && (
              <div className="text-sm text-muted-foreground mt-1">
                Saldo inicial: S/. {Number(dailyClosureInfo.openingBalance).toFixed(2)}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
          <CardTitle>
            {isToday
              ? "Transacciones del día de hoy"
              : `Transacciones del día ${selectedDate.toLocaleDateString("es-PE", {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}`}
          </CardTitle>
            <CardDescription>Numero de movimientos en caja</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {financialTransactions.length > 0 ? financialTransactions.length : '0'} {/* Mostrar el número total de transacciones */}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Último Cierre</CardTitle>
            <CardDescription>Historial de cierres de caja</CardDescription>
          </CardHeader>
          <CardContent>
            {closures.length > 0 ? (
              <>
                <div className="text-lg font-semibold">
                  {new Date(closures[0].createdAt).toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Monto de cierre:{" "}
                  <span className="font-medium">
                    S/. {Number(closures[0]?.closingBalance ?? 0).toFixed(2)}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Total de cierres: {closures.length}
                </div>
              </>
            ) : (
              <div className="text-muted-foreground">
                No hay cierres registrados
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="transfer" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="transfer">
            <span className="block sm:hidden">Transferencias</span>
            <span className="hidden sm:block">Transferencia de Dinero</span>
          </TabsTrigger>
          <TabsTrigger value="closure">
            <span className="block sm:hidden">Cierres</span>
            <span className="hidden sm:block">Cierre de Efectivo</span>
          </TabsTrigger>
          <TabsTrigger value="history">
            <span className="block sm:hidden">Historial</span>
            <span className="hidden sm:block">Historial de Transacciones</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="transfer">
          <Card>
            <CardHeader>
              <CardTitle>Transferencia de Dinero</CardTitle>
              <CardDescription>Registrar depositos y retiros de la caja registradora</CardDescription>
            </CardHeader>
            <CardContent>
            {storeId !== null && userId !== null && activeCashRegisterId !== null && (
              <CashTransferForm
                onTransfer={() => {}} // opcional si ya no lo necesitas
                currentBalance={balance}
                storeId={storeId}
                refreshData={refreshCashData} // 👈 nuevo
              />
            )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="closure">
          <Card>
            <CardHeader>
              <CardTitle>Cierre de Efectivo</CardTitle>
              <CardDescription>
              Registrar depósitos y retiros de la caja registradora</CardDescription>
            </CardHeader>
            <CardContent>
            {storeId !== null && userId !== null && activeCashRegisterId !== null && (
              <CashClosureForm
                storeId={storeId!}
                cashRegisterId={activeCashRegisterId} // 👈 id de la tienda/caja (nunca será null porque ya haces validación arriba)
                userId={userId} // 👈 tienes que obtener el userId del localStorage o sesión
                currentBalance={balance}
                openingBalance={openingBalance} // 👈 tienes que calcularlo
                totalIncome={totalIncome} // 👈 tienes que calcularlo
                totalExpense={totalExpense} // 👈 tienes que calcularlo
                onClosureCompleted={refreshCashData}
                reinitializeCashRegister={reinitializeCashRegister}
              />
            )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Transacciones</CardTitle>
              <CardDescription>Ver todas las transacciones de la caja registradora</CardDescription>
            </CardHeader>
            <CardContent>
              <TransactionHistory 
                transactions={transactions} 
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>

    
  )
}
