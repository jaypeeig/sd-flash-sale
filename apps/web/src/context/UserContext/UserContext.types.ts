import type { ReactNode } from "react";

export interface UserContextValue {
  email: string | null;
  login: (email: string) => void;
  logout: () => void;
}

export interface UserProviderProps {
  children: ReactNode;
}
