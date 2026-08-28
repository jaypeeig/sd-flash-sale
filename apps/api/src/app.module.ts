import { CacheModule } from "@nestjs/cache-manager";
import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR, APP_PIPE } from "@nestjs/core";
import { ZodValidationPipe } from "nestjs-zod";
import { TransformInterceptor } from "./common/transform.interceptor";
import { DatabaseModule } from "./database/database.module";
import { HealthController } from "./health/health.controller";
import { HealthService } from "./health/health.service";
import { ReadinessController } from "./health/readiness.controller";
import { ReadinessService } from "./health/readiness.service";
import { PurchasesController } from "./purchases/purchases.controller";
import { PurchasesService } from "./purchases/purchases.service";
import { RedisModule } from "./redis/redis.module";
import { SalesController } from "./sales/sales.controller";
import { SalesService } from "./sales/sales.service";

@Module({
  imports: [DatabaseModule, RedisModule, CacheModule.register({ isGlobal: true })],
  controllers: [HealthController, ReadinessController, SalesController, PurchasesController],
  providers: [
    HealthService,
    ReadinessService,
    SalesService,
    PurchasesService,
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
  ],
})
export class AppModule {}
