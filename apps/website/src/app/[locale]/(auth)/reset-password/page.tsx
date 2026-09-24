"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { Check, CheckCircle2, Eye, EyeOff, Lock } from "lucide-react";
import { supabase } from "@/lib/supabase";

/* ─── Password policy — the checklist in the card is the single source ─── */
const RULES: { label: string; test: (v: string) => boolean }[] = [
  { label: "At least 8 characters", test: (v) => v.length >= 8 },
  { label: "Upper and lower case letters", test: (v) => /[a-z]/.test(v) && /[A-Z]/.test(v) },
  { label: "A number", test: (v) => /\d/.test(v) },
  { label: "A special character", test: (v) => /[^A-Za-z0-9]/.test(v) },
];

const INPUT =
  "w-full h-11 rounded-lg border bg-[#f9fafb] pl-10 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60";

type Status = "verifying" | "ready" | "invalid" | "success";

function PasswordField({
  id,
  label,
  value,
  onChange,
  disabled,
  invalid,
  autoFocus,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  invalid?: boolean;
  autoFocus?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-charcoal mb-2">
        {label}
      </label>
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="new-password"
          autoFocus={autoFocus}
          disabled={disabled}
          placeholder="••••••••"
          aria-invalid={invalid ? true : undefined}
          className={`${INPUT} ${invalid ? "border-red-400" : "border-border focus:border-primary"}`}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? "Hide password" : "Show password"}
          aria-pressed={show}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted-foreground hover:text-charcoal"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

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

  const ruleState = useMemo(
    () => RULES.map((r) => ({ label: r.label, met: r.test(password) })),
    [password]
  );
  const allRulesMet = ruleState.every((r) => r.met);
  const mismatch = confirm.length > 0 && confirm !== password;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return; // guards double submit

    if (!allRulesMet) {
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

              <ul className="space-y-1.5">
                {ruleState.map(({ label, met }) => (
                  <li
                    key={label}
                    className={`flex items-center gap-2 text-[13px] ${met ? "text-primary" : "text-muted-foreground"}`}
                  >
                    <Check className={`h-4 w-4 ${met ? "opacity-100" : "opacity-30"}`} />
                    {label}
                  </li>
                ))}
              </ul>

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
