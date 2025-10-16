import { BadRequestException } from '@nestjs/common';
import { CashregisterController } from './cashregister.controller';
import { CashregisterService } from './cashregister.service';

describe('CashregisterController (multi-organization)', () => {
  let controller: CashregisterController;
  let serviceMock: {
    create: jest.Mock;
    findAll: jest.Mock;
    createTransaction: jest.Mock;
    findOne: jest.Mock;
    remove: jest.Mock;
  } & Partial<CashregisterService>;

  beforeEach(() => {
    serviceMock = {
      create: jest.fn(),
      findAll: jest.fn(),
      createTransaction: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    } as any;

    controller = new CashregisterController(serviceMock as unknown as CashregisterService);
  });

  it('propagates tenant organizationId on create when DTO omits it', async () => {
    serviceMock.create.mockResolvedValue({ id: 1 });

    const dto = {
      name: 'Principal',
      storeId: 10,
      initialBalance: 100,
    } as any;

    await controller.create(dto, 7);

    expect(serviceMock.create).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: 7 }),
    );
  });

  it('throws when create DTO organizationId conflicts with tenant context', async () => {
    const dto = {
      name: 'Principal',
      storeId: 10,
      initialBalance: 100,
      organizationId: 3,
    } as any;

    await expect(controller.create(dto, 5)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('uses tenant context when listing without explicit query filter', async () => {
    serviceMock.findAll.mockResolvedValue([]);

    await controller.findAll(undefined, 11);

    expect(serviceMock.findAll).toHaveBeenCalledWith({ organizationId: 11 });
  });

  it('throws when query organizationId mismatches tenant context', async () => {
    await expect(controller.findAll('null', 4)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows explicit query organizationId when tenant context is null', async () => {
    serviceMock.findAll.mockResolvedValue([]);

    await controller.findAll('42', null);

    expect(serviceMock.findAll).toHaveBeenCalledWith({ organizationId: 42 });
  });

  it('propagates tenant organization to transaction creation by default', async () => {
    serviceMock.createTransaction.mockResolvedValue({ id: 9 });

    const dto = {
      type: 'INCOME',
      amount: 50,
      cashRegisterId: 1,
      userId: 2,
      paymentMethods: [{ method: 'Cash', amount: 50 }],
    } as any;

    await controller.createTransaction(dto, 3);

    expect(serviceMock.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: 3 }),
    );
  });

  it('passes merged organizationId to findOne', async () => {
    serviceMock.findOne.mockResolvedValue({ id: 99 });

    await controller.findOne(99, undefined, 15);

    expect(serviceMock.findOne).toHaveBeenCalledWith(99, { organizationId: 15 });
  });

  it('delegates remove with tenant organizationId when query omitted', async () => {
    serviceMock.remove.mockResolvedValue({ id: 5 });

    await controller.remove(5, undefined, 12);

    expect(serviceMock.remove).toHaveBeenCalledWith(5, { organizationId: 12 });
  });
  
});