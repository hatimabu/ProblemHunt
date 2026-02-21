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

  const navLinks = [
    { path: "/browse", label: "Browse" },
    { path: "/leaderboard", label: "Leaderboard" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-gray-800/50 bg-[#0a0a0f]/80 backdrop-blur-md">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center logo-glow">
            <Code className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent hidden sm:block">
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
                    ? "text-cyan-400 bg-cyan-500/10"
                    : "text-gray-300 hover:text-white hover:bg-gray-800/60"
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
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-gray-800/60 border border-gray-700/50 rounded-full text-xs font-mono text-cyan-400 hover:border-cyan-500/50 transition-colors"
            >
              {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
              {shortAddress}
            </button>
          )}

          {/* Post Problem CTA */}
          <Link to="/post" className="hidden sm:block">
            <Button
              size="sm"
              className="btn-shimmer bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white border-0 text-sm font-semibold"
            >
              Post Problem
            </Button>
          </Link>

          {/* User dropdown or Sign In */}
          {user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen((o) => !o)}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-gray-800/60 border border-gray-700/50 hover:border-gray-600 transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                  {(user.username || user.email || "U").substring(0, 1).toUpperCase()}
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-gray-900 border border-gray-700/60 rounded-xl shadow-2xl shadow-black/50 overflow-hidden z-50 fade-in">
                  <div className="px-4 py-3 border-b border-gray-800">
                    <p className="text-sm font-semibold text-white truncate">
                      {user.username || "Builder"}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{user.email}</p>
                  </div>

                  <div className="py-1">
                    <Link
                      to="/dashboard"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-gray-800/60 transition-colors"
                    >
                      <LayoutDashboard className="w-4 h-4 text-cyan-400" />
                      Dashboard
                    </Link>
                    <Link
                      to="/leaderboard"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-gray-800/60 transition-colors"
                    >
                      <Trophy className="w-4 h-4 text-yellow-400" />
                      Leaderboard
                    </Link>
                  </div>

                  <div className="border-t border-gray-800 py-1">
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
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white border-0"
              >
                Sign In
              </Button>
            </Link>
          )}

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-800/50 bg-[#0a0a0f]/95 backdrop-blur-md fade-in">
          <div className="container mx-auto px-4 py-4 space-y-1">
            {navLinks.map(({ path, label }) => (
              <Link
                key={path}
                to={path}
                onClick={() => setMobileOpen(false)}
                className={`block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive(path)
                    ? "text-cyan-400 bg-cyan-500/10"
                    : "text-gray-300 hover:text-white hover:bg-gray-800/60"
                }`}
              >
                {label}
              </Link>
            ))}

            <Link to="/post" onClick={() => setMobileOpen(false)}>
              <Button className="w-full mt-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-0">
                Post Problem
              </Button>
            </Link>

            {user && shortAddress && (
              <button
                onClick={() => { copyWallet(); }}
                className="flex items-center gap-2 mt-2 px-4 py-2 bg-gray-800/40 border border-gray-700/50 rounded-lg text-xs font-mono text-cyan-400 w-full"
              >
                {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                <span>{shortAddress}</span>
                <span className="text-gray-500 ml-auto">wallet</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
