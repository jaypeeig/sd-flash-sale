import { CacheModule } from "@nestjs/cache-manager";
import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR, APP_PIPE } from "@nestjs/core";
import { ZodValidationPipe } from "nestjs-zod";
import { TransformInterceptor } from "./common/transform.interceptor";
import { DatabaseModule } from "./database/database.module";
import { HealthController } from "./health/health.controller";
import { HealthService } from "./health/health.service";
import { PurchasesController } from "./purchases/purchases.controller";
import { PurchasesService } from "./purchases/purchases.service";
import { SalesController } from "./sales/sales.controller";
import { SalesService } from "./sales/sales.service";

@Module({
  imports: [DatabaseModule, CacheModule.register({ isGlobal: true })],
  controllers: [HealthController, SalesController, PurchasesController],
  providers: [
    HealthService,
    SalesService,
    PurchasesService,
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
  ],
})
export class AppModule {}
