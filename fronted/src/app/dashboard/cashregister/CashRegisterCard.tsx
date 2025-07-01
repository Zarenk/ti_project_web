"use client";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils"; // 🔥 Función que convierte números a formato moneda
import { Banknote, Lock } from "lucide-react";

export function CashRegisterCard({
  cashRegister,
  onTransaction,
  onClosure,
}: {
  cashRegister: any;
  onTransaction: (cashRegister: any) => void;
  onClosure: (cashRegister: any) => void;
}) {
  const isClosed = cashRegister.status === "CLOSED";

  return (
    <Card className="flex flex-col justify-between">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {cashRegister.name}
          {isClosed && <Lock className="w-4 h-4 text-gray-400" />}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">Saldo Inicial:</div>
          <div className="text-lg font-bold">{formatCurrency(cashRegister.initialBalance)}</div>

          <div className="text-sm text-muted-foreground mt-2">Saldo Actual:</div>
          <div className="text-lg font-bold">{formatCurrency(cashRegister.currentBalance)}</div>
        </div>
      </CardContent>

      <CardFooter className="flex justify-between mt-4">
        <Button
          variant="outline"
          size="sm"
          disabled={isClosed}
          onClick={() => onTransaction(cashRegister)}
        >
          <Banknote className="w-4 h-4 mr-2" />
          Movimiento
        </Button>

        <Button
          variant="destructive"
          size="sm"
          disabled={isClosed}
          onClick={() => onClosure(cashRegister)}
        >
          Cerrar Caja
        </Button>
      </CardFooter>
    </Card>
  );
}