import { Link } from "react-router-dom";
import { useUser } from "../../context/UserContext";

const NavBar = () => {
  const { email, logout } = useUser();

  return (
    <nav className="flex items-center gap-3">
      <Link className="text-slate-900 transition-colors hover:text-slate-500" to="/">
        Live sale
      </Link>
      <Link className="text-slate-900 transition-colors hover:text-slate-500" to="/upcoming">
        Upcoming
      </Link>
      <Link className="text-slate-900 transition-colors hover:text-slate-500" to="/orders">
        Orders
      </Link>
      {email ? (
        <>
          <span className="text-slate-600">{email}</span>
          <button
            type="button"
            className="cursor-pointer text-slate-900 transition-colors hover:text-slate-500"
            onClick={logout}
          >
            Sign out
          </button>
        </>
      ) : (
        <Link className="text-slate-900 transition-colors hover:text-slate-500" to="/login">
          Login
        </Link>
      )}
    </nav>
  );
};

export default NavBar;
