"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createSalesColumns, Sale } from "./columns";
import { DataTable } from "./data-table";
import { getSales } from "./sales.api";
import { SaleDetailDialog } from "./components/sale-detail-dialog";

export const dynamic = "force-dynamic"; // PARA HACER LA PAGINA DINAMICA

export default function Page() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getSales();
        const mapped: Sale[] = data
          .map((sale: any) => {
            const details = Array.isArray(sale.salesDetails)
              ? sale.salesDetails.map((detail: any) => {
                  const productFromEntry = detail.entryDetail?.product;
                  const productFromInventory = detail.storeOnInventory?.inventory?.product;
                  const product = productFromEntry || productFromInventory || detail.product || null;

                  const resolvedName =
                    detail.productName ??
                    detail.product_name ??
                    product?.name ??
                    product?.productName ??
                    product?.nombre ??
                    undefined;

                  const resolvedSku =
                    detail.productSku ??
                    detail.product_sku ??
                    product?.sku ??
                    product?.code ??
                    product?.codigo ??
                    undefined;

                  const seriesList = Array.isArray(detail.series)
                    ? detail.series
                    : Array.isArray(detail.soldSeries)
                    ? detail.soldSeries.map((item: any) =>
                        typeof item === "string"
                          ? item
                          : item?.number ?? item?.serie ?? item?.code ?? null,
                      )
                    : [];

                  return {
                    id: detail.id,
                    quantity: detail.quantity,
                    price: typeof detail.price === "number" ? detail.price : Number(detail.price ?? 0),
                    subtotal:
                      typeof detail.subtotal === "number"
                        ? detail.subtotal
                        : detail.subtotal !== undefined
                        ? Number(detail.subtotal)
                        : undefined,
                    total:
                      typeof detail.total === "number"
                        ? detail.total
                        : detail.total !== undefined
                        ? Number(detail.total)
                        : undefined,
                    product: product
                      ? {
                          name: product.name ?? product.productName ?? product.nombre,
                          sku: product.sku ?? product.code ?? product.codigo,
                        }
                      : null,
                    productName: resolvedName,
                    product_name: resolvedName,
                    productSku: resolvedSku,
                    product_sku: resolvedSku,
                    series: seriesList.filter((value: string | null | undefined) => Boolean(value)) as (
                      | string
                      | { number?: string }
                    )[],
                  };
                })
              : sale.details ?? [];

            const payments = Array.isArray(sale.payments)
              ? sale.payments.map((payment: any) => ({
                  id: payment.id,
                  amount:
                    typeof payment.amount === "number"
                      ? payment.amount
                      : payment.amount !== undefined
                      ? Number(payment.amount)
                      : undefined,
                  currency: payment.currency ?? sale.tipoMoneda ?? undefined,
                  paymentMethod: payment.paymentMethod ??
                    (payment.method ? { name: payment.method } : null),
                }))
              : [];

            const normalizedSale: Sale = {
              id: sale.id,
              user: { username: sale.user?.username ?? sale.user?.name ?? "—" },
              store: { name: sale.store?.name ?? sale.storeName ?? "—" },
              client: { name: sale.client?.name ?? sale.clientName ?? "—" },
              total:
                typeof sale.total === "number"
                  ? sale.total
                  : Number.isFinite(Number(sale.total))
                  ? Number(sale.total)
                  : 0,
              description: sale.description ?? sale.descripcion ?? undefined,
              createdAt: sale.createdAt ?? sale.created_at ?? new Date().toISOString(),
              tipoComprobante: sale.tipoComprobante ?? sale.tipo_comprobante ?? undefined,
              tipoMoneda: sale.tipoMoneda ?? sale.tipo_moneda ?? undefined,
              payments,
              details,
            };

            return normalizedSale;
          })
          .sort(
            (a: any, b: any) =>
              new Date(b.createdAt).getTime() -
              new Date(a.createdAt).getTime()
          );
        setSales(mapped);
      } catch (error) {
        console.error("Error al obtener las ventas:", error);
      }
    };
    fetchData();
  }, []);

  const handleDeleted = useCallback((id: number) => {
    setSales((prev) => prev.filter((sale) => sale.id !== id));
  }, []);

   const handleViewDetail = useCallback((sale: Sale) => {
    setSelectedSale(sale);
    setIsDetailOpen(true);
  }, []);

  const handleDetailVisibility = useCallback((open: boolean) => {
    setIsDetailOpen(open);
    if (!open) {
      setSelectedSale(null);
    }
  }, []);

  const columns = useMemo(
    () => createSalesColumns(handleDeleted, handleViewDetail),
    [handleDeleted, handleViewDetail],
  );

  return (
    <>
      <section className="py-2 sm:py-6">
        <div className="container mx-auto px-1 sm:px-6 lg:px-8">
          <h1 className="px-5 text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 sm:mb-6">
            Historial de Ventas
          </h1>
          <div className="overflow-x-auto">
            <DataTable columns={columns} data={sales} onRowClick={handleViewDetail} />
          </div>
        </div>
      </section>

      <SaleDetailDialog
        sale={selectedSale}
        open={isDetailOpen}
        onOpenChange={handleDetailVisibility}
      />
    </>
  );
}