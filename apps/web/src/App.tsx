import { Link, Outlet } from "react-router-dom";

function App() {
  return (
    <div className="mx-auto mt-12 max-w-[720px] px-4">
      <header className="mb-6 flex items-center justify-between gap-4">
        <h1 className="m-0 text-2xl">Flash Sale Web</h1>
        <nav className="flex gap-3">
          <Link className="text-slate-900" to="/">
            Home
          </Link>
          <Link className="text-slate-900" to="/about">
            About
          </Link>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}

export default App;
