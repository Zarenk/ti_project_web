import { ForbiddenException, Logger, NotFoundException } from '@nestjs/common';
import { AdsService } from './ads.service';
import { AdsRole } from './roles.enum';

describe('AdsService multi-tenancy', () => {
  const adminUser = { id: 1, role: AdsRole.ADMIN, organizationId: 101 } as const;
  const marketingUser = { id: 2, role: AdsRole.MARKETING, organizationId: 101 } as const;
  const otherOrgUser = { id: 3, role: AdsRole.ADMIN, organizationId: 202 } as const;

  const baseCampaign = {
    name: 'Launch campaign',
    startDate: new Date('2024-01-01T00:00:00Z'),
    endDate: new Date('2024-02-01T00:00:00Z'),
  } as const;

  const realDateNow = Date.now;
  let service: AdsService;

  beforeAll(() => {
    process.env.REDIS_ENABLED = 'false';
  });

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    let sequence = 0;
    jest.spyOn(Date, 'now').mockImplementation(() => realDateNow() + ++sequence);
    service = new AdsService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('stores campaigns per organization and paginates within the tenant', () => {
    const campaign = service.createCampaign(adminUser, {
      ...baseCampaign,
      organizationId: adminUser.organizationId!,
    });

    const listing = service.listCampaigns(adminUser.organizationId!, 1, 10);

    expect(listing.total).toBe(1);
    expect(listing.items[0]).toMatchObject({
      id: campaign.id,
      name: baseCampaign.name,
      organizationId: adminUser.organizationId,
      status: 'draft',
    });
  });

  it('prevents creating campaigns in a different organization', () => {
    expect(() =>
      service.createCampaign(adminUser, {
        ...baseCampaign,
        organizationId: otherOrgUser.organizationId!,
      }),
    ).toThrow(ForbiddenException);
  });

  it('isolates campaign retrieval by organization', () => {
    const campaign = service.createCampaign(adminUser, {
      ...baseCampaign,
      organizationId: adminUser.organizationId!,
    });

    service.createCampaign(otherOrgUser, {
      ...baseCampaign,
      name: 'Other org campaign',
      organizationId: otherOrgUser.organizationId!,
    });

    expect(() => service.getCampaign(otherOrgUser.organizationId!, campaign.id)).toThrow(
      NotFoundException,
    );

    const result = service.getCampaign(adminUser.organizationId!, campaign.id);
    expect(result.campaign.organizationId).toBe(adminUser.organizationId);
  });

  it('enforces organization scoping when creating creatives', () => {
    const campaign = service.createCampaign(adminUser, {
      ...baseCampaign,
      organizationId: adminUser.organizationId!,
    });

    const creative = service.createCreative(marketingUser, {
      organizationId: adminUser.organizationId!,
      campaignId: campaign.id,
      title: 'Primary creative',
      content: 'Buy now!',
    });

    expect(creative.organizationId).toBe(adminUser.organizationId);

    expect(() =>
      service.createCreative(
        { ...otherOrgUser, role: AdsRole.MARKETING },
        {
          organizationId: adminUser.organizationId!,
          campaignId: campaign.id,
          title: 'Intruder creative',
          content: 'Should fail',
        },
      ),
    ).toThrow(ForbiddenException);
  });
});