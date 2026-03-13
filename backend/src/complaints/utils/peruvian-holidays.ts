/**
 * Peruvian national holidays 2024-2030.
 *
 * Fixed holidays per Peruvian law + movable Holy Week dates (pre-calculated).
 * Format: 'YYYY-MM-DD'
 *
 * Update annually: add Jueves/Viernes Santo for new years.
 */

/** Fixed holidays that repeat every year (MM-DD) */
const FIXED_HOLIDAYS: string[] = [
  '01-01', // Año Nuevo
  '05-01', // Día del Trabajo
  '06-07', // Batalla de Arica
  '06-29', // San Pedro y San Pablo
  '07-23', // Día de la Fuerza Aérea del Perú
  '07-28', // Fiestas Patrias
  '07-29', // Fiestas Patrias
  '08-06', // Batalla de Junín
  '08-30', // Santa Rosa de Lima
  '10-08', // Combate de Angamos
  '11-01', // Día de Todos los Santos
  '12-08', // Inmaculada Concepción
  '12-09', // Batalla de Ayacucho
  '12-25', // Navidad
];

/** Jueves y Viernes Santo (movable, pre-calculated) */
const HOLY_WEEK_DATES: Record<number, [string, string]> = {
  2024: ['03-28', '03-29'],
  2025: ['04-17', '04-18'],
  2026: ['04-02', '04-03'],
  2027: ['03-25', '03-26'],
  2028: ['04-13', '04-14'],
  2029: ['03-29', '03-30'],
  2030: ['04-18', '04-19'],
};

function buildHolidaySet(): Set<string> {
  const holidays = new Set<string>();
  const startYear = 2024;
  const endYear = 2030;

  for (let year = startYear; year <= endYear; year++) {
    for (const mmdd of FIXED_HOLIDAYS) {
      holidays.add(`${year}-${mmdd}`);
    }
    const holy = HOLY_WEEK_DATES[year];
    if (holy) {
      holidays.add(`${year}-${holy[0]}`);
      holidays.add(`${year}-${holy[1]}`);
    }
  }

  return holidays;
}

export const PERUVIAN_HOLIDAYS: Set<string> = buildHolidaySet();

export function isPeruvianHoliday(date: Date): boolean {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return PERUVIAN_HOLIDAYS.has(`${yyyy}-${mm}-${dd}`);
}
