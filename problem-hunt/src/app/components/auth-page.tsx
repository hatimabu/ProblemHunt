import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Code, Mail, Lock, User, Briefcase } from "lucide-react";
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

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
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
      // Redirect to dashboard if builder, otherwise to browse
      if (signupData.userType === 'builder') {
        navigate('/dashboard');
      } else {
        navigate('/browse');
      }
    } catch (error: any) {
      console.error("Signup failed:", error);
      setSignupError(error.message || "Signup failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsSubmitting(true);

    try {
      await login(loginData.email, loginData.password);
      // After login, redirect to dashboard
      navigate('/dashboard');
    } catch (error: any) {
      console.error("Login failed:", error);
      setLoginError(error.message || "Login failed. Please check your credentials.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-100">
      {/* Header */}
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
          <nav className="flex items-center gap-4">
            <Link to="/browse">
              <Button variant="ghost" className="text-gray-300 hover:text-white hover:bg-gray-800">
                Browse
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Auth Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto">
          {/* Hero Text */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              Welcome to Problem Hunt
            </h1>
            <p className="text-gray-400">
              Join the marketplace for decentralized problem solving
            </p>
          </div>

          {/* Auth Tabs */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-blue-500/5 rounded-2xl blur-xl" />
            <div className="relative bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-8">
              <Tabs defaultValue="login" className="space-y-6">
                <TabsList className="grid w-full grid-cols-2 bg-gray-800/50 p-1">
                  <TabsTrigger
                    value="login"
                    className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 text-gray-400"
                  >
                    Login
                  </TabsTrigger>
                  <TabsTrigger
                    value="signup"
                    className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 text-gray-400"
                  >
                    Sign Up
                  </TabsTrigger>
                </TabsList>

                {/* Login Form */}
                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <Label htmlFor="login-email" className="text-white mb-2 block">
                        <Mail className="w-4 h-4 inline mr-2" />
                        Email
                      </Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="your@email.com"
                        value={loginData.email}
                        onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                        className="bg-gray-800/50 border-gray-700 focus:border-cyan-500/50 text-white placeholder:text-gray-500"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="login-password" className="text-white mb-2 block">
                        <Lock className="w-4 h-4 inline mr-2" />
                        Password
                      </Label>
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        className="bg-gray-800/50 border-gray-700 focus:border-cyan-500/50 text-white placeholder:text-gray-500"
                        required
                      />
                    </div>

                    {loginError && (
                      <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                        {loginError}
                      </div>
                    )}

                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white border-0 disabled:opacity-50"
                    >
                      {isSubmitting ? "Logging in..." : "Login"}
                    </Button>

                    <div className="text-center">
                      <a href="#" className="text-sm text-cyan-400 hover:text-cyan-300">
                        Forgot password?
                      </a>
                    </div>
                  </form>
                </TabsContent>

                {/* Signup Form */}
                <TabsContent value="signup">
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div>
                      <Label htmlFor="signup-username" className="text-white mb-2 block">
                        <User className="w-4 h-4 inline mr-2" />
                        Username
                      </Label>
                      <IminLength={3}
                        maxLength={30}
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">3-30 characters, will be publicly visible</p>
                    </div>

                    <div>
                      <Label htmlFor="signup-fullname" className="text-white mb-2 block">
                        <User className="w-4 h-4 inline mr-2" />
                        Full Name
                      </Label>
                      <Input
                        id="signup-fullname"
                        type="text"
                        placeholder="John Doe"
                        value={signupData.fullName}
                        onChange={(e) => setSignupData({ ...signupData, fullName: e.target.value })}
                        className="bg-gray-800/50 border-gray-700 focus:border-cyan-500/50 text-white placeholder:text-gray-500"
                        id="signup-username"
                        type="text"
                        placeholder="crypto_builder"
                        value={signupData.username}
                        onChange={(e) => setSignupData({ ...signupData, username: e.target.value })}
                        className="bg-gray-800/50 border-gray-700 focus:border-cyan-500/50 text-white placeholder:text-gray-500"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="signup-email" className="text-white mb-2 block">
                        <Mail className="w-4 h-4 inline mr-2" />
                        Email
                      </Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="your@email.com"
                        value={signupData.email}
                        onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                        className="bg-gray-800/50 border-gray-700 focus:border-cyan-500/50 text-white placeholder:text-gray-500"
                        required
                      />
                    </div>
userType: "builder" })}
                          className={`p-4 rounded-lg border transition-all ${
                            signupData.userType === "builder"
                              ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-400"
                              : "bg-gray-800/30 border-gray-700 text-gray-400 hover:border-gray-600"
                          }`}
                        >
                          <div className="font-medium mb-1">Build</div>
                          <div className="text-xs opacity-80">Solve problems</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSignupData({ ...signupData, userType: "problem_poster" })}
                          className={`p-4 rounded-lg border transition-all ${
                            signupData.userType === "problem_poster"
                              ? "bg-blue-500/20 border-blue-500/50 text-blue-400"
                              : "bg-gray-800/30 border-gray-700 text-gray-400 hover:border-gray-600"
                          }`}
                        >
                          <div className="font-medium mb-1">Post</div>
                          <div className="text-xs opacity-80">Find solutions</div>
                        </button>
                      </div>
                    </div>

                    {signupError && (
                      <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                        {signupError}
                      </div>
                    )}

                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white border-0 disabled:opacity-50"
                    >
                      {isSubmitting ? "Creating Account..." : "Create Account"}gray-800/30 border-gray-700 text-gray-400 hover:border-gray-600"
                          }`}
                        >
                          <div className="font-medium mb-1">Build</div>
                          <div className="text-xs opacity-80">Solve problems</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSignupData({ ...signupData, role: "client" })}
                          className={`p-4 rounded-lg border transition-all ${
                            signupData.role === "client"
                              ? "bg-blue-500/20 border-blue-500/50 text-blue-400"
                              : "bg-gray-800/30 border-gray-700 text-gray-400 hover:border-gray-600"
                          }`}
                        >
                          <div className="font-medium mb-1">Post</div>
                          <div className="text-xs opacity-80">Find solutions</div>
                        </button>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white border-0"
                    >
                      Create Account
                    </Button>

                    <p className="text-xs text-gray-500 text-center">
                      By signing up, you agree to our Terms of Service and Privacy Policy
                    </p>
                  </form>
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* Features */}
          <div className="mt-12 grid grid-cols-2 gap-4">
            <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-4">
              <div className="text-cyan-400 font-medium mb-1">For Builders</div>
              <div className="text-sm text-gray-400">
                Find problems to solve, post progress, earn tips & bounties
              </div>
            </div>
            <div className="bg-gray-900/30 border border-gray-800 rounded-xl p-4">
              <div className="text-blue-400 font-medium mb-1">For Posters</div>
              <div className="text-sm text-gray-400">
                Post problems, track progress, tip builders, pay for solutions
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
