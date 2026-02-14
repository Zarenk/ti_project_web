import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { PrismaService } from 'src/prisma/prisma.service';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';

type ChatServiceMock = {
  addMessage: jest.Mock;
  getMessages: jest.Mock;
  updateMessage: jest.Mock;
  deleteMessage: jest.Mock;
  markAsSeen: jest.Mock;
};

type PrismaMock = {
  user: { findUnique: jest.Mock };
  organizationMembership: { findMany: jest.Mock };
  company: { findUnique: jest.Mock };
};

type ClientMock = {
  id: string;
  data: Record<string, unknown>;
  handshake: {
    address: string;
    auth?: Record<string, unknown>;
    headers?: Record<string, unknown>;
  };
  emit: jest.MockedFunction<(event: string, payload?: unknown) => void>;
  join: jest.MockedFunction<(room: string) => Promise<void>>;
  disconnect: jest.MockedFunction<(close?: boolean) => void>;
};

const createChatServiceMock = (): ChatServiceMock => ({
  addMessage: jest.fn(),
  getMessages: jest.fn(),
  updateMessage: jest.fn(),
  deleteMessage: jest.fn(),
  markAsSeen: jest.fn(),
});

const createPrismaMock = (): PrismaMock => ({
  user: { findUnique: jest.fn() },
  organizationMembership: { findMany: jest.fn() },
  company: { findUnique: jest.fn() },
});

const createClientMock = (): ClientMock => ({
  id: 'sock-1',
  data: {
    chatContext: {
      userId: 99,
      organizationId: 1,
      companyId: 10,
      isGlobalSuperAdmin: false,
      allowedOrganizationIds: [1],
    },
  },
  handshake: {
    address: '127.0.0.1',
    auth: {},
    headers: {},
  },
  emit: jest.fn<void, [string, unknown?]>(),
  join: jest.fn<Promise<void>, [string]>().mockResolvedValue(undefined),
  disconnect: jest.fn<void, [boolean?]>(),
});

function getChatErrorPayload(client: ClientMock): { message?: string } | null {
  const call = client.emit.mock.calls.find(([event]) => event === 'chat:error');
  if (!call || call.length < 2) {
    return null;
  }
  const payload = call[1];
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  const rawMessage = (payload as { message?: unknown }).message;
  return {
    message: typeof rawMessage === 'string' ? rawMessage : undefined,
  };
}

describe('ChatGateway isolation', () => {
  let gateway: ChatGateway;
  let chatService: ChatServiceMock;
  let prisma: PrismaMock;
  let emitToRoom: jest.Mock;
  let toRoom: jest.Mock;

  beforeEach(() => {
    chatService = createChatServiceMock();
    prisma = createPrismaMock();
    gateway = new ChatGateway(
      chatService as unknown as ChatService,
      { verifyAsync: jest.fn() } as unknown as JwtService,
      { get: jest.fn() } as unknown as ConfigService,
      prisma as unknown as PrismaService,
    );
    emitToRoom = jest.fn();
    toRoom = jest.fn().mockReturnValue({ emit: emitToRoom });
    gateway.server = { to: toRoom } as unknown as Server;
  });

  it('handleMessage uses authenticated userId and emits only to scoped room', async () => {
    const client = createClientMock();
    chatService.addMessage.mockResolvedValue({
      id: 321,
      clientId: 88,
      senderId: 99,
      text: 'hola',
      file: null,
      createdAt: new Date(),
      deletedAt: null,
      seenAt: null,
    });

    await gateway.handleMessage(
      {
        clientId: 88,
        senderId: 7,
        text: 'payload',
        tempId: 1234,
      },
      client as unknown as Socket,
    );

    expect(chatService.addMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 88,
        senderId: 99,
      }),
      expect.any(Object),
      expect.objectContaining({
        organizationId: 1,
        companyId: 10,
        userId: 99,
      }),
    );
    expect(toRoom).toHaveBeenCalledWith('chat:org:1:company:10:client:88');
    expect(emitToRoom).toHaveBeenCalledWith(
      'chat:receive',
      expect.objectContaining({ tempId: 1234 }),
    );
  });

  it('handleSeen ignores payload viewerId and uses socket context userId', async () => {
    const client = createClientMock();

    await gateway.handleSeen(
      { clientId: 77, viewerId: 12345 },
      client as unknown as Socket,
    );

    expect(chatService.markAsSeen).toHaveBeenCalledWith(
      77,
      99,
      expect.any(Date),
      expect.objectContaining({
        organizationId: 1,
        companyId: 10,
        userId: 99,
      }),
    );
    expect(toRoom).toHaveBeenCalledWith('chat:org:1:company:10:client:77');
    expect(emitToRoom).toHaveBeenCalledWith(
      'chat:seen',
      expect.objectContaining({ viewerId: 99 }),
    );
  });

  it('handleHistory emits chat:error on invalid clientId', async () => {
    const client = createClientMock();

    await gateway.handleHistory(
      { clientId: Number.NaN },
      client as unknown as Socket,
    );

    expect(chatService.getMessages).not.toHaveBeenCalled();
    expect(client.emit).toHaveBeenCalledWith('chat:error', expect.anything());
    const payload = getChatErrorPayload(client);
    expect(typeof payload?.message).toBe('string');
  });

  it('handleMessage emits chat:error when socket context is missing', async () => {
    const client = createClientMock();
    client.data = {};

    await gateway.handleMessage(
      {
        clientId: 9,
        senderId: 1000,
        text: 'msg',
      },
      client as unknown as Socket,
    );

    expect(chatService.addMessage).not.toHaveBeenCalled();
    expect(client.emit).toHaveBeenCalledWith('chat:error', expect.anything());
    const payload = getChatErrorPayload(client);
    expect(typeof payload?.message).toBe('string');
  });
});
