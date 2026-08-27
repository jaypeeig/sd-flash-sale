import { NotFoundException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import type { Database } from "../database/database.types";
import { SalesService } from "./sales.service";

const fakeRow = {
  id: "11111111-1111-1111-a111-111111111111",
  phase: "active" as const,
  salePrice: "189.00",
  totalStock: 50,
  remainingStock: 49,
  startsAt: new Date("2026-08-26T00:00:00.000Z"),
  endsAt: new Date("2026-08-27T00:00:00.000Z"),
  productId: "22222222-2222-2222-a222-222222222222",
  productName: "Field Recorder MK1",
  productDescription: "Hand-assembled portable recorder.",
  productImageUrl: "https://picsum.photos/seed/recorder/640/480",
  productPrice: "229.00",
};

const createFakeDatabase = (rows: (typeof fakeRow)[]): Database =>
  ({
    select: () => ({
      from: () => ({
        innerJoin: () => ({
          where: () => Promise.resolve(rows),
        }),
      }),
    }),
  }) as unknown as Database;

describe("Given sales exist in the database", () => {
  describe("When all sales are requested", () => {
    it("Then it maps each row into the Sale shape", async () => {
      const service = new SalesService(createFakeDatabase([fakeRow]));

      const result = await service.findAll();

      expect(result).toEqual([
        {
          id: fakeRow.id,
          product: {
            id: fakeRow.productId,
            name: fakeRow.productName,
            description: fakeRow.productDescription,
            imageUrl: fakeRow.productImageUrl,
            price: fakeRow.productPrice,
          },
          phase: fakeRow.phase,
          salePrice: fakeRow.salePrice,
          totalStock: fakeRow.totalStock,
          remainingStock: fakeRow.remainingStock,
          startsAt: fakeRow.startsAt.toISOString(),
          endsAt: fakeRow.endsAt.toISOString(),
          serverTime: expect.any(String),
        },
      ]);
    });
  });

  describe("When no sales match the filter", () => {
    it("Then it returns an empty array", async () => {
      const service = new SalesService(createFakeDatabase([]));

      const result = await service.findAll("upcoming");

      expect(result).toEqual([]);
    });
  });

  describe("When a single sale is requested by id", () => {
    it("Then it returns that sale", async () => {
      const service = new SalesService(createFakeDatabase([fakeRow]));

      const result = await service.findById(fakeRow.id);

      expect(result).toEqual({
        id: fakeRow.id,
        product: {
          id: fakeRow.productId,
          name: fakeRow.productName,
          description: fakeRow.productDescription,
          imageUrl: fakeRow.productImageUrl,
          price: fakeRow.productPrice,
        },
        phase: fakeRow.phase,
        salePrice: fakeRow.salePrice,
        totalStock: fakeRow.totalStock,
        remainingStock: fakeRow.remainingStock,
        startsAt: fakeRow.startsAt.toISOString(),
        endsAt: fakeRow.endsAt.toISOString(),
        serverTime: expect.any(String),
      });
    });
  });
});

describe("Given no sale matches the given id", () => {
  describe("When it is requested by id", () => {
    it("Then it throws NotFoundException", async () => {
      const service = new SalesService(createFakeDatabase([]));

      await expect(service.findById("does-not-exist")).rejects.toThrow(NotFoundException);
    });
  });
});
