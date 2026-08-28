import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "./apiFetch";
import { ApiError } from "./apiFetch.utils";

interface StubResponse {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}

const jsonResponse = (status: number, body: unknown): StubResponse => ({
  ok: status >= 200 && status < 300,
  status,
  json: () => Promise.resolve(body),
});

const stubFetch = (response: StubResponse | (() => Promise<StubResponse>)) => {
  const spy = vi.fn(async (_input: URL, _init?: RequestInit) =>
    typeof response === "function" ? await response() : response,
  );
  vi.stubGlobal("fetch", spy);
  return spy;
};

describe("Given a 200 response wrapping data in the envelope", () => {
  describe("When apiFetch is called", () => {
    it("Then it resolves with the envelope's data", async () => {
      stubFetch(jsonResponse(200, { statusCode: 200, message: "ok", data: { id: "1" } }));

      const result = await apiFetch<{ id: string }>("/sales/1");

      expect(result).toEqual({ id: "1" });
    });
  });
});

describe("Given a 404 response with a Sale not found message", () => {
  describe("When apiFetch is called", () => {
    let caught: ApiError;

    beforeEach(async () => {
      stubFetch(
        jsonResponse(404, { statusCode: 404, message: "Sale not found", error: "Not Found" }),
      );

      try {
        await apiFetch("/sales/unknown");
        throw new Error("expected apiFetch to reject");
      } catch (error) {
        caught = error as ApiError;
      }
    });

    it("Then it rejects with an ApiError", () => {
      expect(caught).toBeInstanceOf(ApiError);
    });

    it("Then the status is 404", () => {
      expect(caught.status).toBe(404);
    });

    it("Then the message is the server's message", () => {
      expect(caught.message).toBe("Sale not found");
    });
  });
});

describe("Given a 400 Validation failed response with issues", () => {
  describe("When apiFetch is called", () => {
    it("Then the issue messages are collected into details", async () => {
      stubFetch(
        jsonResponse(400, {
          statusCode: 400,
          message: "Validation failed",
          errors: [{ message: "Invalid email" }],
        }),
      );

      const caught = await apiFetch("/purchases").catch((error: ApiError) => error);

      expect((caught as ApiError).details).toEqual(["Invalid email"]);
    });
  });
});

describe("Given a 500 response with a body that is not JSON", () => {
  describe("When apiFetch is called", () => {
    it("Then it rejects with the generic unexpected-error message", async () => {
      stubFetch({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error("not json")),
      });

      const caught = await apiFetch("/sales").catch((error: ApiError) => error);

      expect((caught as ApiError).message).toBe("Something went wrong. Please try again.");
    });
  });
});

describe("Given fetch rejects with a network failure", () => {
  describe("When apiFetch is called", () => {
    it("Then it rejects with the network-error message", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(() => Promise.reject(new TypeError("Failed to fetch"))),
      );

      const caught = await apiFetch("/sales").catch((error: ApiError) => error);

      expect((caught as ApiError).message).toBe(
        "Could not reach the server. Check your connection and try again.",
      );
    });
  });
});

describe("Given fetch rejects with an AbortError", () => {
  describe("When apiFetch is called", () => {
    it("Then the AbortError is re-thrown untouched", async () => {
      const abortError = new DOMException("aborted", "AbortError");
      vi.stubGlobal(
        "fetch",
        vi.fn(() => Promise.reject(abortError)),
      );

      const caught = await apiFetch("/sales").catch((error: unknown) => error);

      expect(caught).toBe(abortError);
    });
  });
});

describe("Given a query object with an undefined value", () => {
  describe("When apiFetch is called", () => {
    it("Then the request URL omits that parameter", async () => {
      const spy = stubFetch(jsonResponse(200, { statusCode: 200, message: "ok", data: [] }));

      await apiFetch("/sales", { query: { status: undefined } });

      const requestedUrl = spy.mock.calls[0]?.[0] as URL;
      expect(requestedUrl.search).toBe("");
    });
  });
});

describe("Given a query object with a defined value", () => {
  describe("When apiFetch is called", () => {
    it("Then the request URL includes that parameter", async () => {
      const spy = stubFetch(jsonResponse(200, { statusCode: 200, message: "ok", data: [] }));

      await apiFetch("/sales", { query: { status: "active" } });

      const requestedUrl = spy.mock.calls[0]?.[0] as URL;
      expect(requestedUrl.search).toBe("?status=active");
    });
  });
});

describe("Given VITE_API_URL is stubbed to a different base", () => {
  describe("When apiFetch is called", () => {
    it("Then the request URL starts with the stubbed base", async () => {
      vi.stubEnv("VITE_API_URL", "http://api.test/api");
      const spy = stubFetch(jsonResponse(200, { statusCode: 200, message: "ok", data: [] }));

      await apiFetch("/sales");

      const requestedUrl = spy.mock.calls[0]?.[0] as URL;
      expect(requestedUrl.href.startsWith("http://api.test/api/sales")).toBe(true);
    });
  });
});

describe("Given a POST call with a body", () => {
  describe("When apiFetch is called", () => {
    it("Then fetch receives a JSON content-type header", async () => {
      const spy = stubFetch(jsonResponse(200, { statusCode: 200, message: "ok", data: null }));

      await apiFetch("/sales/1/purchase", { method: "POST", body: { email: "a@example.com" } });

      const init = spy.mock.calls[0]?.[1] as RequestInit;
      expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
    });
  });
});
