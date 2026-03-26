import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router";
import { Code, Menu, X, ChevronDown, Copy, Check, User, LayoutDashboard, LogOut, Trophy } from "lucide-react";
import { Button } from "./ui/button";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../../../lib/supabaseClient";

export function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch primary wallet address for display
  useEffect(() => {
    if (!user) { setWalletAddress(null); return; }
    supabase
      .from("wallets")
      .select("address")
      .eq("user_id", user.id)
      .eq("is_primary", true)
      .limit(1)
      .single()
      .then(({ data }) => setWalletAddress(data?.address ?? null));
  }, [user]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const copyWallet = async () => {
    if (!walletAddress) return;
    await navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shortAddress = walletAddress
    ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}`
    : null;

  const isActive = (path: string) => location.pathname === path;
  const isLanding = location.pathname === "/";

  const navLinks = [
    { path: "/browse", label: "Browse" },
    { path: "/leaderboard", label: "Leaderboard" },
  ];

  const palette = isLanding
    ? {
        header: "border-[color:var(--neon-line)] bg-[rgba(5,8,22,0.72)] backdrop-blur-xl",
        logoBox: "rounded-none border border-[color:rgba(89,243,255,0.28)] bg-[linear-gradient(135deg,rgba(89,243,255,0.18),rgba(255,79,216,0.22))]",
        logoText: "bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-pink)] bg-clip-text text-transparent",
        activeLink: "text-[var(--neon-cyan)] bg-[rgba(89,243,255,0.08)]",
        inactiveLink: "text-[var(--neon-muted)] hover:text-[var(--neon-text)] hover:bg-[rgba(255,255,255,0.04)]",
        wallet: "bg-[rgba(9,14,31,0.86)] border-[color:var(--neon-line)] text-[var(--neon-cyan)] hover:border-[color:var(--neon-line-strong)]",
        primaryCta: "rounded-none border border-[color:rgba(89,243,255,0.34)] bg-[rgba(9,14,31,0.88)] text-[var(--neon-cyan)] hover:bg-[rgba(89,243,255,0.1)]",
        userButton: "bg-[rgba(9,14,31,0.86)] border-[color:var(--neon-line)] hover:border-[color:var(--neon-line-strong)]",
        avatar: "rounded-none bg-[linear-gradient(135deg,var(--neon-cyan),var(--neon-pink))]",
        dropdown: "bg-[rgba(8,12,28,0.96)] border-[color:var(--neon-line)] shadow-2xl shadow-[rgba(89,243,255,0.12)]",
        dropdownDivider: "border-[color:rgba(89,243,255,0.12)]",
        dropdownItem: "text-[var(--neon-muted)] hover:text-[var(--neon-text)] hover:bg-[rgba(255,255,255,0.04)]",
        signIn: "rounded-none border border-[color:rgba(255,79,216,0.32)] bg-[rgba(255,79,216,0.12)] text-[var(--neon-text)] hover:bg-[rgba(255,79,216,0.18)]",
        mobileToggle: "text-[var(--neon-muted)] hover:text-[var(--neon-text)] hover:bg-[rgba(255,255,255,0.05)]",
        mobileMenu: "border-[color:var(--neon-line)] bg-[rgba(5,8,22,0.96)]",
      }
    : {
        header: "border-[color:var(--neon-line)] bg-[rgba(5,8,22,0.78)] backdrop-blur-xl",
        logoBox: "rounded-none border border-[color:rgba(89,243,255,0.28)] bg-[linear-gradient(135deg,rgba(89,243,255,0.16),rgba(255,79,216,0.18))]",
        logoText: "bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-pink)] bg-clip-text text-transparent",
        activeLink: "text-[var(--neon-cyan)] bg-[rgba(89,243,255,0.08)]",
        inactiveLink: "text-[var(--neon-muted)] hover:text-[var(--neon-text)] hover:bg-[rgba(255,255,255,0.04)]",
        wallet: "bg-[rgba(9,14,31,0.88)] border-[color:var(--neon-line)] text-[var(--neon-cyan)] hover:border-[color:var(--neon-line-strong)]",
        primaryCta: "border border-[color:rgba(89,243,255,0.34)] bg-[rgba(9,14,31,0.88)] text-[var(--neon-cyan)] hover:bg-[rgba(89,243,255,0.1)]",
        userButton: "bg-[rgba(9,14,31,0.88)] border-[color:var(--neon-line)] hover:border-[color:var(--neon-line-strong)]",
        avatar: "rounded-none bg-[linear-gradient(135deg,var(--neon-cyan),var(--neon-pink))]",
        dropdown: "bg-[rgba(8,12,28,0.96)] border-[color:var(--neon-line)] shadow-2xl shadow-[rgba(89,243,255,0.12)]",
        dropdownDivider: "border-[color:rgba(89,243,255,0.12)]",
        dropdownItem: "text-[var(--neon-muted)] hover:text-[var(--neon-text)] hover:bg-[rgba(255,255,255,0.04)]",
        signIn: "border border-[color:rgba(255,79,216,0.32)] bg-[rgba(255,79,216,0.12)] text-[var(--neon-text)] hover:bg-[rgba(255,79,216,0.18)]",
        mobileToggle: "text-[var(--neon-muted)] hover:text-[var(--neon-text)] hover:bg-[rgba(255,255,255,0.05)]",
        mobileMenu: "border-[color:var(--neon-line)] bg-[rgba(5,8,22,0.96)]",
      };

  return (
    <header className={`sticky top-0 z-50 border-b ${palette.header}`}>
      <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className={`w-8 h-8 flex items-center justify-center logo-glow ${palette.logoBox}`}>
            <Code className="w-5 h-5 text-white" />
          </div>
          <span className={`text-xl font-bold hidden sm:block ${palette.logoText}`}>
            problemhunt.cc
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map(({ path, label }) => (
            <Link key={path} to={path}>
              <button
                className={`nav-link px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  isActive(path)
                    ? palette.activeLink
                    : palette.inactiveLink
                }`}
              >
                {label}
              </button>
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Wallet chip */}
          {user && shortAddress && (
            <button
              onClick={copyWallet}
              title="Copy wallet address"
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 border rounded-full text-xs font-mono transition-colors ${palette.wallet}`}
            >
              {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
              {shortAddress}
            </button>
          )}

          {/* Post Problem CTA */}
          <Link to="/post" className="hidden sm:block">
            <Button
              size="sm"
              className={`btn-shimmer border-0 text-sm font-semibold ${palette.primaryCta}`}
            >
              Post Problem
            </Button>
          </Link>

          {/* User dropdown or Sign In */}
          {user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen((o) => !o)}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border transition-colors ${palette.userButton}`}
              >
                <div className={`w-7 h-7 flex items-center justify-center text-white text-xs font-bold ${palette.avatar}`}>
                  {(user.username || user.email || "U").substring(0, 1).toUpperCase()}
                </div>
                <ChevronDown className={`w-3.5 h-3.5 ${isLanding ? "text-[var(--neon-dim)]" : "text-[var(--neon-dim)]"} transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {dropdownOpen && (
                <div className={`absolute right-0 mt-2 w-52 rounded-xl border overflow-hidden z-50 fade-in ${palette.dropdown}`}>
                  <div className={`px-4 py-3 border-b ${palette.dropdownDivider}`}>
                    <p className={`text-sm font-semibold truncate ${isLanding ? "text-[var(--neon-text)]" : "text-white"}`}>
                      {user.username || "Builder"}
                    </p>
                    <p className={`text-xs truncate ${isLanding ? "text-[var(--neon-dim)]" : "text-[var(--neon-dim)]"}`}>{user.email}</p>
                  </div>

                  <div className="py-1">
                    <Link
                      to="/dashboard"
                      onClick={() => setDropdownOpen(false)}
                      className={`flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${palette.dropdownItem}`}
                    >
                      <LayoutDashboard className="w-4 h-4 text-cyan-400" />
                      Dashboard
                    </Link>
                    <Link
                      to="/leaderboard"
                      onClick={() => setDropdownOpen(false)}
                      className={`flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${palette.dropdownItem}`}
                    >
                      <Trophy className="w-4 h-4 text-yellow-400" />
                      Leaderboard
                    </Link>
                  </div>

                  <div className={`border-t py-1 ${palette.dropdownDivider}`}>
                    <button
                      onClick={() => { logout(); setDropdownOpen(false); }}
                      className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link to="/auth">
              <Button
                size="sm"
                className={`border-0 ${palette.signIn}`}
              >
                Sign In
              </Button>
            </Link>
          )}

          {/* Mobile hamburger */}
          <button
            className={`md:hidden p-1.5 rounded-md transition-colors ${palette.mobileToggle}`}
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className={`md:hidden border-t backdrop-blur-md fade-in ${palette.mobileMenu}`}>
          <div className="container mx-auto px-4 py-4 space-y-1">
            {navLinks.map(({ path, label }) => (
              <Link
                key={path}
                to={path}
                onClick={() => setMobileOpen(false)}
                className={`block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive(path)
                    ? palette.activeLink
                    : palette.inactiveLink
                }`}
              >
                {label}
              </Link>
            ))}

            <Link to="/post" onClick={() => setMobileOpen(false)}>
              <Button className={`w-full mt-3 border-0 ${palette.primaryCta}`}>
                Post Problem
              </Button>
            </Link>

            {user && shortAddress && (
              <button
                onClick={() => { copyWallet(); }}
                className={`flex items-center gap-2 mt-2 px-4 py-2 border rounded-lg text-xs font-mono w-full ${palette.wallet}`}
              >
                {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                <span>{shortAddress}</span>
                <span className={`ml-auto ${isLanding ? "text-[var(--neon-dim)]" : "text-[var(--neon-dim)]"}`}>wallet</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
