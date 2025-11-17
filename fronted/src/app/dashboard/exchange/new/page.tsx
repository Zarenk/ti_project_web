"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { useTenantSelection } from "@/context/tenant-selection-context";

import {
  createTipoCambio,
  getLatestExchangeRateByCurrency,
} from "../exchange.api";

const CURRENCY_OPTIONS = [
  { value: "USD", label: "USD" },
  { value: "EUR", label: "EUR" },
] as const;

const DEFAULT_CURRENCY = "USD";

export default function TipoCambioForm(): React.ReactElement {
  const router = useRouter();
  const { version } = useTenantSelection();

  const [fecha, setFecha] = useState<Date>(new Date());
  const [moneda, setMoneda] = useState<typeof CURRENCY_OPTIONS[number]["value"]>(
    DEFAULT_CURRENCY,
  );
  const [valor, setValor] = useState<string>("");
  const [loadingRate, setLoadingRate] = useState(false);
  const [rateError, setRateError] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setFecha(new Date());
    setValor("");
    setRateError(null);
  }, []);

  useEffect(() => {
    resetForm();
  }, [version, resetForm]);

  const fetchLatestRate = useCallback(
    async (currency: string) => {
      setLoadingRate(true);
      setRateError(null);

      try {
        const latest = await getLatestExchangeRateByCurrency(currency);
        if (latest !== null) {
          setValor(latest.toFixed(4));
        } else {
          setValor("");
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "No se pudo obtener el tipo de cambio mas reciente.";
        setRateError(message);
        setValor("");
      } finally {
        setLoadingRate(false);
      }
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      await fetchLatestRate(moneda);
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [moneda, version, fetchLatestRate]);

  const formattedDate = useMemo(
    () => (fecha ? format(fecha, "yyyy-MM-dd") : ""),
    [fecha],
  );

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    if (!fecha) return;

    const parsed = Number.parseFloat(valor);
    if (!Number.isFinite(parsed)) {
      toast.error("Ingresa un valor numerico valido.");
      return;
    }

    try {
      await createTipoCambio({
        fecha: formattedDate,
        moneda,
        valor: parsed,
      });
      toast.success("Tipo de cambio registrado correctamente.");
      router.push("/dashboard/exchange");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error al registrar el tipo de cambio.";
      toast.error(message);
    }
  };

  const isSubmittingDisabled = loadingRate;

  return (
    <Card className="mx-auto mt-10 max-w-md shadow-xl">
      <CardContent className="p-6">
        <h2 className="mb-6 text-xl font-bold">Registrar Tipo de Cambio</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Fecha:</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  {formattedDate || <span>Selecciona una fecha</span>}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={fecha} onSelect={(value) => value && setFecha(value)} />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Moneda:</Label>
            <select
              value={moneda}
              onChange={(event) =>
                setMoneda(event.target.value as typeof CURRENCY_OPTIONS[number]["value"])
              }
              className="w-full rounded border bg-background p-2"
              disabled={loadingRate}
            >
              {CURRENCY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {loadingRate ? (
              <Skeleton className="h-6 w-32" />
            ) : rateError ? (
              <p className="text-sm text-destructive">{rateError}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>Valor en Soles:</Label>
            <Input
              type="number"
              step="0.0001"
              value={valor}
              onChange={(event) => setValor(event.target.value)}
              required
              disabled={loadingRate}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmittingDisabled}>
            {loadingRate ? "Cargando..." : "Registrar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
