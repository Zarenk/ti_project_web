import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";


export function SaleDetailModal({ sale, open, onClose }: { sale: any, open: boolean, onClose: () => void }) {
  if (!sale) return null;
  const tipo = sale.invoice?.tipoComprobante?.toLowerCase(); // "factura" o "boleta"
  const ruc = sale.companyRuc ?? sale.company?.sunatRuc ?? sale.company?.ruc ?? "00000000000";
  const archivo = `${ruc}-${tipo === 'boleta' ? '03' : '01'}-${sale.invoice?.serie}-${sale.invoice?.nroCorrelativo}.pdf`;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Detalle de Venta #{sale.id}</DialogTitle>
          <DialogDescription>
            Fecha: {new Date(sale.createdAt).toLocaleString("es-PE")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          <p><strong>Vendedor:</strong> {sale.source === "WEB" ? "Venta Online" : sale.user}</p>
          <p><strong>Tienda:</strong> {sale.store}</p>
          <p><strong>Cliente:</strong> {sale.client}</p>
          <p><strong>Total:</strong> S/ {sale.total.toFixed(2)}</p>

          {sale.invoice?.tipoComprobante && sale.invoice?.serie && sale.invoice?.nroCorrelativo && (
            <div>
              <strong>Comprobante:</strong> {sale.invoice.tipoComprobante} - {sale.invoice.serie}-{sale.invoice.nroCorrelativo}
              <br />
              <a
                href={`/api/sunat/pdf/${tipo}/${archivo}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline cursor-pointer hover:text-blue-800"
              >
                Ver PDF del comprobante
              </a>
            </div>
          )}

          <div>
            <strong>Productos:</strong>
            <ul className="mt-1 space-y-1">
              {sale.products.map((p: any, i: number) => (
                <li key={i} className="space-y-1">
                  <Badge variant="outline">{`${p.name} x ${p.quantity}`}</Badge>
                  {Array.isArray(p.series) && p.series.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Serie{p.series.length > 1 ? "s" : ""}: {p.series.join(", ")}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

