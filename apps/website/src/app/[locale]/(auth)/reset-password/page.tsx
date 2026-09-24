"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { meetsPasswordPolicy } from "@/lib/auth/password-policy";
import {
  PasswordField,
  PasswordRules,
  PasswordStrengthMeter,
} from "@/components/auth/PasswordFields";

type Status = "verifying" | "ready" | "invalid" | "success";

export default function ResetPasswordPage() {
  const params = useParams();
  const locale = params.locale as string;
  const loginUrl = `/${locale}/login`;

  const [status, setStatus] = useState<Status>("verifying");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The recovery session is established by /api/auth/callback (which exchanges
  // the emailed code for a session cookie) before this page renders. Newer
  // links may instead surface it here as a PASSWORD_RECOVERY event.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setStatus((s) => (s === "verifying" ? "ready" : s));
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setStatus((s) => (s === "verifying" ? (data.session ? "ready" : "invalid") : s));
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const mismatch = confirm.length > 0 && confirm !== password;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return; // guards double submit

    if (!meetsPasswordPolicy(password)) {
      setError("Your password doesn't meet all the requirements below.");
      return;
    }
    if (password !== confirm) {
      setError("The passwords do not match.");
      return;
    }

    setError(null);
    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });

    if (err) {
      setLoading(false);
      setError(err.message || "We couldn't update your password. Please try again.");
      return;
    }

    setStatus("success");
    // The recovery session has served its purpose — sign out so the user
    // re-authenticates with the new password.
    await supabase.auth.signOut();
    window.location.href = `${loginUrl}?reset=success`;
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-10">
        <div className="flex justify-center mb-6">
          <Image
            src="/images/logo-official.png"
            alt="Manna One Solution"
            width={120}
            height={120}
            className="h-20 w-auto"
            priority
          />
        </div>

        {status === "verifying" && (
          <div className="flex flex-col items-center gap-3 py-6">
            <span className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Verifying your link...</p>
          </div>
        )}

        {status === "invalid" && (
          <>
            <h1 className="text-2xl font-bold text-charcoal text-center mb-4">Reset your password</h1>
            <div role="alert" className="mb-6 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">
              This password reset link is invalid or has expired. Please request a new one.
            </div>
            <Link
              href={loginUrl}
              className="flex items-center justify-center w-full h-12 rounded-xl bg-[#1e293b] hover:bg-[#0f172a] text-white font-semibold text-sm transition-colors"
            >
              Back to sign in
            </Link>
          </>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center gap-3 py-4 text-center" role="status">
            <CheckCircle2 className="h-12 w-12 text-primary" />
            <h1 className="text-2xl font-bold text-charcoal">Password updated!</h1>
            <p className="text-sm text-muted-foreground">Redirecting you to the sign-in page...</p>
          </div>
        )}

        {status === "ready" && (
          <>
            <h1 className="text-2xl font-bold text-charcoal text-center mb-1">Create a new password</h1>
            <p className="text-muted-foreground text-center text-sm mb-8">Please enter your new password.</p>

            {error && (
              <div role="alert" className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              <PasswordField
                id="manna-new-password"
                label="New password"
                value={password}
                onChange={(v) => {
                  setPassword(v);
                  if (error) setError(null);
                }}
                disabled={loading}
                autoFocus
              />
              <PasswordStrengthMeter password={password} />
              <PasswordField
                id="manna-confirm-password"
                label="Confirm password"
                value={confirm}
                onChange={(v) => {
                  setConfirm(v);
                  if (error) setError(null);
                }}
                disabled={loading}
                invalid={mismatch}
              />

              <PasswordRules password={password} />

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl bg-[#1e293b] hover:bg-[#0f172a] text-white font-semibold text-sm transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Updating...
                  </span>
                ) : (
                  "Update password"
                )}
              </button>
            </form>

            <div className="mt-6 text-center text-sm">
              <Link href={loginUrl} className="text-primary font-medium hover:underline">
                Back to sign in
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
