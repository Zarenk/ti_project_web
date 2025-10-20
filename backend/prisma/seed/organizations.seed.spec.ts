import {
  filterSeedOrganizations,
  parseSeedCliArgs,
  type SeedOrganization,
} from './organizations.seed';

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
});