import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { useUser } from "../../context/UserContext";
import { BagIcon, BoltIcon, ChevronDownIcon, ClockIcon, LogoutIcon, UserIcon } from "./icons";

const linkClasses = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
  }`;

const NavBar = () => {
  const { email, logout } = useUser();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMenuOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isMenuOpen]);

  const handleSignOut = () => {
    setIsMenuOpen(false);
    logout();
  };

  return (
    <nav className="flex items-center gap-1">
      <NavLink to="/" end className={linkClasses}>
        <BoltIcon />
        Live sale
      </NavLink>
      <NavLink to="/upcoming" className={linkClasses}>
        <ClockIcon />
        Upcoming
      </NavLink>

      <div className="ml-1 flex items-center border-l border-slate-200 pl-2">
        {email ? (
          <div ref={menuRef} className="relative">
            <button
              type="button"
              className="flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
              onClick={() => setIsMenuOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={isMenuOpen}
            >
              <UserIcon />
              <span className="max-w-[10rem] truncate">{email}</span>
              <ChevronDownIcon />
            </button>
            {isMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 z-10 mt-1 min-w-full overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg"
              >
                <NavLink
                  to="/orders"
                  role="menuitem"
                  className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <BagIcon />
                  Orders
                </NavLink>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                  onClick={handleSignOut}
                >
                  <LogoutIcon />
                  Sign out
                </button>
              </div>
            )}
          </div>
        ) : (
          <NavLink to="/login" className={linkClasses}>
            <UserIcon />
            Login
          </NavLink>
        )}
      </div>
    </nav>
  );
};

export default NavBar;
