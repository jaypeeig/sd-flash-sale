import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { SalesController } from "./sales.controller";
import type { SalesService } from "./sales.service";

describe("Given the sales controller", () => {
  describe("When an invalid status is requested", () => {
    it("Then it throws a BadRequestException", () => {
      const salesService = { findAll: vi.fn() } as unknown as SalesService;
      const controller = new SalesController(salesService);

      expect(() => controller.getSales("nonsense")).toThrow(BadRequestException);
    });
  });

  describe("When a valid status is requested", () => {
    it("Then it delegates to the sales service with that status", async () => {
      const findAll = vi.fn().mockResolvedValue([]);
      const salesService = { findAll } as unknown as SalesService;
      const controller = new SalesController(salesService);

      await controller.getSales("active");

      expect(findAll).toHaveBeenCalledWith("active");
    });
  });

  describe("When no status is requested", () => {
    it("Then it delegates to the sales service with no status", async () => {
      const findAll = vi.fn().mockResolvedValue([]);
      const salesService = { findAll } as unknown as SalesService;
      const controller = new SalesController(salesService);

      await controller.getSales(undefined);

      expect(findAll).toHaveBeenCalledWith(undefined);
    });
  });
});
