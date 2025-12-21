import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ContextThrottleService } from './context-throttle.service';

type OrgGroup = { orgId: number | null; _count: { _all: number } };
type CompanyGroup = { companyId: number | null; _count: { _all: number } };
type DeviceGroup = { device: string | null; _count: { _all: number } };

@Injectable()
export class ContextMetricsService {
  private readonly THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  private readonly TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

  constructor(
    private prisma: PrismaService,
    private throttleService: ContextThrottleService,
  ) {}

  async getUserSummary(userId: number) {
    const now = Date.now();
    const since30 = new Date(now - this.THIRTY_DAYS_MS);

    const [
      totalSelections,
      recentSelections,
      lastEntry,
      topOrgGroups,
      topCompanyGroups,
      deviceGroups,
      preferenceCount,
    ] = await Promise.all([
      this.prisma.userContextHistory.count({ where: { userId } }),
      this.prisma.userContextHistory.count({
        where: { userId, createdAt: { gte: since30 } },
      }),
      this.prisma.userContextHistory.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.userContextHistory.groupBy({
        by: ['orgId'],
        where: { userId },
        _count: { _all: true },
        orderBy: { _count: { orgId: 'desc' } },
        take: 3,
      }),
      this.prisma.userContextHistory.groupBy({
        by: ['companyId'],
        where: { userId, companyId: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { companyId: 'desc' } },
        take: 3,
      }),
      this.prisma.userContextHistory.groupBy({
        by: ['device'],
        where: { userId, device: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { device: 'desc' } },
        take: 3,
      }),
      this.prisma.userContextPreference.count({ where: { userId } }),
    ]);

    const orgIds = Array.from(
      new Set(
        [...topOrgGroups.map((entry) => entry.orgId), lastEntry?.orgId].filter(
          (value): value is number => typeof value === 'number',
        ),
      ),
    );

    const companyIds = Array.from(
      new Set(
        [
          ...topCompanyGroups.map((entry) => entry.companyId),
          lastEntry?.companyId ?? undefined,
        ].filter((value): value is number => typeof value === 'number'),
      ),
    );

    const [orgLookup, companyLookup] = await Promise.all([
      orgIds.length
        ? this.prisma.organization
            .findMany({
              where: { id: { in: orgIds } },
              select: { id: true, name: true },
            })
            .then(
              (records) =>
                new Map(records.map((record) => [record.id, record.name])),
            )
        : Promise.resolve(new Map<number, string | null>()),
      companyIds.length
        ? this.prisma.company
            .findMany({
              where: { id: { in: companyIds } },
              select: { id: true, name: true },
            })
            .then(
              (records) =>
                new Map(records.map((record) => [record.id, record.name])),
            )
        : Promise.resolve(new Map<number, string | null>()),
    ]);

    const formatOrgItems = (groups: OrgGroup[]) =>
      groups.map((group) => ({
        id: group.orgId,
        name:
          typeof group.orgId === 'number'
            ? (orgLookup.get(group.orgId) ?? null)
            : null,
        count: group._count._all,
      }));

    const formatCompanyItems = (groups: CompanyGroup[]) =>
      groups.map((group) => ({
        id: group.companyId,
        name:
          typeof group.companyId === 'number'
            ? (companyLookup.get(group.companyId) ?? null)
            : null,
        count: group._count._all,
      }));

    const formatDeviceItems = (groups: DeviceGroup[]) =>
      groups.map((group) => ({
        id: group.device,
        name: group.device,
        count: group._count._all,
      }));

    return {
      totalSelections,
      selectionsLast30Days: recentSelections,
      lastSelection: lastEntry
        ? {
            id: lastEntry.id,
            orgId: lastEntry.orgId,
            companyId: lastEntry.companyId,
            orgName: orgLookup.get(lastEntry.orgId) ?? null,
            companyName:
              typeof lastEntry.companyId === 'number'
                ? (companyLookup.get(lastEntry.companyId) ?? null)
                : null,
            device: lastEntry.device,
            createdAt: lastEntry.createdAt,
          }
        : null,
      topOrganizations: formatOrgItems(topOrgGroups as OrgGroup[]),
      topCompanies: formatCompanyItems(topCompanyGroups as CompanyGroup[]),
      deviceBreakdown: formatDeviceItems(deviceGroups as DeviceGroup[]),
      preferenceCount,
    };
  }

  async getGlobalSummary() {
    const now = Date.now();
    const since24 = new Date(now - this.TWENTY_FOUR_HOURS_MS);

    const [
      totalSelections,
      selectionsLast24h,
      uniqueUsersRaw,
      topOrgGroups,
      topCompanyGroups,
    ] = await Promise.all([
      this.prisma.userContextHistory.count(),
      this.prisma.userContextHistory.count({
        where: { createdAt: { gte: since24 } },
      }),
      this.prisma.userContextHistory.groupBy({
        by: ['userId'],
        _count: { _all: true },
      }),
      this.prisma.userContextHistory.groupBy({
        by: ['orgId'],
        _count: { _all: true },
        orderBy: { _count: { orgId: 'desc' } },
        take: 5,
      }),
      this.prisma.userContextHistory.groupBy({
        by: ['companyId'],
        where: { companyId: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { companyId: 'desc' } },
        take: 5,
      }),
    ]);

    const orgIds = topOrgGroups
      .map((group) => group.orgId)
      .filter((value): value is number => typeof value === 'number');
    const companyIds = topCompanyGroups
      .map((group) => group.companyId)
      .filter((value): value is number => typeof value === 'number');

    const [orgLookup, companyLookup] = await Promise.all([
      orgIds.length
        ? this.prisma.organization
            .findMany({
              where: { id: { in: orgIds } },
              select: { id: true, name: true },
            })
            .then(
              (records) =>
                new Map(records.map((record) => [record.id, record.name])),
            )
        : Promise.resolve(new Map<number, string | null>()),
      companyIds.length
        ? this.prisma.company
            .findMany({
              where: { id: { in: companyIds } },
              select: { id: true, name: true },
            })
            .then(
              (records) =>
                new Map(records.map((record) => [record.id, record.name])),
            )
        : Promise.resolve(new Map<number, string | null>()),
    ]);

    const formatTopItems = (
      groups: OrgGroup[] | CompanyGroup[],
      key: 'orgId' | 'companyId',
      lookup: Map<number, string | null>,
    ) =>
      groups.map((group) => {
        const id = group[key] as number | null;
        return {
          id,
          name: typeof id === 'number' ? (lookup.get(id) ?? null) : null,
          count: group._count._all,
        };
      });

    const throttleStats = this.throttleService.getSummary();

    return {
      totalSelections,
      selectionsLast24h,
      uniqueUsers: uniqueUsersRaw.length,
      topOrganizations: formatTopItems(
        topOrgGroups as OrgGroup[],
        'orgId',
        orgLookup,
      ),
      topCompanies: formatTopItems(
        topCompanyGroups as CompanyGroup[],
        'companyId',
        companyLookup,
      ),
      throttleStats,
    };
  }
}
