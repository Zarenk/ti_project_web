jest.mock('src/tenancy/organization-context.logger', () => ({
  logOrganizationContext: jest.fn(),
}));

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

import { UsersService } from './users.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ActivityService } from 'src/activity/activity.service';
import { JwtService } from '@nestjs/jwt';
import { logOrganizationContext } from 'src/tenancy/organization-context.logger';
import * as bcrypt from 'bcrypt';

type UsersPrismaMock = {
  user: {
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  client: {
    create: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
  };
};

describe('UsersService multi-organization support', () => {
  let prisma: UsersPrismaMock;
  let activityService: { log: jest.Mock };
  let jwtService: { sign: jest.Mock };
  let service: UsersService;
  let logOrganizationContextMock: jest.Mock;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      client: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    activityService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    jwtService = {
      sign: jest.fn(),
    };

    service = new UsersService(
      prisma as unknown as PrismaService,
      jwtService as unknown as JwtService,
      activityService as unknown as ActivityService,
    );

    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    logOrganizationContextMock = logOrganizationContext as unknown as jest.Mock;
    logOrganizationContextMock.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('propagates organizationId when registering a user', async () => {
    const createdUser = {
      id: 1,
      email: 'user@example.com',
      username: 'user',
      password: 'hashed-password',
      role: 'ADMIN',
      status: 'ACTIVO',
      organizationId: 44,
    };

    prisma.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    prisma.user.create.mockResolvedValue(createdUser);

    const result = await service.register({
      email: createdUser.email,
      password: 'plain-password',
      role: 'ADMIN',
      organizationId: 44,
    });

    expect(result).toBe(createdUser);
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ organizationId: 44 }),
      }),
    );
    expect(logOrganizationContextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: 'register',
        organizationId: 44,
      }),
    );
  });

  it('defaults organizationId to null when registering without tenant context', async () => {
    const createdUser = {
      id: 2,
      email: 'no-tenant@example.com',
      username: 'no-tenant',
      password: 'hashed-password',
      role: 'CLIENT',
      status: 'ACTIVO',
      organizationId: null,
    };

    prisma.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    prisma.user.create.mockResolvedValue(createdUser);

    const result = await service.register({
      email: createdUser.email,
      password: 'plain-password',
      role: 'CLIENT',
    });

    expect(result).toBe(createdUser);
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ organizationId: null }),
      }),
    );
    expect(
      logOrganizationContextMock.mock.calls.some(
        ([payload]: [{ operation: string; organizationId?: number | null }]) =>
          payload.operation === 'register' &&
          payload.organizationId === undefined,
      ),
    ).toBe(true);
  });

  it('propagates organizationId during public registrations', async () => {
    const createdUser = {
      id: 3,
      email: 'public@example.com',
      username: 'public',
      password: 'hashed-password',
      role: 'CLIENT',
      status: 'ACTIVO',
      organizationId: 55,
    };

    prisma.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    prisma.user.create.mockResolvedValue(createdUser);
    prisma.client.create.mockResolvedValue({ id: 10 });

    const result = await service.publicRegister({
      email: createdUser.email,
      password: 'plain-password',
      name: 'Public User',
      organizationId: 55,
    });

    expect(result).toBe(createdUser);
    expect(prisma.client.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ organizationId: 55 }),
      }),
    );
    expect(logOrganizationContextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: 'publicRegister.createClient',
        organizationId: 55,
      }),
    );
  });

  it('defaults organizationId to null for public registrations without tenant context', async () => {
    const createdUser = {
      id: 4,
      email: 'anonymous@example.com',
      username: 'anonymous',
      password: 'hashed-password',
      role: 'CLIENT',
      status: 'ACTIVO',
      organizationId: null,
    };

    prisma.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    prisma.user.create.mockResolvedValue(createdUser);
    prisma.client.create.mockResolvedValue({ id: 11 });

    await service.publicRegister({
      email: createdUser.email,
      password: 'plain-password',
      name: 'Anonymous User',
    });

    expect(prisma.client.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ organizationId: null }),
      }),
    );
    expect(
      logOrganizationContextMock.mock.calls.some(
        ([payload]: [{ operation: string; organizationId?: number | null }]) =>
          payload.operation === 'publicRegister.createClient' &&
          payload.organizationId === undefined,
      ),
    ).toBe(true);
  });

  it('propagates organizationId when syncing profile updates with existing client', async () => {
    const updateSpy = jest.spyOn(service, 'update').mockResolvedValue({
      id: 5,
      email: 'profile@example.com',
      username: 'profile',
      organizationId: 91,
    } as any);

    prisma.client.findUnique.mockResolvedValue({ id: 7 });
    prisma.client.update.mockResolvedValue({ id: 7 });

    const result = await service.updateProfile(5, {
      organizationId: 91,
      phone: '555-0101',
    });

    expect(result).toEqual(
      expect.objectContaining({
        organizationId: 91,
        email: 'profile@example.com',
      }),
    );
    expect(updateSpy).toHaveBeenCalledWith(5, { organizationId: 91 });
    expect(prisma.client.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: 91,
          phone: '555-0101',
        }),
      }),
    );
    expect(logOrganizationContextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: 'updateProfile.syncClient',
        organizationId: 91,
      }),
    );
  });

  it('defaults organizationId to null when creating client during profile sync', async () => {
    const updateSpy = jest.spyOn(service, 'update').mockResolvedValue({
      id: 6,
      email: 'newclient@example.com',
      username: 'newclient',
      organizationId: null,
    } as any);

    prisma.client.findUnique.mockResolvedValue(null);
    prisma.client.create.mockResolvedValue({ id: 9 });

    const result = await service.updateProfile(6, {
      phone: '555-0102',
    });

    expect(result).toEqual(
      expect.objectContaining({
        organizationId: null,
        email: 'newclient@example.com',
      }),
    );
    expect(updateSpy).toHaveBeenCalledWith(6, {});
    expect(prisma.client.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 6,
          organizationId: null,
        }),
      }),
    );
    expect(logOrganizationContextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: 'updateProfile.syncClient',
        organizationId: null,
      }),
    );
  });
});
