import { useCallback, useMemo, useState } from "react";
import type { UserProviderProps } from "./UserContext.types";
import { UserContext } from "./UserContext.utils";

export const UserProvider = ({ children }: UserProviderProps) => {
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
