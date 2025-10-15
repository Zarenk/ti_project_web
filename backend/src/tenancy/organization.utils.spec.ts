import { BadRequestException } from '@nestjs/common';
import { buildOrganizationFilter, resolveOrganizationId } from './organization.utils';

describe('organization.utils', () => {
  describe('resolveOrganizationId', () => {
    it('returns the provided organizationId when defined', () => {
      expect(
        resolveOrganizationId({
          provided: 123,
          fallbacks: [123],
          mismatchError: 'should not throw',
        }),
      ).toBe(123);
    });

    it('falls back to the first defined reference when payload omits it', () => {
      expect(
        resolveOrganizationId({
          fallbacks: [null, undefined, 789],
          mismatchError: 'should not throw',
        }),
      ).toBe(789);
    });

    it('returns null when no references are available', () => {
      expect(
        resolveOrganizationId({
          mismatchError: 'should not throw',
        }),
      ).toBeNull();
    });

    it('throws when references point to different organizations', () => {
      expect(() =>
        resolveOrganizationId({
          provided: 100,
          fallbacks: [200],
          mismatchError: 'conflict',
        }),
      ).toThrow(new BadRequestException('conflict'));
    });
  });

  describe('buildOrganizationFilter', () => {
    it('returns an empty filter when organizationId is undefined', () => {
      expect(buildOrganizationFilter(undefined)).toEqual({});
    });

    it('keeps null organizationId to query legacy rows', () => {
      expect(buildOrganizationFilter(null)).toEqual({ organizationId: null });
    });

    it('wraps defined organizationId in a Prisma filter', () => {
      expect(buildOrganizationFilter(55)).toEqual({ organizationId: 55 });
    });
  });
});