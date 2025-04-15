import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProductsModule } from './products/products.module';
import { UsersModule } from './users/users.module';
import { CategoryModule } from './category/category.module';
import { StoresModule } from './stores/stores.module';
import { ConfigModule } from '@nestjs/config';
import { ProvidersModule } from './providers/providers.module';
import { EntriesModule } from './entries/entries.module';
import { InventoryModule } from './inventory/inventory.module';
import { MLModule } from './ml/ml.module';
import { SalesModule } from './sales/sales.module';
import { ClientsModule } from './clients/clients.module';
import { SunatModule } from './sunat/sunat.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), // Habilita el uso global de variables de entorno
    ProductsModule, UsersModule, CategoryModule, StoresModule, 
    ProvidersModule, EntriesModule, InventoryModule, MLModule, SalesModule, ClientsModule, SunatModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
