"use client";

import { useEffect, useMemo, useState } from "react";
import { DateRange } from "react-day-picker";
import { endOfDay, format, parseISO, subDays } from "date-fns";
import { es } from "date-fns/locale";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertCircle,
  ArrowUpRight,
  PackageSearch,
  ShoppingCart,
  Store,
  TrendingUp,
  Users,
} from "lucide-react";

import { DatePickerWithRange } from "../salesdashboard/date-range-picker";
import ProductCombobox from "@/components/sales/ProductCombobox";
import { getProductSalesReport } from "../sales.api";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type ProductOption = {
  id: number;
  name: string;
  price: number;
  stock?: number | null;
  categoryName?: string | null;
  searchKey?: string;
};

type ProductSalesReport = {
  product: {
    id: number;
    name: string;
    barcode?: string | null;
    price?: number | null;
    priceSell?: number | null;
  };
  metrics: {
    totalUnitsSold: number;
    totalRevenue: number;
    totalOrders: number;
    averageUnitPrice: number;
    highestPrice: number | null;
    lowestPrice: number | null;
    lastSaleDate: string | null;
    currency: string;
  };
  topSeller: {
    userId: number;
    username: string;
    totalUnits: number;
    totalRevenue: number;
    salesCount: number;
  } | null;
  topClients: Array<{
    clientId: number;
    name: string;
    totalUnits: number;
    totalRevenue: number;
    salesCount: number;
    lastPurchase: string;
  }>;
  stock: {
    total: number;
    byStore: Array<{
      storeId: number;
      storeName: string;
      stock: number;
    }>;
  };
  timeline: Array<{
    date: string;
    quantity: number;
    revenue: number;
  }>;
};

type ProductReportClientProps = {
  products: ProductOption[];
};

const defaultDateRange: DateRange = {
  from: subDays(new Date(), 90),
  to: new Date(),
};

function formatDateLabel(isoDate: string | null) {
  if (!isoDate) return "Sin ventas registradas";
  try {
    return format(new Date(isoDate), "PPP", { locale: es });
  } catch (error) {
    return "Fecha no disponible";
  }
}

function formatLastPurchase(iso: string) {
  try {
    return format(new Date(iso), "PPP", { locale: es });
  } catch (error) {
    return "-";
  }
}

export default function ProductReportClient({ products }: ProductReportClientProps) {
  const [selectedProduct, setSelectedProduct] = useState<{ id: number; name: string; price: number } | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>(defaultDateRange);
  const [report, setReport] = useState<ProductSalesReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

  useEffect(() => {
    if (!selectedProduct?.id || !dateRange?.from || !dateRange?.to) {
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    const from = dateRange.from.toISOString();
    const to = endOfDay(dateRange.to).toISOString();

    getProductSalesReport(selectedProduct.id, { from, to })
      .then((data) => {
        if (!active) return;
        setReport(data as ProductSalesReport);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "No se pudo obtener el reporte");
        setReport(null);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedProduct?.id, dateRange]);

  const chartData = useMemo(() => {
    if (!report?.timeline?.length) return [] as Array<{
      date: string;
      label: string;
      quantity: number;
      revenue: number;
    }>;

    return report.timeline.map((entry) => {
      const parsed = parseISO(`${entry.date}T00:00:00`);
      const label = format(parsed, "dd MMM", { locale: es });
      return {
        date: entry.date,
        label,
        quantity: entry.quantity,
        revenue: entry.revenue,
      };
    });
  }, [report?.timeline]);

  const currency = report?.metrics?.currency ?? "PEN";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reporte de productos</h1>
          <p className="text-muted-foreground">
            Analiza el rendimiento histórico de un producto específico y descubre oportunidades de venta.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros del reporte</CardTitle>
          <CardDescription>Selecciona un producto y un rango de fechas para generar el análisis.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Producto</span>
                {selectedProduct ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedProduct(null);
                      setReport(null);
                      setError(null);
                    }}
                  >
                    Limpiar
                  </Button>
                ) : null}
              </div>
              <ProductCombobox
                products={sortedProducts}
                selectedId={selectedProduct?.id ?? null}
                selectedLabel={selectedProduct?.name ?? ""}
                onPick={(product) => {
                  setSelectedProduct(product);
                  setReport(null);
                  setError(null);
                }}
              />
              {selectedProduct ? (
                <p className="text-xs text-muted-foreground">
                  Precio base registrado: {formatCurrency(selectedProduct.price ?? 0, currency)}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <PackageSearch className="h-3.5 w-3.5" /> Busca un producto para comenzar.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <span className="text-sm font-medium text-muted-foreground">Rango de fechas</span>
              <DatePickerWithRange date={dateRange} setDate={setDateRange} />
              <p className="text-xs text-muted-foreground">
                El análisis incluirá todas las ventas registradas para el producto en el intervalo seleccionado.
              </p>
            </div>
          </div>
          {error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No se pudo generar el reporte</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
      </Card>

      {!selectedProduct ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          <PackageSearch className="h-10 w-10" />
          <div>
            <p className="text-base font-medium text-foreground">Selecciona un producto para ver su rendimiento.</p>
            <p className="text-sm text-muted-foreground">
              Podrás visualizar tendencias, clientes frecuentes y vendedores destacados.
            </p>
          </div>
        </div>
      ) : loading ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          <div className="flex items-center gap-2 text-sm">
            <ArrowUpRight className="h-4 w-4 animate-pulse" /> Generando reporte...
          </div>
        </div>
      ) : report ? (
        <div className="flex flex-col gap-6">
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-sm font-medium">
                  Última venta
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold text-foreground">
                  {formatDateLabel(report.metrics.lastSaleDate)}
                </p>
                <p className="text-xs text-muted-foreground">Fecha de la transacción más reciente registrada.</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-sm font-medium">
                  Unidades vendidas
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold text-foreground">
                  {report.metrics.totalUnitsSold.toLocaleString("es-PE")}
                </p>
                <p className="text-xs text-muted-foreground">Cantidad acumulada en el período seleccionado.</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-sm font-medium">
                  Ingresos generados
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold text-foreground">
                  {formatCurrency(report.metrics.totalRevenue ?? 0, currency)}
                </p>
                <p className="text-xs text-muted-foreground">Ingresos brutos vinculados a este producto.</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-sm font-medium">
                  Precio promedio
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold text-foreground">
                  {formatCurrency(report.metrics.averageUnitPrice ?? 0, currency)}
                </p>
                <p className="text-xs text-muted-foreground">Promedio ponderado según unidades vendidas.</p>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 lg:grid-cols-7">
            <Card className="lg:col-span-4">
              <CardHeader>
                <CardTitle>Comportamiento de ventas</CardTitle>
                <CardDescription>Evolución de ingresos y unidades en el rango seleccionado.</CardDescription>
              </CardHeader>
              <CardContent className="h-[340px]">
                {chartData.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    No hay ventas registradas para las fechas seleccionadas.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} />
                      <YAxis
                        yAxisId="left"
                        orientation="left"
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => formatCurrency(Number(value) || 0, currency)}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `${value}`}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length > 0) {
                            const revenuePoint = payload.find((item) => item.dataKey === "revenue");
                            const quantityPoint = payload.find((item) => item.dataKey === "quantity");

                            return (
                              <div className="rounded-lg border bg-background p-3 text-xs shadow-sm">
                                <p className="font-medium">{revenuePoint?.payload?.date ?? quantityPoint?.payload?.date}</p>
                                <div className="mt-2 space-y-1">
                                  <div className="flex items-center justify-between gap-4">
                                    <span>Ingresos:</span>
                                    <span className="font-semibold">
                                      {formatCurrency(Number(revenuePoint?.value) || 0, currency)}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between gap-4">
                                    <span>Unidades:</span>
                                    <span className="font-semibold">{quantityPoint?.value ?? 0}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area
                        yAxisId="left"
                        type="monotone"
                        dataKey="revenue"
                        stroke="#6366f1"
                        fill="rgba(99,102,241,0.15)"
                        strokeWidth={2}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="quantity"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={{ r: 2 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
            <div className="flex flex-col gap-4 lg:col-span-3">
              <Card>
                <CardHeader>
                  <CardTitle>Vendedor destacado</CardTitle>
                  <CardDescription>Colaborador con mayor aporte a las ventas del producto.</CardDescription>
                </CardHeader>
                <CardContent>
                  {report.topSeller ? (
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">{report.topSeller.username}</span>
                        <Badge variant="secondary">{report.topSeller.salesCount} ventas</Badge>
                      </div>
                      <p className="text-muted-foreground">
                        {report.topSeller.totalUnits.toLocaleString("es-PE")} unidades |{' '}
                        {formatCurrency(report.topSeller.totalRevenue ?? 0, currency)}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Aún no se registran vendedores para este producto.</p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Rango de precios de venta</CardTitle>
                  <CardDescription>Valores observados en las ventas registradas.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Precio más alto</span>
                    <span className="font-semibold">
                      {report.metrics.highestPrice !== null
                        ? formatCurrency(report.metrics.highestPrice, currency)
                        : 'Sin registros'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Precio más bajo</span>
                    <span className="font-semibold">
                      {report.metrics.lowestPrice !== null
                        ? formatCurrency(report.metrics.lowestPrice, currency)
                        : 'Sin registros'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Órdenes analizadas</span>
                    <span className="font-semibold">{report.metrics.totalOrders.toLocaleString("es-PE")}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-7">
            <Card className="lg:col-span-4">
              <CardHeader>
                <CardTitle>Clientes con mayor compra</CardTitle>
                <CardDescription>Ranking según unidades adquiridas.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {report.topClients.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aún no hay clientes asociados a este producto.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead className="text-right">Unidades</TableHead>
                        <TableHead className="text-right">Ingresos</TableHead>
                        <TableHead className="text-right">Compras</TableHead>
                        <TableHead className="text-right">Última compra</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.topClients.slice(0, 8).map((client) => (
                        <TableRow key={client.clientId}>
                          <TableCell className="font-medium">{client.name}</TableCell>
                          <TableCell className="text-right">{client.totalUnits.toLocaleString("es-PE")}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(client.totalRevenue ?? 0, currency)}
                          </TableCell>
                          <TableCell className="text-right">{client.salesCount}</TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground">
                            {formatLastPurchase(client.lastPurchase)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>Stock disponible</CardTitle>
                <CardDescription>Resumen de inventario en tiendas.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-3">
                  <div className="flex items-center gap-2">
                    <Store className="h-4 w-4 text-muted-foreground" />
                    <span>Stock total</span>
                  </div>
                  <span className="font-semibold text-foreground">{report.stock.total.toLocaleString("es-PE")}</span>
                </div>
                {report.stock.byStore.length === 0 ? (
                  <p className="text-muted-foreground">Sin inventario registrado para este producto.</p>
                ) : (
                  <div className="space-y-2">
                    {report.stock.byStore.map((store) => (
                      <div key={store.storeId} className="flex items-center justify-between rounded border p-2">
                        <span>{store.storeName}</span>
                        <span className="font-semibold">{store.stock.toLocaleString("es-PE")}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          <AlertCircle className="h-8 w-8" />
          <div>
            <p className="text-base font-medium text-foreground">No se encontraron resultados</p>
            <p className="text-sm text-muted-foreground">
              Ajusta el rango de fechas o verifica que el producto tenga ventas registradas.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}