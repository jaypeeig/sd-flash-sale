import type { Sale } from "@workspace/shared-types";

export interface PurchasePanelProps {
  sale: Sale;
  onPurchased: (saleId: string) => void;
}
