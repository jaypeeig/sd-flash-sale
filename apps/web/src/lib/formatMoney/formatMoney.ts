import { CURRENCY } from "./formatMoney.constants";

// XXX: prices are strings for storage precision; Number() is safe for
// display only, at these magnitudes.
export const formatMoney = (amount: string): string => {
  const parsed = Number(amount);
  return Number.isNaN(parsed) ? amount : CURRENCY.format(parsed);
};
