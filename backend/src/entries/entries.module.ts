import { Module } from '@nestjs/common';
import { EntriesService } from './entries.service';
import { EntriesController } from './entries.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { CategoryModule } from 'src/category/category.module'; // Importa el módulo de categorías
import { ActivityModule } from 'src/activity/activity.module';

@Module({
  imports: [CategoryModule, ActivityModule], // Asegúrate de importar el módulo de categorías
  controllers: [EntriesController],
  providers: [EntriesService, PrismaService],
})
export class EntriesModule {}

