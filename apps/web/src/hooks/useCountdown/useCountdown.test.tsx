import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCountdown } from "./useCountdown";

const BASE_TIME = new Date("2030-01-01T00:00:00.000Z").getTime();

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(BASE_TIME);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Given the server clock is 60s ahead of the client clock", () => {
  describe("When the countdown targets a time 2 minutes after that server time", () => {
    it("Then the remaining time reflects the server-corrected offset, not the raw client diff", () => {
      const serverTimeIso = new Date(BASE_TIME + 60_000).toISOString();
      const targetIso = new Date(BASE_TIME + 60_000 + 120_000).toISOString();

      const { result } = renderHook(() => useCountdown(targetIso, serverTimeIso));

      // A naive client-only diff (target - now) would read 180000ms; the
      // server-time-corrected value is 120000ms.
      expect(result.current).toBe(120_000);
    });
  });
});

describe("Given a mounted countdown with no clock skew", () => {
  describe("When one second elapses", () => {
    it("Then the remaining time drops by 1000ms", () => {
      const serverTimeIso = new Date(BASE_TIME).toISOString();
      const targetIso = new Date(BASE_TIME + 10_000).toISOString();
      const { result } = renderHook(() => useCountdown(targetIso, serverTimeIso));
      const before = result.current;

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current).toBe(before - 1000);
    });
  });
});

describe("Given a target already in the past", () => {
  describe("When the countdown mounts", () => {
    it("Then the remaining time clamps to 0", () => {
      const serverTimeIso = new Date(BASE_TIME).toISOString();
      const targetIso = new Date(BASE_TIME - 10_000).toISOString();

      const { result } = renderHook(() => useCountdown(targetIso, serverTimeIso));

      expect(result.current).toBe(0);
    });
  });
});

describe("Given a mounted countdown", () => {
  describe("When it unmounts", () => {
    it("Then no further ticks are scheduled", () => {
      const serverTimeIso = new Date(BASE_TIME).toISOString();
      const targetIso = new Date(BASE_TIME + 10_000).toISOString();
      const { unmount } = renderHook(() => useCountdown(targetIso, serverTimeIso));

      unmount();

      expect(vi.getTimerCount()).toBe(0);
    });
  });
});
