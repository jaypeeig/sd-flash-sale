import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useUser } from "../../context/user-context";

const RequireAuth = ({ children }: { children: ReactNode }) => {
  const { email } = useUser();

  if (!email) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default RequireAuth;
