"use client";

import { useState } from "react";
import { Info, Mail, MailCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";

/** Deliberately permissive — the real check is the email Supabase sends. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Where the recovery link lands: the shared auth callback exchanges the
 *  recovery code for a session cookie, then forwards to the reset form. */
function resetRedirectUrl(locale: string) {
  return `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(
    `/${locale}/reset-password`
  )}`;
}

const SUBMIT_BTN =
  "flex-1 inline-flex items-center justify-center gap-2 h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-sm transition-colors hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed";

function SpamHint() {
  return (
    <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-border bg-[#f4faf9] px-3.5 py-3 text-[13px] leading-relaxed text-muted-foreground">
      <Info className="h-[18px] w-[18px] shrink-0 mt-px text-primary" />
      <span>Check your Spam folder if you don&apos;t see the email in your inbox.</span>
    </div>
  );
}

export function ForgotPasswordModal({
  open,
  onOpenChange,
  locale,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locale: string;
}) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function handleOpenChange(next: boolean) {
    if (loading) return; // don't drop an in-flight request
    if (!next) {
      // Reset so reopening starts from a clean form.
      setError(null);
      setSent(false);
    }
    onOpenChange(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return; // guards double submit (Enter + click)

    const value = email.trim();
    if (!EMAIL_RE.test(value)) {
      setError("Please enter a valid email address.");
      return;
    }

    setError(null);
    setLoading(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(value, {
      redirectTo: resetRedirectUrl(locale),
    });
    setLoading(false);

    if (err) {
      setError(err.message || "We couldn't send the reset email. Please try again.");
      return;
    }
    setSent(true);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[420px] w-[calc(100%-32px)] gap-0 rounded-[28px] sm:rounded-[32px] border-black/5 bg-white p-6 pt-7 sm:p-8 sm:pb-7 shadow-2xl">
        <div className="mx-auto mb-4 mt-1 flex h-[72px] w-[72px] items-center justify-center rounded-full bg-primary/10">
          <MailCheck className="h-9 w-9 text-primary" strokeWidth={1.8} />
        </div>

        {sent ? (
          <>
            <DialogTitle className="text-center text-[22px] font-bold tracking-tight text-charcoal">
              Reset link sent!
            </DialogTitle>
            <DialogDescription asChild>
              <p className="mt-2 text-center text-sm leading-relaxed text-muted-foreground" role="status">
                We&apos;ve sent a password reset link to your email. Open it and follow the instructions.
                <span className="mt-2 block break-all font-bold text-charcoal">{email.trim()}</span>
              </p>
            </DialogDescription>
            <SpamHint />
            <div className="mt-6 flex">
              <button type="button" className={SUBMIT_BTN} onClick={() => handleOpenChange(false)} autoFocus>
                Got it
              </button>
            </div>
          </>
        ) : (
          <>
            <DialogTitle className="text-center text-[22px] font-bold tracking-tight text-charcoal">
              Forgot your password?
            </DialogTitle>
            <DialogDescription className="mt-2 mb-6 text-center text-sm leading-relaxed text-muted-foreground">
              Enter your email and we&apos;ll send you a password reset link.
            </DialogDescription>

            <form onSubmit={handleSubmit} noValidate className="flex flex-col">
              <label htmlFor="manna-forgot-email" className="mb-2 text-[13px] font-bold text-charcoal">
                Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
                <input
                  id="manna-forgot-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoFocus
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                  }}
                  disabled={loading}
                  placeholder="you@example.com"
                  aria-invalid={error ? true : undefined}
                  className={`w-full h-[52px] rounded-xl border bg-[#f8fcfb] pl-12 pr-4 text-[15px] focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60 ${
                    error ? "border-red-400" : "border-border focus:border-primary"
                  }`}
                />
              </div>

              {error ? (
                <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-[13px] leading-relaxed text-red-600">
                  {error}
                </div>
              ) : (
                <SpamHint />
              )}

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => handleOpenChange(false)}
                  disabled={loading}
                  className="basis-[34%] h-12 rounded-xl border border-border bg-white text-sm font-semibold text-charcoal transition-colors hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button type="submit" disabled={loading} className={SUBMIT_BTN}>
                  {loading ? (
                    <>
                      <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send reset link"
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
