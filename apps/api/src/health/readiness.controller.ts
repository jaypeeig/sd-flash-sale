import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ResponseMessage } from "../common/response-message.decorator";
import { ReadinessService } from "./readiness.service";
import type { ReadinessStatus } from "./readiness.types";

// Separate from /health on purpose: /health is liveness (is the process
// up?), this is dependency readiness (is Redis reachable?). Always
// responds 200 — "degraded" still means the service is serving, just via
// the Postgres fallback in PurchasesService instead of the Redis fast path.
@ApiTags("Health")
@Controller("ready")
export class ReadinessController {
  constructor(private readonly readinessService: ReadinessService) {}

  @ApiOperation({ summary: "Report readiness of downstream dependencies (Redis)" })
  @ApiResponse({ status: 200, description: "Dependency status, ready or degraded" })
  @ResponseMessage("Readiness checked")
  @Get()
  getReadiness(): Promise<ReadinessStatus> {
    return this.readinessService.getStatus();
  }
}
