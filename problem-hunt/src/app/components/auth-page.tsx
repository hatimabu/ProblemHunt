import { useState } from "react";
import { useNavigate } from "react-router";
import { Briefcase, Lock, Mail, User } from "lucide-react";
import { Navbar } from "./navbar";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { useAuth } from "../contexts/AuthContext";

export function AuthPage() {
  const navigate = useNavigate();
  const { login, signup } = useAuth();

  const [signupData, setSignupData] = useState({
    username: "",
    fullName: "",
    email: "",
    password: "",
    userType: "builder" as "problem_poster" | "builder",
  });
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });
  const [signupError, setSignupError] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignup = async (event: React.FormEvent) => {
    event.preventDefault();
    setSignupError("");
    setIsSubmitting(true);

    try {
      await signup(
        signupData.username,
        signupData.fullName,
        signupData.email,
        signupData.password,
        signupData.userType
      );

      navigate(signupData.userType === "builder" ? "/dashboard" : "/browse");
    } catch (error: any) {
      setSignupError(error.message || "Signup failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoginError("");
    setIsSubmitting(true);

    try {
      await login(loginData.email, loginData.password);
      navigate("/dashboard");
    } catch (error: any) {
      setLoginError(error.message || "Login failed. Please check your credentials.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="board-app">
      <Navbar />

      <main className="board-container py-8 md:py-10">
        <section className="board-auth-shell">
          <div className="flex flex-col justify-between border-b border-[color:var(--board-line)] pb-8 md:border-b-0 md:border-r md:pb-0 md:pr-8">
            <div>
              <p className="board-kicker">Access</p>
              <h1 className="board-title mt-3">Join the board, post work, or claim it.</h1>
              <p className="board-copy mt-5">
                Problem Hunt is built for operators who need something shipped and builders who want a clean path from response to payout.
              </p>
            </div>

            <div className="mt-10 space-y-6">
              {[
                "Post a brief with enough detail for someone to price the work properly.",
                "Track accepted proposals and wallet-based payment in one flow.",
                "Build a profile that looks serious when a requester opens your bid.",
              ].map((item) => (
                <div key={item} className="border-t border-[color:var(--board-line)] pt-4">
                  <p className="text-sm leading-7 text-[var(--board-muted)]">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="board-panel p-6 md:p-8">
            <Tabs defaultValue="login" className="space-y-6">
              <TabsList className="board-tabs grid h-auto w-full grid-cols-2 p-1">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign up</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-5">
                  <div>
                    <Label htmlFor="login-email" className="mb-2 block text-sm text-[var(--board-ink)]">
                      <Mail className="mr-2 inline h-4 w-4 text-[var(--board-accent)]" />
                      Email
                    </Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="you@company.com"
                      value={loginData.email}
                      onChange={(event) => setLoginData({ ...loginData, email: event.target.value })}
                      className="board-field"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="login-password" className="mb-2 block text-sm text-[var(--board-ink)]">
                      <Lock className="mr-2 inline h-4 w-4 text-[var(--board-accent)]" />
                      Password
                    </Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginData.password}
                      onChange={(event) => setLoginData({ ...loginData, password: event.target.value })}
                      className="board-field"
                      required
                    />
                  </div>

                  {loginError ? (
                    <div className="rounded-lg border border-[color:rgba(219,84,97,0.34)] bg-[rgba(219,84,97,0.12)] px-4 py-3 text-sm text-[var(--board-accent)]">
                      {loginError}
                    </div>
                  ) : null}

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="board-btn-primary h-12 w-full border-0 bg-[var(--board-accent)] text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-white hover:bg-[var(--color-accent-hover)]"
                  >
                    {isSubmitting ? "Logging in..." : "Login"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-5">
                  <div>
                    <Label htmlFor="signup-username" className="mb-2 block text-sm text-[var(--board-ink)]">
                      <User className="mr-2 inline h-4 w-4 text-[var(--board-accent)]" />
                      Username
                    </Label>
                    <Input
                      id="signup-username"
                      type="text"
                      placeholder="builder_handle"
                      value={signupData.username}
                      onChange={(event) => setSignupData({ ...signupData, username: event.target.value })}
                      className="board-field"
                      minLength={3}
                      maxLength={30}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="signup-fullname" className="mb-2 block text-sm text-[var(--board-ink)]">
                      <User className="mr-2 inline h-4 w-4 text-[var(--board-accent)]" />
                      Full name
                    </Label>
                    <Input
                      id="signup-fullname"
                      type="text"
                      placeholder="Jane Doe"
                      value={signupData.fullName}
                      onChange={(event) => setSignupData({ ...signupData, fullName: event.target.value })}
                      className="board-field"
                    />
                  </div>

                  <div>
                    <Label htmlFor="signup-email" className="mb-2 block text-sm text-[var(--board-ink)]">
                      <Mail className="mr-2 inline h-4 w-4 text-[var(--board-accent)]" />
                      Email
                    </Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@company.com"
                      value={signupData.email}
                      onChange={(event) => setSignupData({ ...signupData, email: event.target.value })}
                      className="board-field"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="signup-password" className="mb-2 block text-sm text-[var(--board-ink)]">
                      <Lock className="mr-2 inline h-4 w-4 text-[var(--board-accent)]" />
                      Password
                    </Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Minimum 6 characters"
                      value={signupData.password}
                      onChange={(event) => setSignupData({ ...signupData, password: event.target.value })}
                      className="board-field"
                      minLength={6}
                      required
                    />
                  </div>

                  <div>
                    <p className="mb-2 text-sm text-[var(--board-ink)]">
                      <Briefcase className="mr-2 inline h-4 w-4 text-[var(--board-accent)]" />
                      I want to...
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setSignupData({ ...signupData, userType: "builder" })}
                        className={`border px-4 py-4 text-left transition-colors ${
                          signupData.userType === "builder"
                            ? "border-[color:rgba(219,84,97,0.34)] bg-[rgba(219,84,97,0.14)]"
                            : "border-[color:var(--board-line)] bg-[var(--board-panel)]"
                        }`}
                      >
                        <p className="font-display text-lg font-semibold tracking-[-0.04em] text-[var(--board-ink)]">Build</p>
                        <p className="mt-1 text-sm text-[var(--board-muted)]">Respond to briefs and take on work.</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSignupData({ ...signupData, userType: "problem_poster" })}
                        className={`border px-4 py-4 text-left transition-colors ${
                          signupData.userType === "problem_poster"
                            ? "border-[color:rgba(219,84,97,0.34)] bg-[rgba(219,84,97,0.14)]"
                            : "border-[color:var(--board-line)] bg-[var(--board-panel)]"
                        }`}
                      >
                        <p className="font-display text-lg font-semibold tracking-[-0.04em] text-[var(--board-ink)]">Post</p>
                        <p className="mt-1 text-sm text-[var(--board-muted)]">Publish work and review builders.</p>
                      </button>
                    </div>
                  </div>

                  {signupError ? (
                    <div className="rounded-lg border border-[color:rgba(219,84,97,0.34)] bg-[rgba(219,84,97,0.12)] px-4 py-3 text-sm text-[var(--board-accent)]">
                      {signupError}
                    </div>
                  ) : null}

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="board-btn-primary h-12 w-full border-0 bg-[var(--board-accent)] text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-white hover:bg-[var(--color-accent-hover)]"
                  >
                    {isSubmitting ? "Creating account..." : "Create account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        </section>
      </main>
    </div>
  );
}
