import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { UserContext } from "./user-context";

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [email, setEmail] = useState<string | null>(null);

  const login = useCallback((nextEmail: string) => {
    setEmail(nextEmail);
  }, []);

  const logout = useCallback(() => {
    setEmail(null);
  }, []);

  const value = useMemo(() => ({ email, login, logout }), [email, login, logout]);

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
