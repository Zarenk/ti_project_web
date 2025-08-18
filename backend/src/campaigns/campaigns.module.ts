import { Module, MiddlewareConsumer, NestModule, RequestMethod } from '@nestjs/common';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';
import { RateLimitMiddleware } from 'src/common/middleware/rate-limit.middleware';

@Module({
  controllers: [CampaignsController],
  providers: [CampaignsService],
})
export class CampaignsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RateLimitMiddleware)
      .forRoutes(
        { path: 'campaigns', method: RequestMethod.POST },
        { path: 'campaigns/:id/schedule', method: RequestMethod.POST },
      );
  }
}