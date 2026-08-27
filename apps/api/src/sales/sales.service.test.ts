import { NotFoundException } from "@nestjs/common";
import type { Cache } from "cache-manager";
import { describe, expect, it, vi } from "vitest";
import type { Database } from "../database/database.types";
import { SalesService } from "./sales.service";

const HOUR = 60 * 60 * 1000;

const fakeRow = {
  id: "11111111-1111-1111-a111-111111111111",
  salePrice: "189.00",
  totalStock: 50,
  remainingStock: 49,
  startsAt: new Date(Date.now() - HOUR),
  endsAt: new Date(Date.now() + HOUR),
  cancelledAt: null as Date | null,
  productId: "22222222-2222-2222-a222-222222222222",
  productName: "Field Recorder MK1",
  productDescription: "Hand-assembled portable recorder.",
  productImageUrl: "https://picsum.photos/seed/recorder/640/480",
  productPrice: "229.00",
};

const createFakeDatabase = (rows: (typeof fakeRow)[]) => {
  const where = vi.fn(() => Promise.resolve(rows));
  const db = {
    select: () => ({
      from: () => ({
        innerJoin: () => ({ where }),
      }),
    }),
  } as unknown as Database;
  return { db, where };
};

const createFakeCache = (): Cache => {
  const store = new Map<string, unknown>();
  return {
    get: vi.fn((key: string) => Promise.resolve(store.get(key))),
    set: vi.fn((key: string, value: unknown) => {
      store.set(key, value);
      return Promise.resolve();
    }),
  } as unknown as Cache;
};

describe("Given sales exist in the database", () => {
  describe("When all sales are requested", () => {
    it("Then it maps each row into the Sale shape", async () => {
      const { db } = createFakeDatabase([fakeRow]);
      const service = new SalesService(db, createFakeCache());

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
          phase: "active",
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
      const { db } = createFakeDatabase([]);
      const service = new SalesService(db, createFakeCache());

      const result = await service.findAll("upcoming");

      expect(result).toEqual([]);
    });
  });

  describe("When a single sale is requested by id", () => {
    it("Then it returns that sale", async () => {
      const { db } = createFakeDatabase([fakeRow]);
      const service = new SalesService(db, createFakeCache());

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
        phase: "active",
        salePrice: fakeRow.salePrice,
        totalStock: fakeRow.totalStock,
        remainingStock: fakeRow.remainingStock,
        startsAt: fakeRow.startsAt.toISOString(),
        endsAt: fakeRow.endsAt.toISOString(),
        serverTime: expect.any(String),
      });
    });
  });

  describe("When the same sale is requested by id a second time", () => {
    it("Then it does not query the database again", async () => {
      const { db, where } = createFakeDatabase([fakeRow]);
      const service = new SalesService(db, createFakeCache());

      await service.findById(fakeRow.id);
      await service.findById(fakeRow.id);

      expect(where).toHaveBeenCalledOnce();
    });
  });
});

describe("Given a cancelled sale", () => {
  describe("When it is requested by id", () => {
    it("Then it throws NotFoundException", async () => {
      const { db } = createFakeDatabase([{ ...fakeRow, cancelledAt: new Date() }]);
      const service = new SalesService(db, createFakeCache());

      await expect(service.findById(fakeRow.id)).rejects.toThrow(NotFoundException);
    });
  });
});

describe("Given no sale matches the given id", () => {
  describe("When it is requested by id", () => {
    it("Then it throws NotFoundException", async () => {
      const { db } = createFakeDatabase([]);
      const service = new SalesService(db, createFakeCache());

      await expect(service.findById("does-not-exist")).rejects.toThrow(NotFoundException);
    });
  });
});
