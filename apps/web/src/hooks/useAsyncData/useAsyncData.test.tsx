import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../api/apiFetch";
import { useAsyncData } from "./useAsyncData";

describe("Given a fetcher that resolves", () => {
  describe("When the hook mounts", () => {
    let hook: ReturnType<typeof renderHook<ReturnType<typeof useAsyncData<string>>, unknown>>;

    beforeEach(() => {
      const resolvingFetcher = () => Promise.resolve("value");
      hook = renderHook(() => useAsyncData<string>(resolvingFetcher));
    });

    it("Then isLoading starts true", () => {
      expect(hook.result.current.isLoading).toBe(true);
    });

    it("Then data is exposed once the fetch settles", async () => {
      await waitFor(() => expect(hook.result.current.data).toBe("value"));
    });

    it("Then error stays null", async () => {
      await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
      expect(hook.result.current.error).toBeNull();
    });
  });
});

describe("Given a fetcher rejecting with an ApiError", () => {
  describe("When the hook mounts", () => {
    it("Then error is that ApiError", async () => {
      const failure = new ApiError(404, "Sale not found");
      const rejectingFetcher = () => Promise.reject(failure);
      const { result } = renderHook(() => useAsyncData<string>(rejectingFetcher));

      await waitFor(() => expect(result.current.error).toBe(failure));
    });
  });
});

describe("Given a fetcher rejecting with a plain string", () => {
  describe("When the hook mounts", () => {
    it("Then the error is normalized into an ApiError", async () => {
      const rejectingFetcher = () => Promise.reject("boom");
      const { result } = renderHook(() => useAsyncData<string>(rejectingFetcher));

      await waitFor(() => expect(result.current.error).toBeInstanceOf(ApiError));
    });
  });
});

describe("Given a null fetcher", () => {
  describe("When the hook mounts", () => {
    it("Then isLoading is false", () => {
      const { result } = renderHook(() => useAsyncData<string>(null));

      expect(result.current.isLoading).toBe(false);
    });
  });
});

describe("Given a mounted hook with a resolving fetcher", () => {
  describe("When refetch is called", () => {
    it("Then the fetcher runs a second time", async () => {
      const fetcher = vi.fn(() => Promise.resolve("value"));
      const { result } = renderHook(() => useAsyncData<string>(fetcher));
      await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));

      result.current.refetch();

      await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
    });
  });
});

describe("Given a mounted hook with a fetcher that has not settled", () => {
  describe("When it unmounts before the fetcher resolves", () => {
    it("Then the signal passed to the fetcher is aborted", () => {
      let capturedSignal: AbortSignal | undefined;
      const fetcher = (signal: AbortSignal) => {
        capturedSignal = signal;
        return new Promise<string>(() => {});
      };
      const { unmount } = renderHook(() => useAsyncData<string>(fetcher));

      unmount();

      expect(capturedSignal?.aborted).toBe(true);
    });
  });
});
