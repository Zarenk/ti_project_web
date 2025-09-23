"use client";

import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { toast } from "sonner";
import { completeWebOrder, rejectWebOrder, sendInvoiceToSunat } from "../sales/sales.api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { InvoiceDocument } from "../sales/components/pdf/InvoiceDocument";
import { numeroALetrasCustom } from "../sales/components/utils/numeros-a-letras";
import { pdf } from "@react-pdf/renderer";
import QRCode from "qrcode";
import { uploadPdfToServer } from "@/lib/utils";

export type Order = {
  id: number;
  code: string;
  createdAt: string;
  client: string;
  total: number;
  status: string;
  origin?: string;
  shippingMethod?: string;
  carrierName?: string;
  carrierId?: string;
  carrierMode?: string;
};

export function getColumns(
  onStatusUpdate?: (id: number, status: string) => void
): ColumnDef<Order>[] {
  return [
  {
    accessorKey: "code",
    header: "Orden",
  },
  {
    accessorKey: "client",
    header: "Cliente",
  },
  {
    accessorKey: "origin",
    header: "Origen",
    cell: ({ row }) => row.original.origin ?? 'WEB POS',
  },
  {
    accessorKey: "createdAt",
    header: "Fecha",
    cell: ({ row }) => format(new Date(row.original.createdAt), "dd/MM/yyyy"),
  },
  {
    accessorKey: "total",
    header: "Total",
    cell: ({ row }) => `S/. ${row.original.total.toFixed(2)}`,
  },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => {
      switch (row.original.status) {
        case "PENDING":
          return "Pendiente";
        case "COMPLETED":
          return "Completado";
        case "DENIED":
          return "Denegado";
        default:
          return row.original.status;
      }
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const [openComplete, setOpenComplete] = useState(false);
      const [openReject, setOpenReject] = useState(false);

      return (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" asChild>
            <Link href={`/dashboard/orders/${row.original.id}`} prefetch={false}>Ver</Link>
          </Button>
          {row.original.status === "PENDING" && (
            <>
              <Button size="sm" onClick={() => setOpenComplete(true)}>
                Completar
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setOpenReject(true)}
              >
                Rechazar
              </Button>

              <AlertDialog open={openComplete} onOpenChange={setOpenComplete}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      ¿Deseas completar esta orden?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Confirma que el cliente realizó el depósito o envió la
                      información de pago necesaria.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                onClick={async () => {
                  try {
                        const shippingMethodValue = row.original.shippingMethod ?? '';
                        const normalizedShipping = shippingMethodValue
                          ? shippingMethodValue
                              .normalize('NFD')
                              .replace(/[\u0300-\u036f]/g, '')
                              .trim()
                              .toUpperCase()
                          : '';
                        const requiresCarrier =
                          normalizedShipping === 'DELIVERY' ||
                          normalizedShipping === 'ENVIO A DOMICILIO';

                        if (
                          requiresCarrier &&
                          (!row.original.carrierName || !row.original.carrierMode)
                        ) {
                          toast.error(
                            'Completa los datos de transporte desde el detalle de la orden antes de confirmar.',
                          );
                          return;
                        }

                        const createdSale = await completeWebOrder(row.original.id, {
                          carrierId: row.original.carrierId,
                          carrierName: row.original.carrierName,
                          carrierMode: row.original.carrierMode,
                          shippingMethod: row.original.shippingMethod,
                        });
                        toast.success("Orden completada");
                        if (onStatusUpdate) {
                          onStatusUpdate(row.original.id, "COMPLETED");
                          }
                          const invoice =
                            createdSale && Array.isArray(createdSale.invoices) && createdSale.invoices.length > 0
                              ? createdSale.invoices[0]
                              : null;

                          if (invoice) {
                          const isFactura = invoice.tipoComprobante === "FACTURA";
                          const cliente = isFactura
                            ? {
                                tipoDocumento: createdSale.client?.type ?? "",
                                ruc: createdSale.client?.typeNumber ?? "",
                                razonSocial:
                                  createdSale.client?.razonSocial ||
                                  createdSale.client?.name ||
                                  "",
                              }
                            : {
                                tipoDocumento: createdSale.client?.type ?? "",
                                dni: createdSale.client?.typeNumber ?? "",
                                nombre: createdSale.client?.name ?? "",
                              };
                          const invoicePayload = {
                            saleId: createdSale.id,
                            serie: invoice.serie,
                            correlativo: invoice.nroCorrelativo,
                            documentType: isFactura ? "invoice" : "boleta",
                            tipoMoneda: invoice.tipoMoneda ?? "PEN",
                            total: invoice.total ?? createdSale.total,
                            fechaEmision: invoice.fechaEmision,
                            cliente,
                            emisor: {
                              razonSocial: createdSale.store?.name ?? "",
                              adress: createdSale.store?.adress ?? "",
                              ruc: 20519857538,
                            },
                            items: createdSale.salesDetails.map((d: any) => ({
                                cantidad: d.quantity,
                                descripcion: d.entryDetail.product.name,
                                series: d.series ?? [],
                                precioUnitario: Number(d.price),
                                subtotal: Number((d.price * d.quantity) / 1.18),
                                igv: Number(d.price * d.quantity - (d.price * d.quantity) / 1.18),
                                total: Number(d.price * d.quantity),
                              })),
                          } as any;

                            const sunatResp = await sendInvoiceToSunat(invoicePayload);
                            const totalTexto = numeroALetrasCustom(invoicePayload.total, invoicePayload.tipoMoneda);
                            const qrData = `Representación impresa de la ${invoicePayload.documentType.toUpperCase()} ELECTRÓNICA\nN° ${invoicePayload.serie}-${invoicePayload.correlativo}`;
                            const qrCode = await QRCode.toDataURL(qrData);
                            const blob = await pdf(
                              <InvoiceDocument
                                data={invoicePayload}
                                qrCode={qrCode}
                                importeEnLetras={totalTexto}
                              />
                            ).toBlob();
                            await uploadPdfToServer({
                              blob,
                              ruc: 20519857538,
                              tipoComprobante: invoicePayload.documentType,
                              serie: invoicePayload.serie,
                              correlativo: invoicePayload.correlativo,
                            });

                            if (
                              sunatResp.message &&
                              sunatResp.message.toLowerCase().includes("exitosamente")
                            ) {
                              toast.success("Factura enviada a la SUNAT correctamente.");
                            } else if (sunatResp.message) {
                              toast.error(`Error al enviar la factura a la SUNAT: ${sunatResp.message}`);
                            } else {
                              toast.error("Error desconocido al enviar la factura a la SUNAT.");
                            }
                          }
                        } catch {
                          toast.error("Error al completar la orden");
                        } finally {
                          setOpenComplete(false);
                        }
                      }}
                    >
                      Confirmar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog open={openReject} onOpenChange={setOpenReject}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Rechazar esta orden?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Marca la orden como denegada por falta de información.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={async () => {
                        try {
                          await rejectWebOrder(row.original.id);
                          toast.success("Orden rechazada");
                          if (onStatusUpdate) {
                            onStatusUpdate(row.original.id, "DENIED");
                          }
                        } catch {
                          toast.error("Error al rechazar la orden");
                        } finally {
                          setOpenReject(false);
                        }
                      }}
                    >
                      Confirmar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      );
    },
  },
];
}
