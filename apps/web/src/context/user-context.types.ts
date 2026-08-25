export interface UserContextValue {
  email: string | null;
  login: (email: string) => void;
  logout: () => void;
}
