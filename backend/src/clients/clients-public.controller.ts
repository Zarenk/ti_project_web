import { Controller, Post, UseGuards } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { CurrentTenant } from 'src/tenancy/tenant-context.decorator';
import { TenantRequiredGuard } from 'src/common/guards/tenant-required.guard';
import { ClientService } from './clients.service';

@Controller('public/clients')
@UseGuards(TenantRequiredGuard)
export class ClientsPublicController {
  constructor(
    private readonly clientService: ClientService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  @Post('guest')
  @ApiOperation({ summary: 'Create guest client (public)' })
  async createGuest(
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    const guest = await this.clientService.createGuest(
      organizationId ?? undefined,
      companyId ?? undefined,
    );
    const token = this.jwtService.sign(
      {
        sub: guest.userId,
        role: 'GUEST',
        tokenVersion: guest.tokenVersion,
        defaultOrganizationId: organizationId ?? null,
        defaultCompanyId: companyId ?? null,
      },
      {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: '24h',
      },
    );

    return {
      userId: guest.userId,
      client: guest.client,
      guestToken: token,
      guestTokenExpiresInSeconds: 24 * 60 * 60,
    };
  }
}
