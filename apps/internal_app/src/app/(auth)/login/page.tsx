'use client'

import { Suspense, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const isClientRedirect = searchParams.get('error') === 'client_redirect'
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen p-4"
      style={{ backgroundColor: '#F1F3F5' }}
    >
      <main className="w-full max-w-[420px]">
        {/* Login Card */}
        <div
          className="bg-white rounded-xl p-10 flex flex-col items-center"
          style={{ boxShadow: '0 12px 32px -4px rgba(0, 105, 112, 0.08)' }}
        >
          {/* Logo Area */}
          <div className="mb-10 text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="relative w-14 h-14 flex items-center justify-center">
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center text-white text-2xl font-black"
                  style={{ background: 'linear-gradient(135deg, #006970 0%, #3AAFB9 100%)' }}
                >
                  M
                </div>
                <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3AAFB9' }} />
                </div>
              </div>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tighter text-[#2C2C2C] mb-0.5">
              MANNA
            </h1>
            <p
              className="text-[10px] font-bold tracking-[0.2em] uppercase"
              style={{ color: '#3AAFB9' }}
            >
              ONE SOLUTION
            </p>
          </div>

          {/* Welcome Text */}
          <div className="w-full mb-8">
            <h2 className="text-2xl font-semibold text-[#212529] tracking-tight mb-1">
              Welcome Back
            </h2>
            <p className="text-sm text-[#6d797a] font-medium">
              Sign in to your staff account
            </p>
          </div>

          {/* Client redirect banner */}
          {isClientRedirect && (
            <div className="w-full mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-700 font-medium">
                Client accounts sign in at{' '}
                <a
                  href="https://mannaos.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-bold"
                >
                  mannaos.com
                </a>
                .
              </p>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="w-full mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600 font-medium">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="w-full space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label
                className="text-xs font-bold text-[#3d494a] uppercase tracking-wider"
                htmlFor="email"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                name="email"
                placeholder="you@mannaonesolution.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-[#f1f4f9] border border-[#bcc9ca]/30 rounded-lg text-sm text-[#181c20] outline-none transition-all focus:ring-2 placeholder:text-[#bcc9ca]"
                style={{ '--tw-ring-color': '#3AAFB9' } as React.CSSProperties}
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label
                  className="text-xs font-bold text-[#3d494a] uppercase tracking-wider"
                  htmlFor="password"
                >
                  Password
                </label>
              </div>
              <input
                id="password"
                type="password"
                name="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-[#f1f4f9] border border-[#bcc9ca]/30 rounded-lg text-sm text-[#181c20] outline-none transition-all focus:ring-2 placeholder:text-[#bcc9ca]"
              />
            </div>

            {/* Submit */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full font-bold py-3.5 px-6 rounded-lg transition-all duration-200 flex justify-center items-center gap-2 group text-white disabled:opacity-70"
                style={{ backgroundColor: loading ? '#2D8E96' : '#3AAFB9' }}
                onMouseEnter={(e) => {
                  if (!loading)
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#006970'
                }}
                onMouseLeave={(e) => {
                  if (!loading)
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#3AAFB9'
                }}
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">
                      arrow_forward
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Security notice */}
          <div className="mt-8 pt-8 border-t border-[#ebeef3] w-full">
            <div className="flex items-center gap-3 p-3 bg-[#f1f4f9] rounded-lg">
              <span
                className="material-symbols-outlined"
                style={{ color: '#3AAFB9' }}
              >
                shield_person
              </span>
              <p className="text-[11px] text-[#3d494a] leading-relaxed">
                Internal access only. Use your MOS staff credentials.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-8 text-center space-y-1">
          <p className="text-[11px] font-medium text-[#6d797a] uppercase tracking-widest">
            Manna One Solution — One Stop, All Solutions.
          </p>
          <p className="text-[11px] font-medium text-[#6d797a]/60 uppercase tracking-widest">
            Houston, TX
          </p>
        </footer>
      </main>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
