import { describe, it, expect } from 'vitest';
import { formatGlosa } from './formatGlosa';

describe('formatGlosa', () => {
  it('formats cobro for account 1011', () => {
    const glosa = formatGlosa({
      account: '1011',
      serie: 'F001',
      correlativo: '123',
      productName: 'Producto X',
      paymentMethod: 'EFECTIVO',
    });
    expect(glosa).toBe('Cobro F001-123 – EFECTIVO');
  });

  it('formats cobro for accounts starting with 104', () => {
    const glosa = formatGlosa({
      account: '1041',
      serie: 'F001',
      correlativo: '123',
      productName: 'Producto Y',
      paymentMethod: 'TRANSFERENCIA',
    });
    expect(glosa).toBe('Cobro F001-123 – TRANSFERENCIA');
  });

  it('formats sale removing long tokens', () => {
    const glosa = formatGlosa({
      account: '7011',
      serie: 'F001',
      correlativo: '123',
      productName: 'Laptop SUPERMEGA1234567 Pro',
    });
    expect(glosa).toBe('Venta F001-123 – Laptop Pro');
  });

  it('formats igv sale', () => {
    const glosa = formatGlosa({
      account: '4011',
      serie: 'F001',
      correlativo: '123',
      productName: 'Producto',
    });
    expect(glosa).toBe('IGV 18% Venta F001-123');
  });

  it('formats cost of sales', () => {
    const glosa = formatGlosa({
      account: '6911',
      serie: 'F001',
      correlativo: '123',
      productName: 'Producto SUPER1234567',
    });
    expect(glosa).toBe('Costo de ventas Producto – F001-123');
  });

  it('formats inventory output', () => {
    const glosa = formatGlosa({
      account: '2011',
      serie: 'F001',
      correlativo: '123',
      productName: 'Producto',
    });
    expect(glosa).toBe('Salida mercaderías por F001-123');
  });
});

