import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { LogOut, Menu, X } from "lucide-react";
import { Button } from "./ui/button";
import { useAuth } from "../contexts/AuthContext";
import { BrandLogo } from "./brand-logo";

const CORE_NAV_LINKS = [
  { path: "/", label: "Home" },
  { path: "/browse", label: "Browse" },
  { path: "/leaderboard", label: "Leaderboard" },
];

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navLinks = useMemo(
    () => (user ? [...CORE_NAV_LINKS, { path: "/dashboard", label: "Dashboard" }] : CORE_NAV_LINKS),
    [user]
  );

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return location.pathname === "/dashboard" || location.pathname === "/builder-dashboard" || location.pathname === "/profile";
    }

    return location.pathname === path;
  };

  const handleSignOut = async () => {
    await logout();
    navigate("/");
  };

  return (
    <header className="board-nav sticky top-0 z-50 border-b border-[color:var(--board-line)] backdrop-blur-xl">
      <div className="board-container flex min-h-[73px] items-center justify-between gap-4">
        <Link to="/" className="flex items-center">
          <BrandLogo />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`board-nav__link px-4 py-2 font-mono-alt text-[0.75rem] font-semibold uppercase tracking-[0.14em] ${
                isActive(link.path)
                  ? "board-nav__link--active text-[var(--board-accent)]"
                  : "text-[var(--board-soft)] hover:text-[var(--board-ink)]"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link to="/post" className="hidden sm:block">
            <Button className="board-btn-primary h-11 border-0 bg-[var(--board-accent)] px-5 text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-white hover:bg-[var(--color-accent-hover)]">
              Post brief
            </Button>
          </Link>

          {user ? (
            <Button
              variant="outline"
              onClick={handleSignOut}
              className="board-btn-secondary h-11 border-[color:var(--board-line-strong)] bg-transparent px-4 text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-[var(--board-accent)] hover:bg-[var(--board-panel-strong)]"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          ) : (
            <Link to="/auth">
              <Button
                variant="outline"
                className="board-btn-secondary h-11 border-[color:var(--board-line-strong)] bg-transparent px-4 text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-[var(--board-muted)] hover:bg-[var(--board-panel-strong)] hover:text-[var(--board-ink)]"
              >
                Sign in
              </Button>
            </Link>
          )}

          <button
            onClick={() => setMobileOpen((open) => !open)}
            className="flex h-11 w-11 items-center justify-center rounded-md border border-[color:var(--board-line)] bg-[var(--board-panel)] text-[var(--board-ink)] md:hidden"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="board-nav__mobile border-t border-[color:var(--board-line)] md:hidden">
          <div className="board-container flex flex-col gap-2 py-4">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileOpen(false)}
                className={`board-nav__link px-4 py-3 font-mono-alt text-[0.75rem] font-semibold uppercase tracking-[0.14em] ${
                  isActive(link.path)
                    ? "board-nav__link--active text-[var(--board-accent)]"
                    : "text-[var(--board-soft)]"
                }`}
              >
                {link.label}
              </Link>
            ))}

            <Link to="/post" onClick={() => setMobileOpen(false)}>
              <Button className="board-btn-primary mt-2 h-11 w-full border-0 bg-[var(--board-accent)] text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-white hover:bg-[var(--color-accent-hover)]">
                Post brief
              </Button>
            </Link>

            {user ? (
              <Button
                variant="outline"
                onClick={handleSignOut}
                className="board-btn-secondary mt-1 h-11 w-full border-[color:var(--board-line-strong)] bg-transparent text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-[var(--board-accent)] hover:bg-[var(--board-panel-strong)]"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>
            ) : (
              <Link to="/auth" onClick={() => setMobileOpen(false)}>
                <Button
                  variant="outline"
                  className="board-btn-secondary mt-1 h-11 w-full border-[color:var(--board-line-strong)] bg-transparent text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-[var(--board-muted)] hover:bg-[var(--board-panel-strong)] hover:text-[var(--board-ink)]"
                >
                  Sign in
                </Button>
              </Link>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
