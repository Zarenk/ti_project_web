import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { BACKEND_URL } from "@/lib/utils";


export function SaleDetailModal({ sale, open, onClose }: { sale: any, open: boolean, onClose: () => void }) {
  if (!sale) return null;
  console.log('Venta recibida en modal:', sale);
  const tipo = sale.invoice?.tipoComprobante?.toLowerCase(); // "factura" o "boleta"
  const archivo = `20519857538-${tipo === 'boleta' ? '03' : '01'}-${sale.invoice?.serie}-${sale.invoice?.nroCorrelativo}.pdf`;

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
                href={`${BACKEND_URL}/api/sunat/pdf/${tipo}/${archivo}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                Ver PDF del comprobante
              </a>
            </div>
          )}

          <div>
            <strong>Productos:</strong>
            <ul className="mt-1 space-y-1">
              {sale.products.map((p: any, i: number) => (
                <li key={i}>
                  <Badge variant="outline">{p.name} × {p.quantity}</Badge>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}