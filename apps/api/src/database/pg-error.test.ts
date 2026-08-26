import { describe, expect, it } from "vitest";
import { isPgErrorWithCode } from "./pg-error";

describe("Given an error with a matching code on the top level", () => {
  describe("When checked against that code", () => {
    it("Then it returns true", () => {
      const error = Object.assign(new Error("duplicate key"), { code: "23505" });

      expect(isPgErrorWithCode(error, "23505")).toBe(true);
    });
  });
});

describe("Given a wrapper error whose cause carries the matching code", () => {
  describe("When checked against that code", () => {
    it("Then it returns true", () => {
      const error = Object.assign(new Error("Failed query"), {
        cause: Object.assign(new Error("duplicate key"), { code: "23505" }),
      });

      expect(isPgErrorWithCode(error, "23505")).toBe(true);
    });
  });
});

describe("Given an error with a different code", () => {
  describe("When checked against a code that doesn't match", () => {
    it("Then it returns false", () => {
      const error = Object.assign(new Error("outside sale period"), { code: "P1002" });

      expect(isPgErrorWithCode(error, "23505")).toBe(false);
    });
  });
});

describe("Given a plain non-pg error", () => {
  describe("When checked against any code", () => {
    it("Then it returns false", () => {
      expect(isPgErrorWithCode(new Error("connection reset"), "23505")).toBe(false);
    });
  });
});
