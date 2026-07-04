"use client";

import { useState } from "react";
import { useAuth, type OAuthProvider } from "@/components/providers/AuthProvider";

const PROVIDERS: { id: OAuthProvider; label: string }[] = [
  { id: "google", label: "Continue with Google" },
  { id: "facebook", label: "Continue with Facebook" },
  { id: "apple", label: "Continue with Apple" },
];

function ProviderIcon({ provider }: { provider: OAuthProvider }) {
  if (provider === "google") {
    return (
      <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M23.52 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.81z"
        />
        <path
          fill="#34A853"
          d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3c-1.08.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.72-4.95H1.27v3.1A12 12 0 0 0 12 24z"
        />
        <path
          fill="#FBBC05"
          d="M5.28 14.29a7.21 7.21 0 0 1 0-4.58v-3.1H1.27a12 12 0 0 0 0 10.78l4.01-3.1z"
        />
        <path
          fill="#EA4335"
          d="M12 4.77c1.76 0 3.35.61 4.6 1.8l3.44-3.44A11.97 11.97 0 0 0 12 0 12 12 0 0 0 1.27 6.61l4.01 3.1C6.22 6.88 8.87 4.77 12 4.77z"
        />
      </svg>
    );
  }
  if (provider === "facebook") {
    return (
      <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="#1877F2"
          d="M24 12a12 12 0 1 0-13.88 11.85v-8.38H7.08V12h3.04V9.36c0-3 1.79-4.67 4.53-4.67 1.31 0 2.68.24 2.68.24v2.95h-1.51c-1.49 0-1.95.92-1.95 1.87V12h3.32l-.53 3.47h-2.79v8.38A12 12 0 0 0 24 12z"
        />
      </svg>
    );
  }
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M16.36 12.76c-.02-2.24 1.83-3.31 1.91-3.37-1.04-1.52-2.66-1.73-3.24-1.75-1.38-.14-2.69.81-3.39.81-.7 0-1.78-.79-2.92-.77-1.5.02-2.89.87-3.66 2.21-1.56 2.71-.4 6.72 1.12 8.92.74 1.08 1.63 2.29 2.79 2.24 1.12-.04 1.54-.72 2.89-.72s1.73.72 2.91.7c1.2-.02 1.96-1.1 2.7-2.18.85-1.25 1.2-2.46 1.22-2.53-.03-.01-2.34-.9-2.36-3.56zM14.13 5.8c.62-.75 1.04-1.79.92-2.83-.89.04-1.97.6-2.61 1.34-.57.66-1.07 1.72-.94 2.73 1 .08 2.01-.5 2.63-1.24z"
      />
    </svg>
  );
}

/**
 * Shared OAuth sign-in buttons for login and signup pages.
 * Redirects through /api/auth/callback; errors surface inline.
 */
export function OAuthButtons() {
  const { signInWithOAuth } = useAuth();
  const [loadingProvider, setLoadingProvider] = useState<OAuthProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleClick(provider: OAuthProvider) {
    setError(null);
    setLoadingProvider(provider);
    const { error: err } = await signInWithOAuth(provider);
    if (err) {
      setError(err);
      setLoadingProvider(null);
    }
    // On success the browser navigates to the provider — no state reset needed.
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">
          {error}
        </div>
      )}
      {PROVIDERS.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          onClick={() => handleClick(id)}
          disabled={loadingProvider !== null}
          className="w-full h-11 rounded-xl border border-border bg-white hover:bg-[#f9fafb] text-charcoal font-semibold text-sm transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
        >
          {loadingProvider === id ? (
            <span className="w-4 h-4 border-2 border-charcoal/20 border-t-charcoal rounded-full animate-spin" />
          ) : (
            <ProviderIcon provider={id} />
          )}
          {label}
        </button>
      ))}
    </div>
  );
}
