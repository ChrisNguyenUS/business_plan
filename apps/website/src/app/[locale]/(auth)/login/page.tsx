"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { Mail, Lock } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const params = useParams();
  const locale = params.locale as string;
  const router = useRouter();
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: err } = await signIn(email, password);
    if (err) {
      setError(err);
      setLoading(false);
      return;
    }

    // Fetch role to determine redirect destination
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id;

    if (!userId) {
      setError('Sign in failed. Please try again.');
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    const role = profile?.role;

    if (role === 'staff') {
      await supabase.auth.signOut();
      setError('Staff members sign in via the internal app, not this website.');
      setLoading(false);
      return;
    }

    router.push(role === 'admin' ? `/${locale}/admin` : `/${locale}/portal`);
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-10">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-[#3a4a5c] flex items-center justify-center shadow-lg">
            <Image
              src="/images/logo-transparent.png"
              alt="Manna One Solution"
              width={48}
              height={48}
              className="rounded-lg"
              style={{ width: "auto", height: "auto" }}
            />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-charcoal text-center mb-1">
          Welcome to Manna One
        </h1>
        <p className="text-muted-foreground text-center text-sm mb-8">
          Sign in to continue
        </p>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Divider */}
        <div className="flex items-center gap-3 mb-6">
          <div className="h-px bg-border flex-1" />
          <span className="text-xs text-muted-foreground font-medium uppercase">
            Sign in with email
          </span>
          <div className="h-px bg-border flex-1" />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-charcoal mb-2 text-center">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full h-11 rounded-lg border border-border bg-[#f9fafb] pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-charcoal mb-2 text-center">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full h-11 rounded-lg border border-border bg-[#f9fafb] pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl bg-[#1e293b] hover:bg-[#0f172a] text-white font-semibold text-sm transition-colors disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Signing in...
              </span>
            ) : (
              "Sign in"
            )}
          </button>
        </form>

        {/* Bottom Links */}
        <div className="mt-6 flex items-center justify-between text-sm">
          <Link
            href={`/${locale}/forgot-password`}
            className="text-primary font-medium hover:underline"
          >
            Forgot password?
          </Link>
          <span className="text-muted-foreground">
            Need an account?{" "}
            <Link
              href={`/${locale}/signup`}
              className="text-charcoal font-bold hover:underline"
            >
              Sign up
            </Link>
          </span>
        </div>
      </div>
    </div>
  );
}
