import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import { Check, ChevronDown, Copy, LayoutDashboard, LogOut, Menu, Sparkles, Trophy, X } from "lucide-react";
import { Button } from "./ui/button";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../../../lib/supabaseClient";

const NAV_LINKS = [
  { path: "/browse", label: "Browse" },
  { path: "/leaderboard", label: "Leaderboard" },
];

export function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) {
      setWalletAddress(null);
      return;
    }

    supabase
      .from("wallets")
      .select("address")
      .eq("user_id", user.id)
      .eq("is_primary", true)
      .limit(1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          setWalletAddress(null);
          return;
        }
        setWalletAddress(data?.address ?? null);
      });
  }, [user]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const isActive = (path: string) => location.pathname === path;
  const shortAddress = walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : null;

  const copyWallet = async () => {
    if (!walletAddress) {
      return;
    }

    await navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
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
          {NAV_LINKS.map((link) => (
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
          {user && shortAddress ? (
            <button
              onClick={copyWallet}
              className="hidden items-center gap-2 border border-[color:var(--board-line)] bg-white/50 px-3 py-2 font-mono-alt text-[0.68rem] uppercase tracking-[0.14em] text-[var(--board-soft)] transition-colors hover:border-[color:var(--board-line-strong)] hover:text-[var(--board-accent)] sm:flex"
              title="Copy wallet address"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {shortAddress}
            </button>
          ) : null}

          <Link to="/post" className="hidden sm:block">
            <Button className="h-11 rounded-none border border-[color:rgba(15,118,110,0.24)] bg-[var(--board-accent)] px-5 text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-white hover:bg-[color:#0d625c]">
              Post brief
            </Button>
          </Link>

          {user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen((open) => !open)}
                className="flex items-center gap-2 border border-[color:var(--board-line)] bg-white/56 px-2 py-2 text-[var(--board-ink)] transition-colors hover:border-[color:var(--board-line-strong)]"
              >
                <div className="flex h-8 w-8 items-center justify-center bg-[var(--board-night)] text-sm font-semibold text-white">
                  {(user.username || user.email || "U").slice(0, 1).toUpperCase()}
                </div>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-[var(--board-soft)] transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
                />
              </button>

              {dropdownOpen ? (
                <div className="absolute right-0 mt-2 w-60 border border-[color:var(--board-line-strong)] bg-[var(--board-panel-strong)] p-2 shadow-[0_24px_70px_rgba(23,39,52,0.12)]">
                  <div className="border-b border-[color:var(--board-line)] px-3 py-3">
                    <p className="text-sm font-semibold text-[var(--board-ink)]">
                      {user.username || "Builder"}
                    </p>
                    <p className="mt-1 text-xs text-[var(--board-soft)]">{user.email}</p>
                  </div>

                  <div className="py-2">
                    <Link
                      to="/dashboard"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--board-muted)] transition-colors hover:bg-[rgba(15,118,110,0.08)] hover:text-[var(--board-accent)]"
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      Dashboard
                    </Link>
                    <Link
                      to="/leaderboard"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--board-muted)] transition-colors hover:bg-[rgba(15,118,110,0.08)] hover:text-[var(--board-accent)]"
                    >
                      <Trophy className="h-4 w-4" />
                      Leaderboard
                    </Link>
                  </div>

                  <div className="border-t border-[color:var(--board-line)] pt-2">
                    <button
                      onClick={() => {
                        logout();
                        setDropdownOpen(false);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--board-rust)] transition-colors hover:bg-[rgba(178,103,55,0.08)]"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
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
            {NAV_LINKS.map((link) => (
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

            {user && shortAddress ? (
              <button
                onClick={copyWallet}
                className="mt-1 flex items-center gap-2 border border-[color:var(--board-line)] bg-white/56 px-4 py-3 font-mono-alt text-[0.68rem] uppercase tracking-[0.14em] text-[var(--board-soft)]"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {shortAddress}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </header>
  );
}
