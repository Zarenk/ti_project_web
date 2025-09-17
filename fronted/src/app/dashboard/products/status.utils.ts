export const normalizeProductStatus = (status?: string | null) => {
  if (!status) return 'Activo';
  const normalized = status.trim().toLowerCase();
  if (normalized === 'inactivo' || normalized === 'inactive') {
    return 'Inactivo';
  }
  return 'Activo';
};

export const isProductActive = (status?: string | null) =>
  normalizeProductStatus(status) === 'Activo';
