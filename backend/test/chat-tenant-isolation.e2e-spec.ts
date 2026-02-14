import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { Socket } from 'socket.io';
import { Server } from 'socket.io';
import { ActivityService } from '../src/activity/activity.service';
import { ChatGateway } from '../src/chat/chat.gateway';
import { ChatModule } from '../src/chat/chat.module';
import { PrismaService } from '../src/prisma/prisma.service';

type SocketClientMock = {
  id: string;
  data: Record<string, unknown>;
  handshake: {
    address: string;
    auth?: Record<string, unknown>;
    headers?: Record<string, unknown>;
  };
  join: jest.Mock<Promise<void>, [string]>;
  emit: jest.Mock<void, [string, unknown?]>;
  disconnect: jest.Mock<void, [boolean?]>;
};

type RoomEmitRecord = {
  room: string;
  event: string;
  payload: unknown;
};

const createClient = (
  id: string,
  auth: Record<string, unknown>,
): SocketClientMock => ({
  id,
  data: {},
  handshake: {
    address: '127.0.0.1',
    auth,
    headers: {},
  },
  join: jest.fn<Promise<void>, [string]>().mockResolvedValue(undefined),
  emit: jest.fn<void, [string, unknown?]>(),
  disconnect: jest.fn<void, [boolean?]>(),
});

describe('Chat tenant isolation (e2e)', () => {
  let app: INestApplication;
  let gateway: ChatGateway;

  const roomEmits: RoomEmitRecord[] = [];

  const prismaStub = {
    user: {
      findUnique: jest.fn(({ where: { id } }: { where: { id: number } }) => {
        if (id === 100) {
          return {
            id: 100,
            tokenVersion: 1,
            role: 'ADMIN',
            organizationId: 1,
            lastOrgId: 1,
            lastCompanyId: 10,
          };
        }
        if (id === 200) {
          return {
            id: 200,
            tokenVersion: 1,
            role: 'ADMIN',
            organizationId: 2,
            lastOrgId: 2,
            lastCompanyId: 20,
          };
        }
        return null;
      }),
    },
    organizationMembership: {
      findMany: jest.fn(
        ({ where: { userId } }: { where: { userId: number } }) => {
          if (userId === 100) return [{ organizationId: 1 }];
          if (userId === 200) return [{ organizationId: 2 }];
          return [];
        },
      ),
    },
    company: {
      findUnique: jest.fn(({ where: { id } }: { where: { id: number } }) => {
        if (id === 10) return { id: 10, organizationId: 1 };
        if (id === 20) return { id: 20, organizationId: 2 };
        return null;
      }),
    },
    client: {
      findUnique: jest.fn(
        ({ where: { userId } }: { where: { userId: number } }) => {
          if (userId === 900) {
            return { id: 501, organizationId: 1, companyId: 10 };
          }
          if (userId === 901) {
            return { id: 502, organizationId: 2, companyId: 20 };
          }
          return null;
        },
      ),
      findMany: jest.fn(() => []),
    },
    chatMessage: {
      create: jest.fn(
        ({
          data,
        }: {
          data: {
            clientId: number;
            senderId: number;
            text: string;
            file?: string;
          };
        }) => ({
          id: Date.now(),
          clientId: data.clientId,
          senderId: data.senderId,
          text: data.text,
          file: data.file ?? null,
          createdAt: new Date(),
          seenAt: null,
          deletedAt: null,
        }),
      ),
      findMany: jest.fn(() => []),
      findUnique: jest.fn(() => null),
      update: jest.fn(),
      updateMany: jest.fn(() => ({ count: 1 })),
    },
  };

  const jwtStub = {
    verifyAsync: jest.fn((token: string) => {
      if (token === 'token-org1') {
        return {
          sub: 100,
          role: 'ADMIN',
          tokenVersion: 1,
          defaultOrganizationId: 1,
          defaultCompanyId: 10,
        };
      }
      if (token === 'token-org2') {
        return {
          sub: 200,
          role: 'ADMIN',
          tokenVersion: 1,
          defaultOrganizationId: 2,
          defaultCompanyId: 20,
        };
      }
      throw new Error('invalid token');
    }),
  };

  const configStub = {
    get: jest.fn((key: string) =>
      key === 'JWT_SECRET' ? 'test-secret' : null,
    ),
  };

  const activityStub = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ChatModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaStub)
      .overrideProvider(JwtService)
      .useValue(jwtStub)
      .overrideProvider(ConfigService)
      .useValue(configStub)
      .overrideProvider(ActivityService)
      .useValue(activityStub)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    gateway = app.get(ChatGateway);
    gateway.server = {
      to: (room: string) => ({
        emit: (event: string, payload: unknown) => {
          roomEmits.push({ room, event, payload });
        },
      }),
    } as unknown as Server;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    roomEmits.length = 0;
    jest.clearAllMocks();
  });

  it('emits only to origin tenant room and blocks cross-tenant targets', async () => {
    const org1Socket = createClient('sock-org1', {
      token: 'token-org1',
      orgId: 1,
      companyId: 10,
    });
    const org2Socket = createClient('sock-org2', {
      token: 'token-org2',
      orgId: 2,
      companyId: 20,
    });

    await gateway.handleConnection(org1Socket as unknown as Socket);
    await gateway.handleConnection(org2Socket as unknown as Socket);

    await gateway.handleMessage(
      { clientId: 900, senderId: 9999, text: 'hola org1', tempId: 77 },
      org1Socket as unknown as Socket,
    );

    expect(
      roomEmits.some(
        (record) =>
          record.room === 'chat:org:1:company:10:client:900' &&
          record.event === 'chat:receive',
      ),
    ).toBe(true);
    expect(
      roomEmits.some((record) => record.room.includes('chat:org:2:company:20')),
    ).toBe(false);

    roomEmits.length = 0;

    await gateway.handleMessage(
      { clientId: 901, senderId: 100, text: 'cross attempt' },
      org1Socket as unknown as Socket,
    );

    expect(roomEmits).toHaveLength(0);
    expect(org1Socket.emit).toHaveBeenCalledWith(
      'chat:error',
      expect.anything(),
    );
  });

  it('uses authenticated user id for seen and ignores spoofed viewerId', async () => {
    const org1Socket = createClient('sock-org1', {
      token: 'token-org1',
      orgId: 1,
      companyId: 10,
    });
    await gateway.handleConnection(org1Socket as unknown as Socket);

    await gateway.handleSeen(
      { clientId: 900, viewerId: 55555 },
      org1Socket as unknown as Socket,
    );

    const seenEmit = roomEmits.find((record) => record.event === 'chat:seen');
    expect(seenEmit?.room).toBe('chat:org:1:company:10:client:900');
    expect(seenEmit?.payload).toEqual(
      expect.objectContaining({ viewerId: 100 }),
    );
  });
});
