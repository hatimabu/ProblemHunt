import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { LogOut, Menu, Sparkles, X } from "lucide-react";
import { Button } from "./ui/button";
import { useAuth } from "../contexts/AuthContext";

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
    <header className="board-nav sticky top-0 z-50 border-b border-[color:var(--board-line)] bg-[rgba(248,244,236,0.82)] backdrop-blur-xl">
      <div className="board-container flex min-h-[73px] items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center border border-[color:var(--board-line-strong)] bg-[rgba(15,118,110,0.08)] text-[var(--board-accent)]">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <p className="font-mono-alt text-[0.68rem] uppercase tracking-[0.24em] text-[var(--board-soft)]">
              Problem Hunt
            </p>
            <p className="font-display text-base font-semibold tracking-[-0.04em] text-[var(--board-ink)]">
              Bounty board for work that should ship
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`px-4 py-2 font-mono-alt text-[0.7rem] font-semibold uppercase tracking-[0.18em] transition-colors ${
                isActive(link.path)
                  ? "bg-[rgba(15,118,110,0.08)] text-[var(--board-accent)]"
                  : "text-[var(--board-soft)] hover:text-[var(--board-ink)]"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link to="/post" className="hidden sm:block">
            <Button className="h-11 rounded-none border border-[color:rgba(15,118,110,0.24)] bg-[var(--board-accent)] px-5 text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-white hover:bg-[color:#0d625c]">
              Post brief
            </Button>
          </Link>

          {user ? (
            <Button
              variant="outline"
              onClick={handleSignOut}
              className="h-11 rounded-none border-[color:rgba(178,103,55,0.22)] bg-white/60 px-4 text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-[var(--board-rust)] hover:bg-white"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          ) : (
            <Link to="/auth">
              <Button
                variant="outline"
                className="h-11 rounded-none border-[color:var(--board-line-strong)] bg-white/60 px-4 text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-[var(--board-ink)] hover:bg-white"
              >
                Sign in
              </Button>
            </Link>
          )}

          <button
            onClick={() => setMobileOpen((open) => !open)}
            className="flex h-11 w-11 items-center justify-center border border-[color:var(--board-line)] bg-white/56 text-[var(--board-ink)] md:hidden"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="board-nav__mobile border-t border-[color:var(--board-line)] bg-[rgba(248,244,236,0.96)] md:hidden">
          <div className="board-container flex flex-col gap-2 py-4">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileOpen(false)}
                className={`px-4 py-3 font-mono-alt text-[0.72rem] font-semibold uppercase tracking-[0.18em] ${
                  isActive(link.path)
                    ? "bg-[rgba(15,118,110,0.08)] text-[var(--board-accent)]"
                    : "text-[var(--board-soft)]"
                }`}
              >
                {link.label}
              </Link>
            ))}

            <Link to="/post" onClick={() => setMobileOpen(false)}>
              <Button className="mt-2 h-11 w-full rounded-none border border-[color:rgba(15,118,110,0.24)] bg-[var(--board-accent)] text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-white hover:bg-[color:#0d625c]">
                Post brief
              </Button>
            </Link>

            {user ? (
              <Button
                variant="outline"
                onClick={handleSignOut}
                className="mt-1 h-11 w-full rounded-none border-[color:rgba(178,103,55,0.22)] bg-white/60 text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-[var(--board-rust)] hover:bg-white"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>
            ) : (
              <Link to="/auth" onClick={() => setMobileOpen(false)}>
                <Button
                  variant="outline"
                  className="mt-1 h-11 w-full rounded-none border-[color:var(--board-line-strong)] bg-white/60 text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-[var(--board-ink)] hover:bg-white"
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
