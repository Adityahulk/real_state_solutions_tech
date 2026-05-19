import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/jwt-auth.guard';
import { UsersModule } from './modules/users/users.module';
import { RbacModule } from './modules/rbac/rbac.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuditInterceptor } from './modules/audit/audit.interceptor';
import { StorageModule } from './modules/storage/storage.module';
import { QueueModule } from './modules/queue/queue.module';
import { CadModule } from './modules/cad/cad.module';
import { SitesModule } from './modules/sites/sites.module';
import { PlotsModule } from './modules/plots/plots.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { AllotmentsModule } from './modules/allotments/allotments.module';
import { TransfersModule } from './modules/transfers/transfers.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { EsignModule } from './modules/esign/esign.module';
import { KycModule } from './modules/kyc/kyc.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { VendorsModule } from './modules/vendors/vendors.module';
import { DevelopmentModule } from './modules/development/development.module';
import { ProgressModule } from './modules/progress/progress.module';
import { IssuesModule } from './modules/issues/issues.module';
import { PlotConstructionModule } from './modules/plot-construction/plot-construction.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { MarketingModule } from './modules/marketing/marketing.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AbilityModule } from './common/casl/ability.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    StorageModule,
    QueueModule,
    AbilityModule,
    NotificationsModule,
    AuthModule,
    UsersModule,
    RbacModule,
    AuditModule,
    SitesModule,
    PlotsModule,
    CadModule,
    DocumentsModule,
    AllotmentsModule,
    TransfersModule,
    PaymentsModule,
    EsignModule,
    KycModule,
    VendorsModule,
    DevelopmentModule,
    ProgressModule,
    IssuesModule,
    PlotConstructionModule,
    TasksModule,
    MarketingModule,
    ReportsModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
