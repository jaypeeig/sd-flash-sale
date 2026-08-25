import { createContext, useContext } from "react";

export interface UserContextValue {
  email: string | null;
  login: (email: string) => void;
  logout: () => void;
}

export const UserContext = createContext<UserContextValue | null>(null);

export const useUser = (): UserContextValue => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};
