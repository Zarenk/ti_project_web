import {
  parseBadgeArgs,
  pickColor,
} from '../scripts/generate-multi-tenant-badge';

describe('generate-multi-tenant-badge helpers', () => {
  it('parses badge arguments with overrides', () => {
    const args = parseBadgeArgs([
      '--metrics',
      'metrics.json',
      '--output',
      'badge.json',
      '--label',
      'Tenant Coverage',
      '--color',
      'blue',
      '--decimals',
      '3',
    ]);

    expect(args.metricsPath).toBe('metrics.json');
    expect(args.outputPath).toBe('badge.json');
    expect(args.label).toBe('Tenant Coverage');
    expect(args.color).toBe('blue');
    expect(args.decimals).toBe(3);
  });
  it('selects automatic colors based on percentage', () => {
    expect(pickColor(95)).toBe('brightgreen');
    expect(pickColor(80)).toBe('green');
    expect(pickColor(65)).toBe('yellowgreen');
    expect(pickColor(45)).toBe('yellow');
    expect(pickColor(25)).toBe('orange');
    expect(pickColor(10)).toBe('red');
    expect(pickColor(50, 'purple')).toBe('purple');
  });
});
