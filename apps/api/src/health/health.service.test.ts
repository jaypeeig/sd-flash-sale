import { describe, expect, it } from "vitest";
import { HealthService } from "./health.service";

describe("Given a health service", () => {
  describe("When the status is requested", () => {
    it("Then it reports ok", () => {
      expect(new HealthService().getStatus().status).toBe("ok");
    });
  });
});
