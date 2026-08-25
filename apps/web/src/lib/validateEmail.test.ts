import { describe, expect, it } from "vitest";
import { isValidEmail } from "./validateEmail";

describe("Given a well-formed email", () => {
  describe("When it is validated", () => {
    it("Then it is accepted", () => {
      expect(isValidEmail("user@example.com")).toBe(true);
    });
  });
});

describe("Given an email with surrounding whitespace", () => {
  describe("When it is validated", () => {
    it("Then it is trimmed and accepted", () => {
      expect(isValidEmail("  user@example.com  ")).toBe(true);
    });
  });
});

describe("Given a malformed email", () => {
  describe.each([
    "",
    "not-an-email",
    "user@",
    "@example.com",
    "user@example",
    "user name@example.com",
  ])("When %s is validated", (value) => {
    it("Then it is rejected", () => {
      expect(isValidEmail(value)).toBe(false);
    });
  });
});
