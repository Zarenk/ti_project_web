import { Body, Controller, Headers, Ip, Post } from '@nestjs/common';
import { PublicSignupService } from './public-signup.service';
import { PublicSignupDto } from './dto/public-signup.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { SkipTenantContextGuard } from 'src/tenancy/skip-tenant-context.decorator';
import { SkipModulePermissionsGuard } from 'src/common/decorators/skip-module-permission.decorator';

@Controller('public/signup')
@SkipTenantContextGuard()
@SkipModulePermissionsGuard()
export class PublicSignupController {
  constructor(private readonly signupService: PublicSignupService) {}

  @Post()
  signup(
    @Body() dto: PublicSignupDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.signupService.signup(dto, ip, userAgent);
  }

  @Post('verify-email')
  verify(@Body() dto: VerifyEmailDto) {
    return this.signupService.verifyEmail(dto.token);
  }

  @Post('resend-verification')
  resend(@Body() dto: ResendVerificationDto) {
    return this.signupService.resendVerification(dto.email);
  }
}
