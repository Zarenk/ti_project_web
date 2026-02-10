import { Module, MiddlewareConsumer, NestModule, RequestMethod } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { RateLimitMiddleware } from 'src/common/middleware/rate-limit.middleware';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, PrismaService],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Rate limiting para endpoint de refresh token
    consumer
      .apply(RateLimitMiddleware)
      .forRoutes({ path: 'auth/refresh', method: RequestMethod.POST });
  }
}
