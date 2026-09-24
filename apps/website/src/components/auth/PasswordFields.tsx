"use client";

import { useState } from "react";
import { CheckCircle2, Eye, EyeOff, Lock } from "lucide-react";
import {
  STRENGTH_SEGMENTS,
  passwordRuleState,
  passwordStrengthScore,
  type PasswordRuleId,
} from "@/lib/auth/password-policy";

const RULE_LABELS: Record<PasswordRuleId, string> = {
  length: "At least 8 characters",
  case: "Upper and lower case letters",
  number: "A number",
  symbol: "A special character",
};

// Index = strength score (1–4; 5 reuses "strong").
const STRENGTH_COLORS = ["", "bg-red-400", "bg-amber-400", "bg-sky-400", "bg-primary"];

export function PasswordField({
  id,
  label,
  value,
  onChange,
  disabled,
  invalid,
  autoFocus,
  placeholder = "••••••••",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  invalid?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
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
          placeholder={placeholder}
          aria-invalid={invalid ? true : undefined}
          className={`w-full h-11 rounded-lg border bg-[#f9fafb] pl-10 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60 ${
            invalid ? "border-red-400" : "border-border focus:border-primary"
          }`}
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

export function PasswordStrengthMeter({ password }: { password: string }) {
  const score = passwordStrengthScore(password);
  return (
    <div className="flex items-center gap-2.5 -mt-2">
      <span className="shrink-0 text-xs text-muted-foreground">Strength</span>
      <div className="flex flex-1 gap-1.5" aria-hidden="true">
        {Array.from({ length: STRENGTH_SEGMENTS }, (_, i) => (
          <span
            key={i}
            className={`h-[5px] flex-1 rounded-full transition-colors ${
              i < score ? STRENGTH_COLORS[Math.min(score, 4)] : "bg-[#e9eef0]"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export function PasswordRules({ password }: { password: string }) {
  return (
    <ul className="space-y-2.5 rounded-2xl border border-border bg-[#f4faf9] px-4 py-3.5">
      {passwordRuleState(password).map(({ id, met }) => (
        <li
          key={id}
          className={`flex items-center gap-2.5 text-[13px] transition-colors ${
            met ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <CheckCircle2 className={`h-4 w-4 shrink-0 ${met ? "" : "opacity-40"}`} />
          {RULE_LABELS[id]}
        </li>
      ))}
    </ul>
  );
}
