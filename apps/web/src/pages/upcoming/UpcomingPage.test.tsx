import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import UpcomingPage from "./UpcomingPage";

const sale = {
  id: "sale-1",
  product: {
    id: "product-1",
    name: "Canvas Field Tote",
    description: "Waxed canvas, leather straps.",
    imageUrl: null,
    price: "89.00",
  },
  phase: "upcoming" as const,
  salePrice: "69.00",
  totalStock: 40,
  remainingStock: 40,
  startsAt: new Date(Date.now() + 60_000).toISOString(),
  endsAt: new Date(Date.now() + 120_000).toISOString(),
  serverTime: new Date().toISOString(),
};

const stubFetchOnce = (status: number, body: unknown) => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body),
    })),
  );
};

describe("Given one upcoming sale", () => {
  describe("When the page loads", () => {
    it("Then the product name is shown", async () => {
      stubFetchOnce(200, { statusCode: 200, message: "ok", data: [sale] });

      render(<UpcomingPage />);

      expect(await screen.findByText("Canvas Field Tote")).toBeInTheDocument();
    });

    it("Then a Starts in countdown is shown", async () => {
      stubFetchOnce(200, { statusCode: 200, message: "ok", data: [sale] });

      render(<UpcomingPage />);

      expect(await screen.findByText(/Starts in/)).toBeInTheDocument();
    });
  });
});

describe("Given no upcoming sales", () => {
  describe("When the page loads", () => {
    it("Then the empty state is shown", async () => {
      stubFetchOnce(200, { statusCode: 200, message: "ok", data: [] });

      render(<UpcomingPage />);

      expect(await screen.findByText("No upcoming sales right now.")).toBeInTheDocument();
    });
  });
});

describe("Given the sales request fails", () => {
  describe("When the page loads", () => {
    it("Then an alert with the error message is shown", async () => {
      stubFetchOnce(500, { statusCode: 500, message: "Internal server error" });

      render(<UpcomingPage />);

      expect(await screen.findByRole("alert")).toHaveTextContent("Internal server error");
    });
  });
});
