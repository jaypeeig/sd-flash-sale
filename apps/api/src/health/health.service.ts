import { Injectable } from "@nestjs/common";
import type { HealthStatus } from "./health.types";

@Injectable()
export class HealthService {
  getStatus(): HealthStatus {
    return {
      status: "ok",
      uptime: Math.floor(process.uptime()),
    };
  }
}

export type { HealthStatus };
