import { useState } from "react";
import { Mail, Loader2, Link as LinkIcon, Check, AlertCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";
import { supabase } from "../../../lib/supabaseClient";
import { useAuth } from "../contexts/AuthContext";

/**
 * LinkEmail Component
 * 
 * Allows users who signed in with a Web3 wallet to link an email address
 * or social identity to their account for account recovery and notifications.
 * 
 * This component uses Supabase's identity linking functionality.
 */

interface LinkEmailProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function LinkEmail({ onSuccess, onError }: LinkEmailProps) {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLinking, setIsLinking] = useState(false);
  const [isSendingMagicLink, setIsSendingMagicLink] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [mode, setMode] = useState<'password' | 'magic-link'>('magic-link');

  // Check if user already has email linked
  const userEmail = user?.email;
  const hasEmail = userEmail && userEmail.includes('@');

  /**
   * Link email with password to existing wallet-based account
   */
  const linkEmailWithPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError("No user session found");
      return;
    }

    if (!email || !password) {
      setError("Please provide both email and password");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    try {
      setIsLinking(true);
      setError("");
      setSuccess("");

      // Update user with email and password
      const { error: updateError } = await supabase.auth.updateUser({
        email: email,
        password: password,
      });

      if (updateError) throw updateError;

      setSuccess("Email linked successfully! Please check your email to verify.");
      setEmail("");
      setPassword("");
      onSuccess?.();

    } catch (err: any) {
      console.error('Error linking email:', err);
      const errorMsg = err.message || 'Failed to link email';
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setIsLinking(false);
    }
  };

  /**
   * Send magic link to link email (passwordless)
   */
  const sendMagicLinkToLinkEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError("No user session found");
      return;
    }

    if (!email) {
      setError("Please provide an email address");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    try {
      setIsSendingMagicLink(true);
      setError("");
      setSuccess("");

      // Update user email (will send verification email)
      const { error: updateError } = await supabase.auth.updateUser({
        email: email,
      });

      if (updateError) throw updateError;

      setSuccess("Verification email sent! Please check your inbox and click the link to verify.");
      setEmail("");
      onSuccess?.();

    } catch (err: any) {
      console.error('Error sending magic link:', err);
      const errorMsg = err.message || 'Failed to send verification email';
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setIsSendingMagicLink(false);
    }
  };

  /**
   * Link social identity (Google, GitHub, etc.)
   */
  const linkSocialIdentity = async (provider: 'google' | 'github' | 'twitter') => {
    if (!user) {
      setError("No user session found");
      return;
    }

    try {
      setError("");
      setSuccess("");

      // Use OAuth to link identity
      const { error: linkError } = await supabase.auth.linkIdentity({
        provider: provider,
      });

      if (linkError) throw linkError;

      // This will redirect to OAuth provider
      // After successful auth, user will be redirected back

    } catch (err: any) {
      console.error('Error linking social identity:', err);
      const errorMsg = err.message || `Failed to link ${provider} account`;
      setError(errorMsg);
      onError?.(errorMsg);
    }
  };

  if (hasEmail) {
    return (
      <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Check className="w-5 h-5 text-green-400" />
            Email Linked
          </CardTitle>
          <CardDescription className="text-gray-400">
            Your account is linked to {userEmail}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-400">
            You can now recover your account using this email address.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <LinkIcon className="w-5 h-5 text-cyan-400" />
          Link Email or Social Account
        </CardTitle>
        <CardDescription className="text-gray-400">
          Add account recovery and enable email notifications
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <Alert className="bg-red-500/10 border-red-500/30">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-400">{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="bg-green-500/10 border-green-500/30">
            <Check className="h-4 w-4 text-green-400" />
            <AlertDescription className="text-green-400">{success}</AlertDescription>
          </Alert>
        )}

        {/* Mode Selector */}
        <div className="flex gap-2 p-1 bg-gray-800/50 rounded-lg">
          <Button
            type="button"
            onClick={() => setMode('magic-link')}
            variant={mode === 'magic-link' ? 'default' : 'ghost'}
            className={mode === 'magic-link' 
              ? "flex-1 bg-cyan-500 hover:bg-cyan-600" 
              : "flex-1 text-gray-400 hover:text-white"
            }
            size="sm"
          >
            Magic Link
          </Button>
          <Button
            type="button"
            onClick={() => setMode('password')}
            variant={mode === 'password' ? 'default' : 'ghost'}
            className={mode === 'password' 
              ? "flex-1 bg-cyan-500 hover:bg-cyan-600" 
              : "flex-1 text-gray-400 hover:text-white"
            }
            size="sm"
          >
            Password
          </Button>
        </div>

        {/* Email Link Form */}
        {mode === 'magic-link' ? (
          <form onSubmit={sendMagicLinkToLinkEmail} className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-white mb-2 block">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="bg-gray-800/50 border-gray-700 focus:border-cyan-500/50 text-white"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                We'll send you a verification link
              </p>
            </div>

            <Button
              type="submit"
              disabled={isSendingMagicLink}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white border-0"
            >
              {isSendingMagicLink ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Send Verification Email
                </>
              )}
            </Button>
          </form>
        ) : (
          <form onSubmit={linkEmailWithPassword} className="space-y-4">
            <div>
              <Label htmlFor="email-password" className="text-white mb-2 block">
                Email Address
              </Label>
              <Input
                id="email-password"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="bg-gray-800/50 border-gray-700 focus:border-cyan-500/50 text-white"
                required
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-white mb-2 block">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-gray-800/50 border-gray-700 focus:border-cyan-500/50 text-white"
                minLength={8}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Minimum 8 characters
              </p>
            </div>

            <Button
              type="submit"
              disabled={isLinking}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white border-0"
            >
              {isLinking ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Linking...
                </>
              ) : (
                <>
                  <LinkIcon className="w-4 h-4 mr-2" />
                  Link Email & Password
                </>
              )}
            </Button>
          </form>
        )}

        {/* Social Login Options */}
        <div className="space-y-2">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-700" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-gray-900 px-2 text-gray-500">Or link social account</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Button
              type="button"
              onClick={() => linkSocialIdentity('google')}
              variant="outline"
              className="border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            </Button>

            <Button
              type="button"
              onClick={() => linkSocialIdentity('github')}
              variant="outline"
              className="border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </Button>

            <Button
              type="button"
              onClick={() => linkSocialIdentity('twitter')}
              variant="outline"
              className="border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </Button>
          </div>
        </div>

        <p className="text-xs text-gray-500 text-center">
          Linking an email or social account enables account recovery and notifications.
          You can still sign in with your wallet anytime.
        </p>
      </CardContent>
    </Card>
  );
}
