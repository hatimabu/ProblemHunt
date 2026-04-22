import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { LogOut, Menu, Rocket, X } from "lucide-react";
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
    <header className="sticky top-0 z-50 border-b border-[color:var(--board-line)] backdrop-blur-xl" style={{ background: "rgba(7,10,15,0.85)" }}>
      {/* Top telemetry strip */}
      <div className="hidden h-6 items-center justify-between border-b border-[color:var(--board-line)] px-4 text-[0.6rem] uppercase tracking-[0.2em] text-[var(--board-metal-steel)] md:flex" style={{ background: "rgba(10,14,22,0.6)" }}>
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500/80" />
            NET: ONLINE
          </span>
          <span className="text-[var(--board-line)]">|</span>
          <span>PROBLEM HUNT v2.1</span>
        </div>
        <div className="flex items-center gap-4">
          <span>{new Date().toISOString().split("T")[0]}</span>
          <span className="text-[var(--board-line)]">|</span>
          <span>UTC {new Date().toISOString().split("T")[1].slice(0, 5)}</span>
        </div>
      </div>

      <div className="board-container flex min-h-[64px] items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2">
          <BrandLogo />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`relative px-4 py-2 font-mono-alt text-[0.72rem] font-semibold uppercase tracking-[0.14em] transition-colors ${
                isActive(link.path)
                  ? "text-[var(--board-accent)]"
                  : "text-[var(--board-soft)] hover:text-[var(--board-ink)]"
              }`}
            >
              {link.label}
              {isActive(link.path) && (
                <span className="absolute bottom-0 left-1/2 h-[2px] w-6 -translate-x-1/2 rounded-full bg-[var(--board-accent)]" />
              )}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link to="/post" className="hidden sm:block">
            <Button className="h-10 border-0 bg-[var(--board-accent)] px-4 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-white hover:bg-[var(--color-accent-hover)]">
              <Rocket className="mr-1.5 h-3.5 w-3.5" />
              Post brief
            </Button>
          </Link>

          {user ? (
            <Button
              variant="outline"
              onClick={handleSignOut}
              className="h-10 border-[color:var(--board-line-strong)] bg-transparent px-3 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[var(--board-muted)] hover:bg-[var(--board-panel-strong)] hover:text-[var(--board-ink)]"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          ) : (
            <Link to="/auth">
              <Button
                variant="outline"
                className="h-10 border-[color:var(--board-line-strong)] bg-transparent px-4 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[var(--board-muted)] hover:bg-[var(--board-panel-strong)] hover:text-[var(--board-ink)]"
              >
                Sign in
              </Button>
            </Link>
          )}

          <button
            onClick={() => setMobileOpen((open) => !open)}
            className="flex h-10 w-10 items-center justify-center rounded-md border border-[color:var(--board-line)] bg-[var(--board-panel)] text-[var(--board-ink)] md:hidden"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="border-t border-[color:var(--board-line)] md:hidden" style={{ background: "rgba(7,10,15,0.95)" }}>
          <div className="board-container flex flex-col gap-2 py-4">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileOpen(false)}
                className={`px-4 py-3 font-mono-alt text-[0.75rem] font-semibold uppercase tracking-[0.14em] ${
                  isActive(link.path)
                    ? "text-[var(--board-accent)]"
                    : "text-[var(--board-soft)]"
                }`}
              >
                {link.label}
              </Link>
            ))}

            <Link to="/post" onClick={() => setMobileOpen(false)}>
              <Button className="mt-2 h-11 w-full border-0 bg-[var(--board-accent)] text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-white hover:bg-[var(--color-accent-hover)]">
                <Rocket className="mr-1.5 h-3.5 w-3.5" />
                Post brief
              </Button>
            </Link>

            {user ? (
              <Button
                variant="outline"
                onClick={handleSignOut}
                className="mt-1 h-11 w-full border-[color:var(--board-line-strong)] bg-transparent text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-[var(--board-accent)] hover:bg-[var(--board-panel-strong)]"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </Button>
            ) : (
              <Link to="/auth" onClick={() => setMobileOpen(false)}>
                <Button
                  variant="outline"
                  className="mt-1 h-11 w-full border-[color:var(--board-line-strong)] bg-transparent text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-[var(--board-muted)] hover:bg-[var(--board-panel-strong)] hover:text-[var(--board-ink)]"
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
