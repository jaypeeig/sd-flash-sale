import { Navigate } from "react-router-dom";
import { useUser } from "../../context/UserContext";
import type { RequireAuthProps } from "./RequireAuth.types";

const RequireAuth = ({ children }: RequireAuthProps) => {
  const { email } = useUser();

  if (!email) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default RequireAuth;
