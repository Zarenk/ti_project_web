import { ExecutionContext } from '@nestjs/common';
import { TenantContextGuard } from './tenant-context.guard';
import { TenantContextService } from './tenant-context.service';
import { TenantContext } from './tenant-context.interface';

describe('TenantContextGuard', () => {
  it('attaches the tenant context to the request', () => {
    const tenantContext: TenantContext = {
      organizationId: 42,
      companyId: 11,
      organizationUnitId: 7,
      userId: 101,
      isGlobalSuperAdmin: false,
      isOrganizationSuperAdmin: false,
      isSuperAdmin: false,
      allowedOrganizationIds: [42, 99],
      allowedCompanyIds: [11, 22],
      allowedOrganizationUnitIds: [7, 8],
    };

    const tenantContextService: Pick<TenantContextService, 'getContext'> = {
      getContext: jest.fn(() => tenantContext),
    };

    const guard = new TenantContextGuard(
      tenantContextService as unknown as TenantContextService,
    );

    const request: Record<string, unknown> = {};
    const handlerRef = () => undefined;
    class ControllerRef {}
    const executionContext: ExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => handlerRef,
      getClass: () => ControllerRef,
    } as unknown as ExecutionContext;

    const canActivate = guard.canActivate(executionContext);

    expect(canActivate).toBe(true);
    expect(request.tenantContext).toEqual(tenantContext);
    expect(tenantContextService.getContext).toHaveBeenCalledTimes(1);
  });
});
