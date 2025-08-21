import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface AccountSeed {
  code: string
  name: string
  parentCode?: string
  level?: number
  isPosting?: boolean
}

const accounts: AccountSeed[] = [
  { code: '1', name: 'Activo' },
  { code: '10', name: 'Efectivo y equivalentes de efectivo', parentCode: '1' },
  { code: '101', name: 'Caja', parentCode: '10' },
  { code: '1011', name: 'Caja general', parentCode: '101', isPosting: true },
  { code: '104', name: 'Cuentas corrientes', parentCode: '10' },
  { code: '1041', name: 'Banco de la Nación - Detracciones', parentCode: '104', isPosting: true },
  { code: '11', name: 'Inversiones financieras', parentCode: '1' },
  { code: '12', name: 'Cuentas por cobrar comerciales - terceros', parentCode: '1' },
  { code: '13', name: 'Cuentas por cobrar comerciales - relacionadas', parentCode: '1' },
  { code: '14', name: 'Cuentas por cobrar al personal, a los accionistas y directores', parentCode: '1' },
  { code: '15', name: 'Cuentas por cobrar diversas', parentCode: '1' },
  { code: '16', name: 'Inventarios', parentCode: '1' },
  { code: '17', name: 'Activos biológicos', parentCode: '1' },
  { code: '18', name: 'Servicios y otros contratados por anticipado', parentCode: '1' },
  { code: '19', name: 'Depreciación y amortización acumulada', parentCode: '1' },
  { code: '2', name: 'Pasivo' },
  { code: '20', name: 'Obligaciones financieras', parentCode: '2' },
  { code: '201', name: 'Préstamos bancarios', parentCode: '20' },
  { code: '2011', name: 'Préstamos bancarios locales', parentCode: '201', isPosting: true },
  { code: '21', name: 'Proveedores', parentCode: '2' },
  { code: '211', name: 'Proveedores nacionales', parentCode: '21' },
  { code: '2111', name: 'Proveedores nacionales - mercaderías', parentCode: '211', isPosting: true },
  { code: '22', name: 'Cuentas por pagar comerciales - relacionadas', parentCode: '2' },
  { code: '23', name: 'Cuentas por pagar diversas', parentCode: '2' },
  { code: '24', name: 'Cuentas por pagar al personal, a los accionistas y directores', parentCode: '2' },
  { code: '25', name: 'Tributos por pagar', parentCode: '2' },
  { code: '26', name: 'Provisiones', parentCode: '2' },
  { code: '27', name: 'Beneficios sociales de los trabajadores', parentCode: '2' },
  { code: '28', name: 'Pasivos por impuestos diferidos', parentCode: '2' },
  { code: '29', name: 'Pasivos diversos', parentCode: '2' },
  { code: '3', name: 'Patrimonio' },
  { code: '30', name: 'Capital', parentCode: '3' },
  { code: '301', name: 'Capital social', parentCode: '30' },
  { code: '3011', name: 'Capital social aportado', parentCode: '301', isPosting: true },
  { code: '31', name: 'Acciones de inversión', parentCode: '3' },
  { code: '32', name: 'Capital adicional', parentCode: '3' },
  { code: '33', name: 'Resultados acumulados', parentCode: '3' },
  { code: '34', name: 'Excedente de revaluación', parentCode: '3' },
  { code: '35', name: 'Acciones propias en cartera', parentCode: '3' },
  { code: '36', name: 'Resultados no realizados', parentCode: '3' },
  { code: '37', name: 'Ajustes patrimoniales', parentCode: '3' },
  { code: '38', name: 'Reservas', parentCode: '3' },
  { code: '39', name: 'Resultado del ejercicio', parentCode: '3' },
  { code: '4', name: 'Gastos por naturaleza' },
  { code: '40', name: 'Costos de ventas', parentCode: '4' },
  { code: '401', name: 'Mercaderías', parentCode: '40' },
  { code: '4011', name: 'Costo de mercaderías vendidas', parentCode: '401', isPosting: true },
  { code: '41', name: 'Variación de inventarios', parentCode: '4' },
  { code: '42', name: 'Gastos de personal', parentCode: '4' },
  { code: '43', name: 'Servicios prestados por terceros', parentCode: '4' },
  { code: '44', name: 'Gastos por tributos', parentCode: '4' },
  { code: '45', name: 'Pérdida por medición de activos no financieros', parentCode: '4' },
  { code: '46', name: 'Pérdida por medición de instrumentos financieros', parentCode: '4' },
  { code: '47', name: 'Gastos financieros', parentCode: '4' },
  { code: '48', name: 'Valuación y deterioro de activos y provisiones', parentCode: '4' },
  { code: '49', name: 'Costos y gastos por distribuir', parentCode: '4' },
  { code: '5', name: 'Ingresos' },
  { code: '50', name: 'Ventas', parentCode: '5' },
  { code: '501', name: 'Mercaderías', parentCode: '50' },
  { code: '5011', name: 'Venta de mercaderías', parentCode: '501', isPosting: true },
  { code: '51', name: 'Variación de la producción almacenada', parentCode: '5' },
  { code: '52', name: 'Producción de activo inmovilizado', parentCode: '5' },
  { code: '53', name: 'Descuentos, rebajas y bonificaciones obtenidas', parentCode: '5' },
  { code: '54', name: 'Otros ingresos de gestión', parentCode: '5' },
  { code: '55', name: 'Ingresos financieros', parentCode: '5' },
  { code: '56', name: 'Ganancia por medición de activos no financieros', parentCode: '5' },
  { code: '57', name: 'Ingresos por servicios prestados', parentCode: '5' },
  { code: '58', name: 'Participación en resultados de subsidiarias y asociadas', parentCode: '5' },
  { code: '59', name: 'Ganancia por medición de instrumentos financieros', parentCode: '5' },
  { code: '6', name: 'Gastos por función' },
  { code: '60', name: 'Gastos de administración', parentCode: '6' },
  { code: '601', name: 'Gastos de administración general', parentCode: '60' },
  { code: '6011', name: 'Gastos administrativos', parentCode: '601', isPosting: true },
  { code: '61', name: 'Gastos de ventas', parentCode: '6' },
  { code: '62', name: 'Gastos de financiamiento', parentCode: '6' },
  { code: '63', name: 'Pérdidas por investigación y desarrollo', parentCode: '6' },
  { code: '64', name: 'Gastos diversos de gestión', parentCode: '6' },
  { code: '65', name: 'Pérdidas extraordinarias', parentCode: '6' },
  { code: '66', name: 'Gastos por tributos', parentCode: '6' },
  { code: '67', name: 'Valuación y deterioro de activos y provisiones', parentCode: '6' },
  { code: '68', name: 'Costo de ventas', parentCode: '6' },
  { code: '69', name: 'Costos indirectos', parentCode: '6' },
  { code: '7', name: 'Ingresos por función' },
  { code: '70', name: 'Ventas', parentCode: '7' },
  { code: '701', name: 'Venta de mercaderías', parentCode: '70' },
  { code: '7011', name: 'Venta de mercaderías - nacional', parentCode: '701', isPosting: true },
  { code: '71', name: 'Variación de la producción almacenada', parentCode: '7' },
  { code: '72', name: 'Producción de activo inmovilizado', parentCode: '7' },
  { code: '73', name: 'Descuentos, rebajas y bonificaciones', parentCode: '7' },
  { code: '74', name: 'Otros ingresos de gestión', parentCode: '7' },
  { code: '75', name: 'Ingresos financieros', parentCode: '7' },
  { code: '76', name: 'Ganancia por medición de activos no financieros', parentCode: '7' },
  { code: '77', name: 'Ingresos por servicios prestados', parentCode: '7' },
  { code: '78', name: 'Participación en resultados de subsidiarias', parentCode: '7' },
  { code: '79', name: 'Ganancia por medición de instrumentos financieros', parentCode: '7' },
  { code: '8', name: 'Saldos intermedios de gestión' },
  { code: '80', name: 'Margen comercial', parentCode: '8' },
  { code: '81', name: 'Producción del ejercicio', parentCode: '8' },
  { code: '82', name: 'Valor agregado', parentCode: '8' },
  { code: '83', name: 'Excedente bruto de explotación', parentCode: '8' },
  { code: '84', name: 'Resultado de explotación', parentCode: '8' },
  { code: '85', name: 'Resultado antes de participaciones e impuestos', parentCode: '8' },
  { code: '86', name: 'Resultado antes de impuestos', parentCode: '8' },
  { code: '87', name: 'Resultado del ejercicio', parentCode: '8' },
  { code: '88', name: 'Resultado del ejercicio - participaciones', parentCode: '8' },
  { code: '89', name: 'Resultado del ejercicio - impuestos', parentCode: '8' },
  { code: '9', name: 'Cuentas de orden' },
  { code: '90', name: 'Cuentas de orden deudoras', parentCode: '9' },
  { code: '901', name: 'Bienes recibidos en consignación', parentCode: '90' },
  { code: '9011', name: 'Bienes recibidos en consignación - terceros', parentCode: '901', isPosting: true },
  { code: '91', name: 'Cuentas de orden acreedoras', parentCode: '9' },
  { code: '92', name: 'Contingencias', parentCode: '9' },
  { code: '93', name: 'Cuentas de control', parentCode: '9' },
  { code: '94', name: 'Cuentas de orden diversas', parentCode: '9' },
  { code: '95', name: 'Bienes en consignación', parentCode: '9' },
  { code: '96', name: 'Cuentas de costo y ganancia', parentCode: '9' },
  { code: '97', name: 'Compromisos y contratos', parentCode: '9' },
  { code: '98', name: 'Cuentas de valuación', parentCode: '9' },
  { code: '99', name: 'Cuentas de orden varias', parentCode: '9' },
]

const taxCodes = [
  {
    code: 'IGV',
    name: 'IGV 18%',
    rate: 0.18,
    sunatTributoCode: '1000',
    sunatOperacionType: '10',
  },
  {
    code: 'EXO',
    name: 'Exonerado',
    rate: 0,
    sunatTributoCode: '9997',
    sunatOperacionType: '20',
  },
  {
    code: 'INA',
    name: 'Inafecto',
    rate: 0,
    sunatTributoCode: '9998',
    sunatOperacionType: '30',
  },
  {
    code: 'EXP',
    name: 'Exportación',
    rate: 0,
    sunatTributoCode: '9995',
    sunatOperacionType: '40',
  },
  {
    code: 'DETR',
    name: 'Detracción',
    rate: 0,
    sunatTributoCode: '2000',
    sunatOperacionType: '10',
    contraAccountCode: '1041',
  },
  {
    code: 'RET',
    name: 'Retención',
    rate: 0,
    sunatTributoCode: '1000',
    sunatOperacionType: '10',
  },
  {
    code: 'PERC',
    name: 'Percepción',
    rate: 0,
    sunatTributoCode: '1000',
    sunatOperacionType: '10',
  },
]

async function main() {
  const accountIdByCode = new Map<string, number>()

  for (const acc of accounts) {
    const parentId = acc.parentCode ? accountIdByCode.get(acc.parentCode) : null
    const level = acc.level ?? acc.code.length
    const isPosting = acc.isPosting ?? acc.code.length >= 4
    const created = await prisma.account.upsert({
      where: { code: acc.code },
      update: { name: acc.name, parentId, level, isPosting },
      create: { code: acc.code, name: acc.name, parentId, level, isPosting },
    })
    accountIdByCode.set(acc.code, created.id)
  }

  for (const tax of taxCodes) {
    const contraAccountId = tax.contraAccountCode
      ? accountIdByCode.get(tax.contraAccountCode)
      : null
    await prisma.taxCode.upsert({
      where: { code: tax.code },
      update: {
        name: tax.name,
        rate: tax.rate,
        sunatTributoCode: tax.sunatTributoCode,
        sunatOperacionType: tax.sunatOperacionType,
        contraAccountId,
      },
      create: {
        code: tax.code,
        name: tax.name,
        rate: tax.rate,
        sunatTributoCode: tax.sunatTributoCode,
        sunatOperacionType: tax.sunatOperacionType,
        contraAccountId,
      },
    })
  }

  console.log('Accounting seed completed')
}

main()
  .catch((e) => {
    console.error('Error seeding accounting data:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })