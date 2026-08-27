import { check } from "k6";
import http from "k6/http";
import type { RefinedResponse, ResponseType } from "k6/http";
import { baseUrl } from "../config/environment.ts";
import type { ApiResponse, GetSalesParams, PurchaseResult, Sale } from "./api.types.ts";
import {
  getSaleDuration,
  listSalesDuration,
  purchaseDuration,
  recordPurchaseError,
  recordPurchaseOutcome,
} from "./metrics.ts";

type JsonResponse = RefinedResponse<ResponseType | undefined>;

// The API always answers 200 with `{ statusCode, message, data }` (see
// TransformInterceptor) — anything else (a real 4xx/5xx, a body that isn't
// JSON) yields `undefined` rather than throwing, so one bad response fails
// its `check` and the iteration continues instead of aborting the whole run.
const parseEnvelope = <T>(res: JsonResponse): ApiResponse<T> | undefined => {
  if (res.status !== 200) return undefined;
  try {
    return res.json() as unknown as ApiResponse<T>;
  } catch {
    return undefined;
  }
};

export const getHealth = (): boolean => {
  const res = http.get(`${baseUrl}/health`, { tags: { name: "GET /health" } });
  return check(res, { "GET /health: responds 200": () => res.status === 200 });
};

export const listSales = (status?: GetSalesParams["status"]): Sale[] => {
  const url = status ? `${baseUrl}/sales?status=${status}` : `${baseUrl}/sales`;
  const res = http.get(url, { tags: { name: "GET /sales" } });
  listSalesDuration.add(res.timings.duration);

  const body = parseEnvelope<Sale[]>(res);
  check(res, {
    "GET /sales: responds 200": () => res.status === 200,
    "GET /sales: envelope data is an array": () => Array.isArray(body?.data),
  });

  return body?.data ?? [];
};

export const getSaleById = (id: string): Sale | undefined => {
  const res = http.get(`${baseUrl}/sales/${id}`, { tags: { name: "GET /sales/:id" } });
  getSaleDuration.add(res.timings.duration);

  const body = parseEnvelope<Sale>(res);
  check(res, {
    "GET /sales/:id: responds 200": () => res.status === 200,
    "GET /sales/:id: envelope data matches the requested id": () => body?.data.id === id,
  });

  return body?.data;
};

export const purchase = (saleId: string, email: string): PurchaseResult | undefined => {
  const res = http.post(`${baseUrl}/sales/${saleId}/purchase`, JSON.stringify({ email }), {
    headers: { "Content-Type": "application/json" },
    tags: { name: "POST /sales/:id/purchase" },
  });
  purchaseDuration.add(res.timings.duration);

  const body = parseEnvelope<PurchaseResult>(res);
  check(res, {
    // Every documented PurchaseResult outcome is HTTP 200 — a non-200 here
    // is a real failure, not a business "no".
    "POST /purchase: responds 200": () => res.status === 200,
    "POST /purchase: envelope has a known status": () =>
      body?.data.status === "success" ||
      body?.data.status === "already_purchased" ||
      body?.data.status === "sold_out" ||
      body?.data.status === "sale_not_active",
  });

  if (body?.data) {
    recordPurchaseOutcome(body.data.status);
  } else {
    recordPurchaseError();
  }

  return body?.data;
};
