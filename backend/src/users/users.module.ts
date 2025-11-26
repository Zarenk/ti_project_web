import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './JwtStrategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ConfigService } from '@nestjs/config';
import { SimpleCookieMiddleware } from './simple-cookie.middleware';
import { ActivityModule } from 'src/activity/activity.module';
import { GlobalSuperAdminGuard } from 'src/tenancy/global-super-admin.guard';
import { TenancyModule } from 'src/tenancy/tenancy.module';
import { ContextEventsGateway } from './context-events.gateway';
import { ContextMetricsService } from './context-metrics.service';
import { ContextThrottleService } from './context-throttle.service';
import { ContextPrometheusService } from './context-prometheus.service';
import { ContextMetricsController } from './context-metrics.controller';

@Module({
  imports: [
    ActivityModule,
    TenancyModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'), // Obtén la clave secreta del archivo .env
        signOptions: { expiresIn: '1h' },
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
  ],
  exports: [JwtAuthGuard],
})
export class UsersModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SimpleCookieMiddleware).forRoutes('*');
  }
}
