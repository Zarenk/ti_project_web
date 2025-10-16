import { BadRequestException } from '@nestjs/common';
import { ProvidersController } from './providers.controller';
import { ProvidersService } from './providers.service';

describe('ProvidersController multi-tenant mapping', () => {
  let controller: ProvidersController;
  let service: jest.Mocked<ProvidersService>;

  beforeEach(() => {
    service = {
      create: jest.fn(),
      checkIfExists: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      remove: jest.fn(),
      removes: jest.fn(),
    } as unknown as jest.Mocked<ProvidersService>;

    controller = new ProvidersController(service);
  });

  it('delegates creation propagating the context organizationId when present', () => {
    const dto = { name: 'Proveedor Uno' } as any;
    const req = { user: { userId: 10 } } as any;

    controller.create(dto, req, 123);

    expect(service.create).toHaveBeenCalledWith(dto, req, 123);
  });

  it('omits the organizationId when tenant context is null to preserve legacy behaviour', () => {
    const dto = { name: 'Legacy Provider' } as any;

    controller.create(dto, undefined as any, null);

    expect(service.create).toHaveBeenCalledWith(dto, undefined, undefined);
  });

  it('lists all providers when organizationId is not provided', async () => {
    const expected = [{ id: 1 }];
    service.findAll.mockReturnValue(expected as any);

    const result = controller.findAll(undefined as any);

    expect(service.findAll).toHaveBeenCalledWith();
    expect(result).toBe(expected);
  });

  it('filters providers by organization when context is available', () => {
    controller.findAll(55);

    expect(service.findAll).toHaveBeenCalledWith({ organizationId: 55 });
  });

  it('retrieves a provider using the contextual organizationId when present', () => {
    controller.findOne('42', 99);

    expect(service.findOne).toHaveBeenCalledWith(42, 99);
  });

  it('throws BadRequestException when the provider id is not numeric', () => {
    expect(() => controller.findOne('abc', null)).toThrow(BadRequestException);
    expect(service.findOne).not.toHaveBeenCalled();
  });

  it('updates a provider respecting the context organizationId', () => {
    const dto = { status: 'ACTIVE' } as any;
    const req = { headers: {} } as any;

    controller.update('7', dto, 321, req);

    expect(service.update).toHaveBeenCalledWith(7, dto, req, 321);
  });

  it('requires at least one provider in updateMany payload', async () => {
    await expect(
      controller.updateMany([], null, {} as any),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(service.updateMany).not.toHaveBeenCalled();
  });

  it('propagates tenant context when updating multiple providers', async () => {
    const payload = [{ id: 1, status: 'ACTIVE' } as any];
    const req = { user: {} } as any;

    await controller.updateMany(payload, 44, req);

    expect(service.updateMany).toHaveBeenCalledWith(payload, req, 44);
  });

  it('removes a provider within the active tenant context', () => {
    const req = { ip: '127.0.0.1' } as any;

    controller.remove('15', 88, req);

    expect(service.remove).toHaveBeenCalledWith(15, req, 88);
  });

  it('removes multiple providers reusing the tenant context', () => {
    const req = { ip: '127.0.0.1' } as any;
    const ids = [1, 2, 3];

    controller.removes(ids, 66, req);

    expect(service.removes).toHaveBeenCalledWith(ids, req, 66);
  });

  it('checks providers existence delegating to the service', async () => {
    service.checkIfExists.mockResolvedValue(true);

    await expect(controller.checkProvider('12345678901', 55)).resolves.toEqual({
      exists: true,
    });
    expect(service.checkIfExists).toHaveBeenCalledWith('12345678901', 55);
  });

  it('omits organization scoping when context is null to preserve legacy lookups', async () => {
    service.checkIfExists.mockResolvedValue(false);

    await controller.checkProvider('12345678901', null);

    expect(service.checkIfExists).toHaveBeenCalledWith('12345678901', undefined);
  });

  it('throws BadRequestException when checking providers without document number', async () => {
    await expect(controller.checkProvider('', null)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(service.checkIfExists).not.toHaveBeenCalled();
  });
});