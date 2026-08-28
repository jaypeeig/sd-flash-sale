import type { Sale } from "@workspace/shared-types";
import type { ReactNode } from "react";

export interface SaleCardProps {
  sale: Sale;
  children?: ReactNode;
}
