/**
 * Glosario de términos contables en lenguaje sencillo
 * Usado en tooltips educativos del dashboard
 */

export interface GlossaryTerm {
  id: string;
  term: string;
  definition: string;
  example?: string;
  relatedTerms?: string[];
}

export const ACCOUNTING_GLOSSARY: Record<string, GlossaryTerm> = {
  cash: {
    id: 'cash',
    term: 'Dinero disponible',
    definition: 'Es el dinero que tienes ahora mismo en efectivo (caja) y en el banco. Es lo que puedes usar para pagar proveedores, empleados o cualquier gasto.',
    example: 'Si tienes S/ 5,000 en efectivo y S/ 10,000 en el banco, tu dinero disponible es S/ 15,000.',
    relatedTerms: ['caja', 'banco'],
  },
  caja: {
    id: 'caja',
    term: 'Caja',
    definition: 'Dinero en efectivo (billetes y monedas) que guardas físicamente en tu negocio.',
    example: 'El dinero que tienes en el cajón de la caja registradora.',
  },
  banco: {
    id: 'banco',
    term: 'Bancos',
    definition: 'Dinero que tienes depositado en cuentas bancarias, incluyendo transferencias, Yape, Plin, etc.',
    example: 'Tu cuenta corriente en el BCP o BBVA.',
  },
  inventory: {
    id: 'inventory',
    term: 'Valor del inventario',
    definition: 'El valor total de todos los productos que tienes guardados y listos para vender. Se calcula al precio que te costó comprarlos.',
    example: 'Si compraste 100 polos a S/ 20 cada uno, tu inventario vale S/ 2,000.',
    relatedTerms: ['merchandise'],
  },
  merchandise: {
    id: 'merchandise',
    term: 'Mercaderías',
    definition: 'Productos que compras para revender. No incluye productos que tú produces o fabricas.',
    example: 'Si tienes una tienda de ropa, las prendas que compras de tus proveedores son mercaderías.',
  },
  igv: {
    id: 'igv',
    term: 'IGV',
    definition: 'Impuesto General a las Ventas (18%). Es el impuesto que cobras a tus clientes cuando vendes y que pagas a tus proveedores cuando compras.',
    example: 'Si vendes algo en S/ 100, cobras S/ 18 de IGV. Al final del mes, restas el IGV que pagaste en compras del que cobraste en ventas, y esa diferencia la pagas a SUNAT.',
    relatedTerms: ['igvSales', 'igvPurchases', 'netIgv'],
  },
  igvSales: {
    id: 'igvSales',
    term: 'IGV de ventas',
    definition: 'El impuesto que cobraste a tus clientes este mes. Este dinero no es tuyo, tienes que dárselo a SUNAT.',
    example: 'Si vendiste S/ 10,000 + IGV, cobraste S/ 1,800 de IGV.',
  },
  igvPurchases: {
    id: 'igvPurchases',
    term: 'IGV de compras',
    definition: 'El impuesto que pagaste a tus proveedores este mes. Este dinero lo puedes descontar del IGV que debes pagar.',
    example: 'Si compraste S/ 5,000 + IGV, pagaste S/ 900 de IGV que puedes restar.',
  },
  netIgv: {
    id: 'netIgv',
    term: 'IGV neto',
    definition: 'La diferencia entre el IGV que cobraste y el que pagaste. Es lo que realmente debes pagar a SUNAT.',
    example: 'IGV ventas S/ 1,800 - IGV compras S/ 900 = S/ 900 a pagar.',
  },
  profit: {
    id: 'profit',
    term: 'Ganancia del mes',
    definition: 'Es la diferencia entre lo que ganaste vendiendo y lo que te costó comprar esos productos. No incluye otros gastos como alquiler o sueldos.',
    example: 'Vendiste S/ 10,000 en productos que te costaron S/ 6,000. Tu ganancia bruta es S/ 4,000.',
    relatedTerms: ['revenue', 'costOfSales', 'profitMargin'],
  },
  revenue: {
    id: 'revenue',
    term: 'Ingresos',
    definition: 'Todo el dinero que recibiste por tus ventas este mes, sin restar nada.',
    example: 'Si vendiste 100 productos a S/ 50, tus ingresos son S/ 5,000.',
  },
  costOfSales: {
    id: 'costOfSales',
    term: 'Costo de ventas',
    definition: 'Lo que te costó comprar los productos que vendiste este mes.',
    example: 'Si vendiste productos que te costaron S/ 3,000, ese es tu costo de ventas.',
  },
  profitMargin: {
    id: 'profitMargin',
    term: 'Margen de ganancia',
    definition: 'El porcentaje de ganancia que obtienes en cada venta. Te dice qué tan rentable es tu negocio.',
    example: 'Si vendes algo en S/ 100 que te costó S/ 70, tu margen es 30% (ganaste S/ 30 de cada S/ 100).',
  },
};
