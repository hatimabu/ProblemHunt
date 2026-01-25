import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Code, Lock, UserPlus, LogIn } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { supabase } from "../lib/supabase";

export function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      if (data.session?.user) {
        navigate("/dashboard", { replace: true });
      }
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        navigate("/dashboard", { replace: true });
      }
    });

    return () => {
      isMounted = false;
      data.subscription?.unsubscribe();
    };
  }, [navigate]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { displayName } },
        });

        if (signUpError) {
          throw signUpError;
        }

        const nextMessage = data.session
          ? "Account created and signed in! Redirecting to your dashboard..."
          : "Account created! Check your inbox to confirm your email.";
        setMessage(nextMessage);
        setTimeout(() => navigate("/dashboard"), 1200);
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          throw signInError;
        }

        setMessage("Signed in! Redirecting to your dashboard...");
        setTimeout(() => navigate("/dashboard"), 800);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-100 flex flex-col">
      <header className="border-b border-gray-800/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center">
              <Code className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              problemhunt.cc
            </span>
          </Link>
          <nav className="flex items-center gap-3">
            <Link to="/browse">
              <Button variant="ghost" className="text-gray-300 hover:text-white hover:bg-gray-800">
                Browse
              </Button>
            </Link>
            <Link to="/post">
              <Button variant="ghost" className="text-gray-300 hover:text-white hover:bg-gray-800">
                Post
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button variant="ghost" className="text-gray-300 hover:text-white hover:bg-gray-800">
                Dashboard
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-3xl relative">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-3xl blur-3xl" />
          <div className="relative bg-gray-900/60 border border-gray-800 rounded-3xl p-8 backdrop-blur-xl shadow-2xl">
            <div className="flex flex-col md:flex-row gap-8">
              <div className="md:w-1/2 space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-200 text-sm">
                  <Lock className="w-4 h-4" />
                  Secure access
                </div>
                <h1 className="text-3xl font-bold text-white">
                  {mode === "signup" ? "Create your Problem Hunt account" : "Welcome back"}
                </h1>
                <p className="text-gray-400">
                  {mode === "signup"
                    ? "Spin up your builder dashboard, track updates, and collect tips."
                    : "Sign in to get back to your dashboard and keep shipping."}
                </p>
                <div className="grid grid-cols-2 gap-3 pt-4">
                  <div className="bg-gray-800/50 border border-gray-800 rounded-xl p-3">
                    <div className="text-xs text-gray-400">Progress updates</div>
                    <div className="text-lg font-semibold text-white">Earn tips as you build</div>
                  </div>
                  <div className="bg-gray-800/50 border border-gray-800 rounded-xl p-3">
                    <div className="text-xs text-gray-400">Trustless payouts</div>
                    <div className="text-lg font-semibold text-white">Bounties you can ship</div>
                  </div>
                </div>
              </div>

              <div className="md:w-1/2">
                <div className="bg-gray-950/60 border border-gray-800 rounded-2xl p-6 shadow-lg">
                  <div className="flex gap-2 mb-6">
                    <Button
                      type="button"
                      variant={mode === "signup" ? "default" : "outline"}
                      className={
                        mode === "signup"
                          ? "flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 border-0 text-white"
                          : "flex-1 border-gray-700 text-gray-200"
                      }
                      onClick={() => setMode("signup")}
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Create account
                    </Button>
                    <Button
                      type="button"
                      variant={mode === "signin" ? "default" : "outline"}
                      className={
                        mode === "signin"
                          ? "flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 border-0 text-white"
                          : "flex-1 border-gray-700 text-gray-200"
                      }
                      onClick={() => setMode("signin")}
                    >
                      <LogIn className="w-4 h-4 mr-2" />
                      Sign in
                    </Button>
                  </div>

                  <form className="space-y-4" onSubmit={handleSubmit}>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-white">
                        Email
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        required
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="bg-gray-800/60 border-gray-700 text-white placeholder:text-gray-500"
                      />
                    </div>

                    {mode === "signup" && (
                      <div className="space-y-2">
                        <Label htmlFor="displayName" className="text-white">
                          Display name
                        </Label>
                        <Input
                          id="displayName"
                          required
                          placeholder="builder_123"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          className="bg-gray-800/60 border-gray-700 text-white placeholder:text-gray-500"
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-white">
                        Password
                      </Label>
                      <Input
                        id="password"
                        type="password"
                        required
                        minLength={6}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="bg-gray-800/60 border-gray-700 text-white placeholder:text-gray-500"
                      />
                    </div>

                    {error && <p className="text-sm text-red-400">{error}</p>}
                    {message && <p className="text-sm text-cyan-300">{message}</p>}

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white border-0"
                    >
                      {loading ? "Working..." : mode === "signup" ? "Create account" : "Sign in"}
                    </Button>

                    <p className="text-xs text-gray-500 text-center">
                      We create your Problem Hunt identity on Supabase. You can always update profile details in your dashboard.
                    </p>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
