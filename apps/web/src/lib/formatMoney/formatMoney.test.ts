import { describe, expect, it } from "vitest";
import { formatMoney } from "./formatMoney";

describe("Given a plain amount string", () => {
  describe("When it is formatted", () => {
    it("Then it is rendered as USD currency", () => {
      expect(formatMoney("189.00")).toBe("$189.00");
    });
  });
});

describe("Given a non-numeric string", () => {
  describe("When it is formatted", () => {
    it("Then it is returned unchanged", () => {
      expect(formatMoney("n/a")).toBe("n/a");
    });
  });
});
