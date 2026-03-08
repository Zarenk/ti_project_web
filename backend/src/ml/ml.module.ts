import { Module } from '@nestjs/common';
import { MLService } from './ml.service';
import { MLController } from './ml.controller';
import { MLModelsService } from './ml-models.service';
import { MLModelsController } from './ml-models.controller';
import { MLTrainingService } from './ml-training.service';

@Module({
  controllers: [MLController, MLModelsController],
  providers: [MLService, MLModelsService, MLTrainingService],
  exports: [MLModelsService],
})
export class MLModule {}
