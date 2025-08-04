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
import { SeriesModule } from './series/series.module';
import { ExchangeModule } from './exchange/exchange.module';
import { PaymentmethodsModule } from './paymentmethods/paymentmethods.module';
import { CashregisterModule } from './cashregister/cashregister.module';
import { BarcodeGateway } from './barcode/barcode.gateway';
import { GuideModule } from './guide/guide.module';
import { ProductspecsModule } from './productspecs/productspecs.module';
import { ProductofeaturesModule } from './productofeatures/productofeatures.module';
import { ReviewsModule } from './reviews/reviews.module';
import { WebsalesModule } from './websales/websales.module';
import { ContactModule } from './contact/contact.module';
import { ChatModule } from './chat/chat.module';
import { FavoritesModule } from './favorites/favorites.module';
import { NewsletterModule } from './newsletter/newsletter.module';
import { OrdertrackingModule } from './ordertracking/ordertracking.module';
import { CatalogexportModule } from './catalogexport/catalogexport.module';
import { CatalogExportController } from './routes/catalogExport';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), // Habilita el uso global de variables de entorno
    ProductsModule, UsersModule, CategoryModule, StoresModule, 
    ProvidersModule, EntriesModule, InventoryModule, MLModule, SalesModule, ClientsModule, SunatModule, SeriesModule, ExchangeModule, PaymentmethodsModule, CashregisterModule, GuideModule, ProductspecsModule, ProductofeaturesModule, ReviewsModule, WebsalesModule, ContactModule, ChatModule, FavoritesModule, NewsletterModule, OrdertrackingModule, CatalogexportModule],
  controllers: [AppController, CatalogExportController],
  providers: [AppService, BarcodeGateway],
})
export class AppModule {}
