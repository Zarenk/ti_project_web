export const BusinessVertical = {
  GENERAL: 'GENERAL',
  RESTAURANTS: 'RESTAURANTS',
  RETAIL: 'RETAIL',
  SERVICES: 'SERVICES',
  MANUFACTURING: 'MANUFACTURING',
} as const;

export type BusinessVertical =
  (typeof BusinessVertical)[keyof typeof BusinessVertical];

export const VERTICAL_DISPLAY_NAMES: Record<BusinessVertical, string> = {
  [BusinessVertical.GENERAL]: 'General',
  [BusinessVertical.RESTAURANTS]: 'Restaurantes y Cafeterías',
  [BusinessVertical.RETAIL]: 'Comercio Minorista',
  [BusinessVertical.SERVICES]: 'Servicios Profesionales',
  [BusinessVertical.MANUFACTURING]: 'Manufactura y Producción',
};
