import type { ReactNode } from "react";

export interface StatusMessageProps {
  tone?: "info" | "error";
  children: ReactNode;
}
