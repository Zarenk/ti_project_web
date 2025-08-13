export async function getOrderTracking(code: string) {
  const res = await fetch(`/api/orders/${encodeURIComponent(code)}/tracking`);
  if (!res.ok) {
    throw new Error('Error al obtener el tracking de la orden');
  }
  return res.json();
}