export interface HealthStatus {
  status: "ok";
  uptime: number;
  redis: "up" | "down";
}
