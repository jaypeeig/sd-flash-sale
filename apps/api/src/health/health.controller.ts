import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { HealthService } from "./health.service";
import type { HealthStatus } from "./health.service.types";

@ApiTags("Health")
@Controller("health")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @ApiOperation({ summary: "Report basic service health" })
  @ApiResponse({ status: 200, description: "Service is healthy" })
  @Get()
  getHealth(): HealthStatus {
    return this.healthService.getStatus();
  }
}
