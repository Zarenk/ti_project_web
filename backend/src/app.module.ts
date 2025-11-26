import { Module } from '@nestjs/common';
import { DefaultAdminService } from './users/default-admin.service';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProductsModule } from './products/products.module';
import { UsersModule } from './users/users.module';
import { CategoryModule } from './category/category.module';
import { StoresModule } from './stores/stores.module';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
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
import { CatalogCoverController } from './routes/catalogCover';
import { PrismaService } from './prisma/prisma.service';
import { BrandsModule } from './brands/brands.module';
import { ActivityModule } from './activity/activity.module';
import { AuthModule } from './auth/auth.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { AdsModule } from './ads/ads.module';
import { PublishModule } from './publish/publish.module';
import { MetricsModule } from './metrics/metrics.module';
import { AccountingModule } from './accounting/accounting.module';
import { JournalsModule } from './journals/journals.module';
import { AccReportsModule } from './acc-reports/acc-reports.module';
import { KeywordsModule } from './keywords/keywords.module';
import { SiteSettingsModule } from './site-settings/site-settings.module';
import { ModulePermissionsGuard } from './common/guards/module-permissions.guard';
import { SystemMaintenanceModule } from './system-maintenance/system-maintenance.module';
import { TenancyModule } from './tenancy/tenancy.module';
import { TenantContextGuard } from './tenancy/tenant-context.guard';
import { LookupsModule } from './lookups/lookups.module';
import { InvoiceTemplatesModule } from './invoice-templates/invoice-templates.module';
import { InvoiceExtractionModule } from './invoice-extraction/invoice-extraction.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { PublicSignupModule } from './public-signup/public-signup.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), // Habilita el uso global de variables de entorno
    ScheduleModule.forRoot(),
    ProductsModule,
    UsersModule,
    CategoryModule,
    StoresModule,
    ProvidersModule,
    EntriesModule,
    InventoryModule,
    MLModule,
    SalesModule,
    ClientsModule,
    SunatModule,
    SeriesModule,
    ExchangeModule,
    PaymentmethodsModule,
    CashregisterModule,
    GuideModule,
    ProductspecsModule,
    ProductofeaturesModule,
    ReviewsModule,
    WebsalesModule,
    ContactModule,
    ChatModule,
    FavoritesModule,
    NewsletterModule,
    OrdertrackingModule,
    CatalogexportModule,
    BrandsModule,
    ActivityModule,
    AuthModule,
    CampaignsModule,
    AdsModule,
    PublishModule,
    MetricsModule,
    AccountingModule,
    JournalsModule,
    AccReportsModule,
    KeywordsModule,
    SiteSettingsModule,
    SystemMaintenanceModule,
    TenancyModule,
    LookupsModule,
    InvoiceTemplatesModule,
    InvoiceExtractionModule,
    SubscriptionsModule,
    PublicSignupModule,
  ],
  controllers: [AppController, CatalogExportController, CatalogCoverController],
  providers: [
    AppService,
    BarcodeGateway,
    PrismaService,
    {
      provide: APP_GUARD,
      useClass: TenantContextGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ModulePermissionsGuard,
    },
    DefaultAdminService,
  ],
})
export class AppModule {}
