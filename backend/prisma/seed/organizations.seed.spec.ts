import {
  buildSeedSummary,
  filterSeedOrganizations,
  parseSeedCliArgs,
  persistSeedSummary,
  type OrganizationSeedResult,
  type SeedOrganization,
} from './organizations.seed';
import { mkdtemp, readFile } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';

describe('organizations.seed CLI utilities', () => {
  const organizations: SeedOrganization[] = [
    { code: 'tenant-alpha', name: 'Tenant Alpha' },
    { code: 'tenant-beta', name: 'Tenant Beta' },
    { code: 'tenant-gamma', name: 'Tenant Gamma' },
  ];

  describe('parseSeedCliArgs', () => {
    it('returns empty options when no filters are provided', () => {
      expect(parseSeedCliArgs([])).toEqual({});
    });

    it('parses organization codes using --org flag', () => {
      expect(parseSeedCliArgs(['--org', 'tenant-alpha'])).toEqual({
        onlyOrganizations: ['tenant-alpha'],
      });
    });

    it('parses multiple organization codes using equals syntax', () => {
      expect(parseSeedCliArgs(['--org=tenant-alpha,tenant-beta'])).toEqual({
        onlyOrganizations: ['tenant-alpha', 'tenant-beta'],
      });
    });

    it('parses organization codes using --organization alias', () => {
      expect(
        parseSeedCliArgs(['--organization', 'tenant-alpha,tenant-gamma']),
      ).toEqual({
        onlyOrganizations: ['tenant-alpha', 'tenant-gamma'],
      });
    });

    it('throws when the flag value is missing', () => {
      expect(() => parseSeedCliArgs(['--org'])).toThrow(
        '[organizations-seed] Missing value for --org',
      );
      expect(() => parseSeedCliArgs(['--org=  '])).toThrow(
        '[organizations-seed] Missing value for --org',
      );
    });

    it('captures the summary path option using kebab or camel case', () => {
      expect(parseSeedCliArgs(['--summary-path', 'reports/output.json'])).toEqual({
        summaryPath: 'reports/output.json',
      });
      expect(
        parseSeedCliArgs(['--summaryPath= ./artifacts/summary.json', '--org', 'tenant-alpha']),
      ).toEqual({
        summaryPath: './artifacts/summary.json',
        onlyOrganizations: ['tenant-alpha'],
      });
    });

  });

  describe('filterSeedOrganizations', () => {
    it('returns original list when no filters provided', () => {
      expect(filterSeedOrganizations(organizations, undefined)).toEqual(
        organizations,
      );
    });

    it('filters organizations by provided codes', () => {
      expect(
        filterSeedOrganizations(organizations, ['tenant-beta', 'tenant-alpha']),
      ).toEqual([
        { code: 'tenant-alpha', name: 'Tenant Alpha' },
        { code: 'tenant-beta', name: 'Tenant Beta' },
      ]);
    });

    it('throws when unknown organization codes are provided', () => {
      expect(() =>
        filterSeedOrganizations(organizations, ['tenant-unknown']),
      ).toThrow(
        '[organizations-seed] Unknown organization code(s): tenant-unknown',
      );
    });
  });

  describe('buildSeedSummary', () => {
    it('aggregates counters from organization results', () => {
      const results: OrganizationSeedResult[] = [
        {
          code: 'tenant-alpha',
          action: 'created',
          unitsCreated: 2,
          unitsUpdated: 0,
          unitsEnsured: 2,
        },
        {
          code: 'tenant-beta',
          action: 'updated',
          unitsCreated: 1,
          unitsUpdated: 3,
          unitsEnsured: 4,
        },
      ];

      const summary = buildSeedSummary(results);

      expect(summary.totalOrganizations).toBe(2);
      expect(summary.totalCreated).toBe(1);
      expect(summary.totalUpdated).toBe(1);
      expect(summary.totalUnitsCreated).toBe(3);
      expect(summary.totalUnitsUpdated).toBe(3);
      expect(new Date(summary.processedAt).toISOString()).toBe(summary.processedAt);
      expect(summary.organizations).toEqual(results);
    });
  });

  describe('persistSeedSummary', () => {
    it('writes the summary file creating intermediate directories', async () => {
      const tempDir = await mkdtemp(path.join(tmpdir(), 'org-seed-'));
      const summaryPath = path.join(tempDir, 'reports', 'summary.json');

      const summary = buildSeedSummary([
        {
          code: 'tenant-alpha',
          action: 'created',
          unitsCreated: 1,
          unitsUpdated: 0,
          unitsEnsured: 1,
        },
      ]);

      const persisted = await persistSeedSummary(summaryPath, summary);

      expect(persisted).toBe(true);
      const disk = JSON.parse(await readFile(summaryPath, 'utf8'));
      expect(disk.totalOrganizations).toBe(summary.totalOrganizations);
      expect(disk.organizations).toHaveLength(1);
      expect(disk.organizations[0].code).toBe('tenant-alpha');
    });
  });
});