import { Link, Outlet } from "react-router-dom";
import "./App.css";

function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Flash Sale Web</h1>
        <nav>
          <Link to="/">Home</Link>
          <Link to="/about">About</Link>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}

export default App;
