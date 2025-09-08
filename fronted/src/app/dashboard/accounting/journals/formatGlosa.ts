export function formatGlosa({
  account,
  serie,
  correlativo,
  productName,
  paymentMethod,
}: {
  account: string;
  serie: string;
  correlativo: string;
  productName: string;
  paymentMethod?: string;
}): string {
  const voucher = `${serie}-${correlativo}`;
  const productResumen = productName.replace(/\b[\w-]{7,}\b/g, '').trim();

  if (account === '1011' || account.startsWith('104')) {
    return `Cobro ${voucher} – ${paymentMethod}`;
  }
  if (account === '7011') {
    return `Venta ${voucher} – ${productResumen}`;
  }
  if (account === '4011') {
    return `IGV 18% Venta ${voucher}`;
  }
  if (account === '6911') {
    return `Costo de ventas ${productResumen} – ${voucher}`;
  }
  if (account === '2011') {
    return `Salida mercaderías por ${voucher}`;
  }
  return '';
}
