import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { KeyRound, Lock, Radar } from "lucide-react";
import { Navbar } from "./navbar";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { supabase } from "../../../lib/supabaseClient";
import { getRecoveryCallback } from "../lib/recovery";

const INVALID_LINK_MESSAGE = "This password reset link is invalid or has expired. Request a new one to continue.";

function clearRecoveryCallback() {
  window.history.replaceState({}, document.title, `${window.location.pathname}`);
}

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    const verifyRecoverySession = async () => {
      const callback = getRecoveryCallback(window.location);
      if (callback.error) {
        setError(INVALID_LINK_MESSAGE);
        return;
      }

      try {
        let sessionResult = await supabase.auth.getSession();
        if (!sessionResult.error && !sessionResult.data.session && callback.code) {
          const exchange = supabase.auth.exchangeCodeForSession;
          if (typeof exchange !== "function") throw new Error(INVALID_LINK_MESSAGE);
          const exchanged = await exchange(callback.code, callback.flowId ? { flowId: callback.flowId } : undefined);
          sessionResult = { data: exchanged.data, error: exchanged.error };
        }

        if (!active) return;
        if (sessionResult.error || !sessionResult.data.session) {
          setError(INVALID_LINK_MESSAGE);
        } else {
          setIsReady(true);
          if (callback.hasPayload) clearRecoveryCallback();
        }
      } catch {
        if (active) setError(INVALID_LINK_MESSAGE);
      }
    };

    void verifyRecoverySession();
    return () => { active = false; };
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (password.length < 6) {
      setError("Your new password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }
    setIsSubmitting(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setMessage("Your password has been updated. You can now sign in with your new password.");
      setPassword("");
      setConfirmPassword("");
    } catch (updateError: any) {
      setError(updateError.message || "Unable to update your password. Please request a new reset link.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return <div className="board-app">
    <Navbar />
    <main className="board-container py-8 md:py-10">
      <section className="mx-auto max-w-xl">
        <div className="board-panel p-6 md:p-8">
          <div className="flex items-center gap-2"><Radar className="h-4 w-4 text-[var(--board-metal-steel)]" /><p className="board-kicker">Account security</p></div>
          <h1 className="board-title mt-3">Choose a new password.</h1>
          <p className="board-copy mt-4">Use a strong password you haven’t used elsewhere.</p>
          {isReady ? <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div><Label htmlFor="new-password" className="mb-2 block text-sm text-[var(--board-ink)]"><Lock className="mr-2 inline h-4 w-4 text-[var(--board-accent)]" />New password</Label><Input id="new-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="board-field" minLength={6} autoComplete="new-password" required /></div>
            <div><Label htmlFor="confirm-password" className="mb-2 block text-sm text-[var(--board-ink)]"><KeyRound className="mr-2 inline h-4 w-4 text-[var(--board-accent)]" />Confirm password</Label><Input id="confirm-password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="board-field" minLength={6} autoComplete="new-password" required /></div>
            {error ? <div role="alert" className="rounded-lg border border-[color:rgba(201,84,94,0.5)] bg-[rgba(201,84,94,0.18)] px-4 py-3 text-sm font-semibold text-white">{error}</div> : null}
            {message ? <div role="status" className="rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-200">{message}</div> : null}
            <Button type="submit" disabled={isSubmitting} className="h-12 w-full border-0 bg-[var(--board-accent)] text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-[#10140D]">{isSubmitting ? "Updating password..." : "Update password"}</Button>
            {message ? <Button type="button" variant="outline" onClick={() => navigate("/auth")} className="w-full">Return to login</Button> : null}
          </form> : <div className="mt-8 space-y-4">{error ? <div role="alert" className="rounded-lg border border-[color:rgba(201,84,94,0.5)] bg-[rgba(201,84,94,0.18)] px-4 py-3 text-sm font-semibold text-white">{error}</div> : <p className="text-sm text-[var(--board-muted)]">Verifying your reset link...</p>}<Link to="/auth" className="block text-sm text-[var(--board-muted)] underline-offset-4 hover:text-[var(--board-ink)] hover:underline">Request a new link</Link></div>}
        </div>
      </section>
    </main>
  </div>;
}
