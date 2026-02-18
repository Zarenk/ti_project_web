import { Module, MiddlewareConsumer, NestModule, RequestMethod, forwardRef } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './JwtStrategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ConfigService } from '@nestjs/config';
import { SimpleCookieMiddleware } from './simple-cookie.middleware';
import { RateLimitMiddleware } from 'src/common/middleware/rate-limit.middleware';
import { ActivityModule } from 'src/activity/activity.module';
import { GlobalSuperAdminGuard } from 'src/tenancy/global-super-admin.guard';
import { TenancyModule } from 'src/tenancy/tenancy.module';
import { ContextEventsGateway } from './context-events.gateway';
import { ContextMetricsService } from './context-metrics.service';
import { ContextThrottleService } from './context-throttle.service';
import { ContextPrometheusService } from './context-prometheus.service';
import { SubscriptionQuotaService } from 'src/subscriptions/subscription-quota.service';
import { ContextMetricsController } from './context-metrics.controller';

@Module({
  imports: [
    ActivityModule,
    forwardRef(() => TenancyModule),
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'), // Obtén la clave secreta del archivo .env
        signOptions: { expiresIn: '2h' },
      }),
    }),
  ],
  controllers: [UsersController, ContextMetricsController],
  providers: [
    UsersService,
    PrismaService,
    JwtStrategy,
    JwtAuthGuard,
    GlobalSuperAdminGuard,
    ContextMetricsService,
    ContextThrottleService,
    ContextPrometheusService,
    ContextEventsGateway,
    SubscriptionQuotaService,
  ],
  exports: [JwtAuthGuard, ContextEventsGateway],
})
export class UsersModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SimpleCookieMiddleware).forRoutes('*');

    // Rate limiting para endpoints críticos de autenticación
    consumer
      .apply(RateLimitMiddleware)
      .forRoutes(
        { path: 'users/login', method: RequestMethod.POST },
        { path: 'users/register', method: RequestMethod.POST },
        { path: 'users/self-register', method: RequestMethod.POST },
      );
  }
}
