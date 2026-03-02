import { Module } from '@nestjs/common';
import { MLService } from './ml.service';
import { MLController } from './ml.controller';
import { MLModelsService } from './ml-models.service';
import { MLModelsController } from './ml-models.controller';

@Module({
  controllers: [MLController, MLModelsController],
  providers: [MLService, MLModelsService],
  exports: [MLModelsService],
})
export class MLModule {}
