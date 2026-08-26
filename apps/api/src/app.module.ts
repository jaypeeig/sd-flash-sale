import { Module } from "@nestjs/common";
import { DatabaseModule } from "./database/database.module";
import { HealthController } from "./health/health.controller";
import { HealthService } from "./health/health.service";
import { SalesController } from "./sales/sales.controller";
import { SalesService } from "./sales/sales.service";

@Module({
  imports: [DatabaseModule],
  controllers: [HealthController, SalesController],
  providers: [HealthService, SalesService],
})
export class AppModule {}
