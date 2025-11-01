import { BadRequestException } from '@nestjs/common';
import { StoresController } from './stores.controller';
import { StoresService } from './stores.service';

describe('StoresController multi-tenant mapping', () => {
  let controller: StoresController;
  let service: jest.Mocked<StoresService>;

  beforeEach(() => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      checkIfExists: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      remove: jest.fn(),
      removes: jest.fn(),
    } as unknown as jest.Mocked<StoresService>;

    controller = new StoresController(service);
  });

  it('delegates store creation propagating the tenant organizationId', () => {
    const dto = { name: 'New Store' } as any;
    const req = { user: { userId: 10 } } as any;

    controller.create(dto, req, 42, 99);

    expect(service.create).toHaveBeenCalledWith(dto, req, 42, 99);
  });

  it('keeps legacy creation when organizationId is null', () => {
    const dto = { name: 'Legacy Store' } as any;

    controller.create(dto, undefined as any, null, null);

    expect(service.create).toHaveBeenCalledWith(dto, undefined, null, null);
  });

  it('lists stores filtering by tenant when organizationId is provided', () => {
    controller.findAll(15, 7);

    expect(service.findAll).toHaveBeenCalledWith(15, 7);
  });

  it('lists all stores when organizationId is undefined', () => {
    controller.findAll(undefined as any, undefined as any);

    expect(service.findAll).toHaveBeenCalledWith(undefined, undefined);
  });

  it('retrieves a store using the tenant organizationId when provided', () => {
    controller.findOne('25', 77, 91);

    expect(service.findOne).toHaveBeenCalledWith(25, 77, 91);
  });

  it('throws BadRequestException when the store id is not numeric', () => {
    expect(() => controller.findOne('abc', 77, 91)).toThrow(
      BadRequestException,
    );
    expect(service.findOne).not.toHaveBeenCalled();
  });

  it('checks store existence using the tenant organizationId', async () => {
    service.checkIfExists.mockResolvedValue(true);

    await expect(controller.checkStore('Main Store', 31, 55)).resolves.toEqual({
      exists: true,
    });
    expect(service.checkIfExists).toHaveBeenCalledWith('Main Store', 31, 55);
  });

  it('throws BadRequestException when checking stores without name', async () => {
    await expect(controller.checkStore('', null, null)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(service.checkIfExists).not.toHaveBeenCalled();
  });

  it('updates a store propagating the tenant organizationId', () => {
    const dto = { id: 7, name: 'Updated Store' } as any;
    const req = { user: {} } as any;

    controller.update('7', dto, req, 88, 12);

    expect(service.update).toHaveBeenCalledWith(7, dto, req, 88, 12);
  });

  it('requires at least one store when updating many', async () => {
    await expect(
      controller.updateMany([], {} as any, 55, 10),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(service.updateMany).not.toHaveBeenCalled();
  });

  it('updates multiple stores reusing the tenant context', async () => {
    const payload = [{ id: 1, name: 'Store A' } as any];
    const req = { user: {} } as any;

    await controller.updateMany(payload, req, 66, 9);

    expect(service.updateMany).toHaveBeenCalledWith(payload, req, 66, 9);
  });

  it('removes a store respecting the tenant context', () => {
    const req = { ip: '127.0.0.1' } as any;

    controller.remove('5', req, 33, 4);

    expect(service.remove).toHaveBeenCalledWith(5, req, 33, 4);
  });

  it('removes multiple stores preserving the tenant context', async () => {
    const req = { ip: '127.0.0.1' } as any;
    const ids = [1, 2, 3];

    await controller.removes(ids, req, null, null);

    expect(service.removes).toHaveBeenCalledWith(ids, req, null, null);
  });
});
