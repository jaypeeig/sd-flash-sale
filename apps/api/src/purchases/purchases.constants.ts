import type { PurchaseResult } from "@workspace/shared-types";

export const SUCCESS_RESULT: PurchaseResult = {
  status: "success",
  message: "You've successfully secured your item!",
};

export const ALREADY_PURCHASED_RESULT: PurchaseResult = {
  status: "already_purchased",
  message: "You have already purchased this item.",
};

export const SOLD_OUT_RESULT: PurchaseResult = {
  status: "sold_out",
  message: "Sorry, this item is sold out.",
};

export const SALE_NOT_ACTIVE_RESULT: PurchaseResult = {
  status: "sale_not_active",
  message: "This sale is not currently active.",
};
