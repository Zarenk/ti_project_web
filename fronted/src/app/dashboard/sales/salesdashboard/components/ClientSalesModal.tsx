"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export function ClientSalesModal({ client, open, onClose }: { client: any; open: boolean; onClose: () => void }) {
  if (!client) return null;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ventas de {client.clientName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          {client.sales.map((sale: any) => (
            <div key={sale.id} className="border p-2 rounded">
              <p>
                <strong>Venta #{sale.id}</strong> - {new Date(sale.createdAt).toLocaleString("es-PE")}
              </p>
              {sale.invoice && (
                <p className="text-muted-foreground">
                  {sale.invoice.tipoComprobante} {sale.invoice.serie}-{sale.invoice.nroCorrelativo}
                </p>
              )}
              <p className="font-medium">Total: S/ {sale.total.toFixed(2)}</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {sale.products.map((p: any, i: number) => (
                  <Badge key={i} variant="secondary" className="text-xs font-normal">
                    {p.name} × {p.quantity}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}