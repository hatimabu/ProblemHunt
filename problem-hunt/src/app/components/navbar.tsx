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
        header: "border-[color:rgba(19,39,56,0.12)] bg-[rgba(247,241,228,0.72)] backdrop-blur-xl",
        logoBox: "rounded-none bg-[linear-gradient(135deg,var(--ph-ink),var(--ph-sky))]",
        logoText: "bg-none text-[var(--ph-ink)]",
        activeLink: "text-[var(--ph-ink)] bg-white/55",
        inactiveLink: "text-[rgba(19,39,56,0.74)] hover:text-[var(--ph-ink)] hover:bg-white/45",
        wallet: "bg-white/45 border-[color:rgba(19,39,56,0.14)] text-[var(--ph-sky)] hover:border-[color:rgba(29,125,179,0.45)]",
        primaryCta: "rounded-none bg-[var(--ph-ink)] text-[var(--ph-cream)] hover:bg-[var(--ph-sky)]",
        userButton: "bg-white/45 border-[color:rgba(19,39,56,0.14)] hover:border-[color:rgba(19,39,56,0.24)]",
        avatar: "rounded-none bg-[linear-gradient(135deg,var(--ph-sky),var(--ph-teal))]",
        dropdown: "bg-[var(--ph-cream)] border-[color:rgba(19,39,56,0.12)] shadow-2xl shadow-[rgba(19,39,56,0.12)]",
        dropdownDivider: "border-[color:rgba(19,39,56,0.1)]",
        dropdownItem: "text-[rgba(19,39,56,0.76)] hover:text-[var(--ph-ink)] hover:bg-white/50",
        signIn: "rounded-none bg-[var(--ph-sky)] text-white hover:bg-[var(--ph-ink)]",
        mobileToggle: "text-[rgba(19,39,56,0.62)] hover:text-[var(--ph-ink)] hover:bg-white/45",
        mobileMenu: "border-[color:rgba(19,39,56,0.12)] bg-[rgba(247,241,228,0.94)]",
      }
    : {
        header: "border-gray-800/50 bg-[#0a0a0f]/80 backdrop-blur-md",
        logoBox: "rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600",
        logoText: "bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent",
        activeLink: "text-cyan-400 bg-cyan-500/10",
        inactiveLink: "text-gray-300 hover:text-white hover:bg-gray-800/60",
        wallet: "bg-gray-800/60 border-gray-700/50 text-cyan-400 hover:border-cyan-500/50",
        primaryCta: "bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-600 hover:to-blue-700",
        userButton: "bg-gray-800/60 border-gray-700/50 hover:border-gray-600",
        avatar: "rounded-full bg-gradient-to-br from-cyan-500 to-blue-600",
        dropdown: "bg-gray-900 border-gray-700/60 shadow-2xl shadow-black/50",
        dropdownDivider: "border-gray-800",
        dropdownItem: "text-gray-300 hover:text-white hover:bg-gray-800/60",
        signIn: "bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-600 hover:to-blue-700",
        mobileToggle: "text-gray-400 hover:text-white hover:bg-gray-800",
        mobileMenu: "border-gray-800/50 bg-[#0a0a0f]/95",
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
                <ChevronDown className={`w-3.5 h-3.5 ${isLanding ? "text-[rgba(19,39,56,0.5)]" : "text-gray-400"} transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {dropdownOpen && (
                <div className={`absolute right-0 mt-2 w-52 rounded-xl border overflow-hidden z-50 fade-in ${palette.dropdown}`}>
                  <div className={`px-4 py-3 border-b ${palette.dropdownDivider}`}>
                    <p className={`text-sm font-semibold truncate ${isLanding ? "text-[var(--ph-ink)]" : "text-white"}`}>
                      {user.username || "Builder"}
                    </p>
                    <p className={`text-xs truncate ${isLanding ? "text-[rgba(19,39,56,0.56)]" : "text-gray-400"}`}>{user.email}</p>
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
                <span className={`ml-auto ${isLanding ? "text-[rgba(19,39,56,0.42)]" : "text-gray-500"}`}>wallet</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
