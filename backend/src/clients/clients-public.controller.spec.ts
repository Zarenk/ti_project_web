import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ClientsPublicController } from './clients-public.controller';
import { ClientService } from './clients.service';

describe('ClientsPublicController', () => {
  it('returns guest token payload for websocket auth', async () => {
    const createGuestMock = jest.fn().mockResolvedValue({
      userId: 77,
      tokenVersion: 3,
      client: { id: 10, name: 'guest-77' },
    });
    const clientService = {
      createGuest: createGuestMock,
    } as unknown as ClientService;

    const signMock = jest.fn().mockReturnValue('guest.jwt.token');
    const jwtService = {
      sign: signMock,
    } as unknown as JwtService;

    const configService = {
      get: jest.fn().mockReturnValue('test-secret'),
    } as unknown as ConfigService;

    const controller = new ClientsPublicController(
      clientService,
      jwtService,
      configService,
    );

    const result = await controller.createGuest(5, 9);

    expect(createGuestMock).toHaveBeenCalledWith(5, 9);
    expect(signMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 77,
        role: 'GUEST',
        tokenVersion: 3,
        defaultOrganizationId: 5,
        defaultCompanyId: 9,
      }),
      expect.objectContaining({
        secret: 'test-secret',
        expiresIn: '24h',
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        userId: 77,
        guestToken: 'guest.jwt.token',
        guestTokenExpiresInSeconds: 86400,
      }),
    );
  });
});
