import { Body, Controller, Ip, Post } from '@nestjs/common';
import { PublicSignupService } from './public-signup.service';
import { PublicSignupDto } from './dto/public-signup.dto';
import { SkipTenantContextGuard } from 'src/tenancy/skip-tenant-context.decorator';
import { SkipModulePermissionsGuard } from 'src/common/decorators/skip-module-permission.decorator';

@Controller('public/signup')
@SkipTenantContextGuard()
@SkipModulePermissionsGuard()
export class PublicSignupController {
  constructor(private readonly signupService: PublicSignupService) {}

  @Post()
  signup(@Body() dto: PublicSignupDto, @Ip() ip: string) {
    return this.signupService.signup(dto, ip);
  }
}
