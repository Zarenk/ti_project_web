import { TenantContextService } from './tenant-context.service';
import { Request } from 'express';

describe('TenantContextService', () => {
  const createService = (requestOverrides: Partial<Request> & { user?: any } = {}) => {
    const request = {
      headers: {},
      user: {},
      ...requestOverrides,
    } as Request;

    return new TenantContextService(request);
  };

  it('prioritizes the x-org-id header when resolving the organizationId', () => {
    const service = createService({
      headers: { 'x-org-id': '123', authorization: 'Bearer token' },
      user: {
        id: '42',
        defaultOrganizationId: '456',
        organizations: ['789'],
      },
    });

    expect(service.getContext()).toEqual({
      organizationId: 123,
      organizationUnitId: null,
      userId: 42,
      isSuperAdmin: false,
      allowedOrganizationIds: [789],
    });
  });

  it('falls back to the default organization when header is absent', () => {
    const service = createService({
      headers: {},
      user: {
        id: 99,
        defaultOrganizationId: '654',
        organizations: ['321', 'not-a-number'],
      },
    });

    expect(service.getContext()).toEqual({
      organizationId: 654,
      organizationUnitId: null,
      userId: 99,
      isSuperAdmin: false,
      allowedOrganizationIds: [321],
    });
  });

  it('uses the first allowed organization when neither header nor default are set', () => {
    const service = createService({
      user: {
        organizations: ['888', '777'],
      },
    });

    expect(service.getContext()).toEqual({
      organizationId: 888,
      organizationUnitId: null,
      userId: null,
      isSuperAdmin: false,
      allowedOrganizationIds: [888, 777],
    });
  });

  it('marks the context as super admin when role or flag indicate it', () => {
    const headerAsArrayService = createService({
      headers: { 'x-org-id': ['501', '502'] as unknown as any },
      user: {
        id: '1',
        role: 'SUPER_ADMIN',
      },
    });

    expect(headerAsArrayService.getContext()).toEqual({
      organizationId: 501,
      organizationUnitId: null,
      userId: 1,
      isSuperAdmin: true,
      allowedOrganizationIds: [],
    });

    const explicitFlagService = createService({
      user: {
        isSuperAdmin: true,
      },
    });

    expect(explicitFlagService.getContext().isSuperAdmin).toBe(true);
  });

  it('allows updating parts of the context while preserving allowed organizations by default', () => {
    const service = createService({
      user: {
        id: 10,
        organizations: ['100', '200'],
      },
    });

    service.updateContext({ organizationId: 999 });

    expect(service.getContext()).toEqual({
      organizationId: 999,
      organizationUnitId: null,
      userId: 10,
      isSuperAdmin: false,
      allowedOrganizationIds: [100, 200],
    });

    service.updateContext({ allowedOrganizationIds: [400], organizationUnitId: 55 });

    expect(service.getContext()).toEqual({
      organizationId: 999,
      organizationUnitId: 55,
      userId: 10,
      isSuperAdmin: false,
      allowedOrganizationIds: [400],
    });
  });
});