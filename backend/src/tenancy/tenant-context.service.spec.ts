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
      allowedOrganizationUnitIds: [],
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
      allowedOrganizationUnitIds: [],
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
      allowedOrganizationUnitIds: [],
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
      allowedOrganizationUnitIds: [],
    });

    const explicitFlagService = createService({
      user: {
        isSuperAdmin: true,
      },
    });

    expect(explicitFlagService.getContext().isSuperAdmin).toBe(true);
  });

  it('prioritizes the x-org-unit-id header when resolving organizationUnitId', () => {
    const service = createService({
      headers: { 'x-org-unit-id': '33' },
      user: {
        defaultOrganizationUnitId: '44',
        organizationUnits: ['55', 'not-a-number'],
      },
    });

    expect(service.getContext()).toMatchObject({
      organizationUnitId: 33,
      allowedOrganizationUnitIds: [55],
    });
  });

  it('falls back to the default organization unit and allowed list when no header is provided', () => {
    const serviceWithDefault = createService({
      user: {
        defaultOrganizationUnitId: '101',
        organizationUnitIds: ['202', '303'],
      },
    });

    expect(serviceWithDefault.getContext()).toMatchObject({
      organizationUnitId: 101,
      allowedOrganizationUnitIds: [202, 303],
    });

    const serviceWithAllowedList = createService({
      user: {
        organizationUnits: ['707', '808'],
      },
    });

    expect(serviceWithAllowedList.getContext()).toMatchObject({
      organizationUnitId: 707,
      allowedOrganizationUnitIds: [707, 808],
    });
  });

  it('allows updating parts of the context while preserving allowed organizations by default', () => {
    const service = createService({
      user: {
        id: 10,
        organizations: ['100', '200'],
        organizationUnits: ['30', '40'],
      },
    });

    service.updateContext({ organizationId: 999 });

    expect(service.getContext()).toEqual({
      organizationId: 999,
      organizationUnitId: 30,
      userId: 10,
      isSuperAdmin: false,
      allowedOrganizationIds: [100, 200],
      allowedOrganizationUnitIds: [30, 40],
    });

    service.updateContext({
      allowedOrganizationIds: [400],
      allowedOrganizationUnitIds: [60],
      organizationUnitId: 55,
    });

    expect(service.getContext()).toEqual({
      organizationId: 999,
      organizationUnitId: 55,
      userId: 10,
      isSuperAdmin: false,
      allowedOrganizationIds: [400],
      allowedOrganizationUnitIds: [60],
    });
  });
});