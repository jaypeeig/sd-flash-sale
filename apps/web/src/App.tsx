import { Link, Outlet } from "react-router-dom";
import { useUser } from "./context/user-context";

const App = () => {
  const { email, logout } = useUser();

  return (
    <div className="mx-auto mt-12 max-w-[720px] px-4">
      <header className="mb-6 flex items-center justify-between gap-4">
        <h1 className="m-0 text-2xl">Flash Sale Web</h1>
        <nav className="flex items-center gap-3">
          <Link className="text-slate-900 transition-colors hover:text-slate-500" to="/">
            Home
          </Link>
          <Link className="text-slate-900 transition-colors hover:text-slate-500" to="/about">
            About
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
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
};

export default App;
