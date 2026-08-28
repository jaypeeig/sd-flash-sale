import { describe, expect, it } from "vitest";
import { formatDuration } from "./formatDuration";

describe("Given a duration of two hours, three minutes, and four seconds", () => {
  describe("When it is formatted", () => {
    it("Then it reads H:MM:SS", () => {
      expect(formatDuration(7384000)).toBe("2:03:04");
    });
  });
});

describe("Given a duration of zero", () => {
  describe("When it is formatted", () => {
    it("Then it reads 0:00:00", () => {
      expect(formatDuration(0)).toBe("0:00:00");
    });
  });
});

describe("Given a negative duration", () => {
  describe("When it is formatted", () => {
    it("Then it clamps to 0:00:00", () => {
      expect(formatDuration(-5000)).toBe("0:00:00");
    });
  });
});
