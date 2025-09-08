"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

export type SummaryCardProps = {
  currency: string;
  setCurrency: (c: string) => void;
  subtotal: number;
  shipping: number;
  total: number;
  handleCreateOrder: () => void;
  userId: number | null;
  itemsLength: number;
  email: string;
};

export const SummaryCard = React.memo(function SummaryCard({
  currency, setCurrency, subtotal, shipping, total, handleCreateOrder, userId, itemsLength, email,
}: SummaryCardProps) {
  return (
    <Card className="border-blue-200 dark:border-blue-700 shadow-sm sticky top-8">
      <CardHeader className="px-4 pt-4 pb-2 items-center">
        <CardTitle className="text-center">Resumen</CardTitle>
        <Separator className="mx-auto mt-1 w-16 bg-blue-200 dark:bg-blue-700" />
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        <div className="flex items-center justify-between">
          <span>Moneda</span>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
            <SelectContent side="bottom" align="start">
              <SelectItem value="PEN">PEN</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between">
          <span>Subtotal</span>
          <span>S/. {subtotal.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Envío</span>
          <span>S/. {shipping.toFixed(2)}</span>
        </div>
        <Separator />
        <div className="flex items-center justify-between text-lg font-semibold">
          <span>Total</span>
          <span>S/. {total.toFixed(2)}</span>
        </div>
        <Button
          className="w-full bg-blue-900 hover:bg-blue-800 text-white"
          type="button"
          onClick={handleCreateOrder}
          disabled={!userId || itemsLength === 0 || !email}
        >
          Crear orden y continuar
        </Button>
        <p className="text-xs text-muted-foreground">
          Se generará un enlace para compartir con el cliente a fin de completar el pago.
        </p>
      </CardContent>
    </Card>
  );
});

export default SummaryCard;
