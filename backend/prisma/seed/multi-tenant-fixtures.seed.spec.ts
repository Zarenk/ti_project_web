import { parseFixtureCliArgs } from './multi-tenant-fixtures.seed';

describe('parseFixtureCliArgs', () => {
  it('parses --summary-path=<value> form', () => {
    expect(
      parseFixtureCliArgs(['--summary-path=./tmp/fixtures-summary.json']).summaryPath,
    ).toBe('./tmp/fixtures-summary.json');
  });

  it('parses --summary-path <value> form', () => {
    expect(
      parseFixtureCliArgs(['--summary-path', './tmp/fixtures-summary.json']).summaryPath,
    ).toBe('./tmp/fixtures-summary.json');
  });

  it('supports camelCase --summaryPath flag', () => {
    expect(
      parseFixtureCliArgs(['--summaryPath=./tmp/camel-summary.json']).summaryPath,
    ).toBe('./tmp/camel-summary.json');
  });

  it('supports camelCase --summaryPath flag with separated value', () => {
    expect(
      parseFixtureCliArgs(['--summaryPath', './tmp/camel-summary.json']).summaryPath,
    ).toBe('./tmp/camel-summary.json');
  });

  it('accepts kebab-case --summary-file alias', () => {
    expect(
      parseFixtureCliArgs(['--summary-file=./tmp/alias-summary.json']).summaryPath,
    ).toBe('./tmp/alias-summary.json');
  });

  it('accepts camelCase --summaryFile alias', () => {
    expect(
      parseFixtureCliArgs(['--summaryFile', './tmp/alias-summary.json']).summaryPath,
    ).toBe('./tmp/alias-summary.json');
  });

  it('prefers the last provided summary flag', () => {
    expect(
      parseFixtureCliArgs([
        '--summary-path',
        './tmp/first.json',
        '--summaryFile',
        './tmp/second.json',
      ]).summaryPath,
    ).toBe('./tmp/second.json');
  });

  it('returns an empty object when no flags are provided', () => {
    expect(parseFixtureCliArgs([])).toEqual({});
  });
});