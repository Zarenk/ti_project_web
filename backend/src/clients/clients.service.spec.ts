jest.mock('crypto', () => ({
  randomUUID: jest.fn(),
}));

import { ClientService } from './clients.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { randomUUID } from 'crypto';

describe('ClientService multi-organization support', () => {
  let service: ClientService;
  let prisma: {
    user: {
      create: jest.Mock;
      delete: jest.Mock;
    };
    client: {
      create: jest.Mock;
      findUnique: jest.Mock;
    };
  };
  let randomUUIDMock: jest.Mock;

  beforeEach(() => {
    prisma = {
      user: {
        create: jest.fn(),
        delete: jest.fn(),
      },
      client: {
        create: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    service = new ClientService(prisma as unknown as PrismaService);
    randomUUIDMock = randomUUID as unknown as jest.Mock;
    randomUUIDMock.mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('propagates organizationId when creating a generic user for a new client', async () => {
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1700000000000);
    prisma.user.create.mockResolvedValue({ id: 44 });
    prisma.client.create.mockResolvedValue({ id: 91 });

    await service.create({
      name: 'Acme',
      type: 'RUC',
      typeNumber: '123456789',
      organizationId: 77,
    });

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ organizationId: 77 }),
      }),
    );
    expect(prisma.client.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ organizationId: 77 }),
      }),
    );

    nowSpy.mockRestore();
  });

  it('defaults organizationId to null when creating a client without organization context', async () => {
    prisma.client.create.mockResolvedValue({ id: 92 });

    await service.create({
      name: 'Acme',
      type: 'RUC',
      typeNumber: '123456789',
      userId: 15,
    });

    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(prisma.client.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ organizationId: null }),
      }),
    );
  });

  it('propagates organizationId when creating guests', async () => {
    randomUUIDMock.mockReturnValue('12345678-1234-1234-1234-123456789abc');
    prisma.user.create.mockResolvedValue({ id: 55 });
    prisma.client.create.mockResolvedValue({
      id: 10,
      name: '12345678-1234-1234-1234-123456789abc',
    });

    await service.createGuest(321);

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ organizationId: 321 }),
      }),
    );
    expect(prisma.client.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ organizationId: 321 }),
      }),
    );

    randomUUIDMock.mockReset();
  });

  it('creates guests with a null organizationId when none is provided', async () => {
    randomUUIDMock.mockReturnValue('12345678-1234-1234-1234-123456789abc');
    prisma.user.create.mockResolvedValue({ id: 56 });
    prisma.client.create.mockResolvedValue({
      id: 11,
      name: '12345678-1234-1234-1234-123456789abc',
    });

    await service.createGuest();

    expect(prisma.client.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ organizationId: null }),
      }),
    );

    randomUUIDMock.mockReset();
  });

  it('assigns organizationId for each client created during verification', async () => {
    prisma.client.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    prisma.client.create
      .mockResolvedValueOnce({ id: 1 })
      .mockResolvedValueOnce({ id: 2 });

    await service.verifyOrCreateClients([
      {
        name: 'First',
        type: 'DOC',
        typeNumber: '111',
        idUser: 1,
        organizationId: 400,
      },
      {
        name: 'Second',
        type: 'DOC',
        typeNumber: '222',
        idUser: 2,
      },
    ]);

    expect(prisma.client.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({ organizationId: 400 }),
      }),
    );
    expect(prisma.client.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({ organizationId: null }),
      }),
    );
  });

  it('propagates organizationId during self registration', async () => {
    prisma.client.findUnique.mockResolvedValue(null);
    prisma.client.create.mockResolvedValue({ id: 90 });

    await service.selfRegister({
      name: 'Self',
      userId: 123,
      organizationId: 654,
    });

    expect(prisma.client.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ organizationId: 654 }),
      }),
    );
  });

  it('defaults organizationId to null during self registration when not provided', async () => {
    prisma.client.findUnique.mockResolvedValue(null);
    prisma.client.create.mockResolvedValue({ id: 91 });

    await service.selfRegister({
      name: 'Self',
      userId: 124,
    });

    expect(prisma.client.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ organizationId: null }),
      }),
    );
  });
});