import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ChatMessage } from '@prisma/client';
import { Request } from 'express';
import { ActivityService } from 'src/activity/activity.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { TenantContext } from 'src/tenancy/tenant-context.interface';
import { ChatService } from './chat.service';

type PrismaMock = {
  client: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
  };
  chatMessage: {
    create: jest.Mock;
    findMany: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
  };
  user: {
    findUnique: jest.Mock;
  };
};

const createPrismaMock = (): PrismaMock =>
  ({
    client: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    chatMessage: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  }) as PrismaMock;

const createActivityMock = () =>
  ({
    log: jest.fn().mockResolvedValue(undefined),
  }) as unknown as ActivityService;

const makeTenant = (overrides: Partial<TenantContext> = {}): TenantContext => ({
  organizationId: 1,
  companyId: 10,
  organizationUnitId: null,
  userId: 99,
  isGlobalSuperAdmin: false,
  isOrganizationSuperAdmin: false,
  isSuperAdmin: false,
  allowedOrganizationIds: [1],
  allowedCompanyIds: [10],
  allowedOrganizationUnitIds: [],
  ...overrides,
});

describe('ChatService tenant isolation', () => {
  let service: ChatService;
  let prisma: PrismaMock;
  let activity: ActivityService;

  beforeEach(() => {
    prisma = createPrismaMock();
    activity = createActivityMock();
    service = new ChatService(prisma as unknown as PrismaService, activity);
  });

  it('blocks getMessages when client is outside tenant company', async () => {
    prisma.client.findUnique.mockResolvedValue({
      id: 1,
      organizationId: 1,
      companyId: 22,
    });

    await expect(service.getMessages(500, makeTenant())).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.chatMessage.findMany).not.toHaveBeenCalled();
  });

  it('returns messages when tenant has access to client', async () => {
    prisma.client.findUnique.mockResolvedValue({
      id: 1,
      organizationId: 1,
      companyId: 10,
    });
    const rows: ChatMessage[] = [
      {
        id: 1,
        clientId: 500,
        senderId: 99,
        text: 'hola',
        file: null,
        createdAt: new Date(),
        seenAt: null,
        deletedAt: null,
      },
    ] as ChatMessage[];
    prisma.chatMessage.findMany.mockResolvedValue(rows);

    const result = await service.getMessages(500, makeTenant());
    expect(result).toEqual(rows);
    expect(prisma.chatMessage.findMany).toHaveBeenCalledWith({
      where: { clientId: 500, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
  });

  it('blocks updateMessage when message belongs to client outside tenant', async () => {
    prisma.chatMessage.findUnique.mockResolvedValue({
      id: 9,
      clientId: 700,
      senderId: 99,
      text: 'draft',
      createdAt: new Date(),
      deletedAt: null,
    });
    prisma.client.findUnique.mockResolvedValue({
      id: 2,
      organizationId: 2,
      companyId: 33,
    });

    await expect(
      service.updateMessage(
        { id: 9, senderId: 99, text: 'editado' },
        {} as Request,
        makeTenant(),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.chatMessage.update).not.toHaveBeenCalled();
  });

  it('blocks deleteMessage when message does not exist', async () => {
    prisma.chatMessage.findUnique.mockResolvedValue(null);

    await expect(
      service.deleteMessage(
        { id: 123, senderId: 99 },
        {} as Request,
        makeTenant(),
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
