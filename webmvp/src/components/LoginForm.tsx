"use client";

import Link from "next/link";
import { useState } from "react";

import { AuthDivider } from "@/components/AuthDivider";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { formatAuthError } from "@/lib/authErrors";

type LoginFormProps = {
  onSubmit: (email: string, password: string) => Promise<void>;
  onGoogleSignIn?: () => Promise<void>;
  loading?: boolean;
  signupHref?: string;
};

export function LoginForm({
  onSubmit,
  onGoogleSignIn,
  loading = false,
  signupHref = "/signup",
}: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await onSubmit(email, password);
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!onGoogleSignIn) {
      return;
    }

    setError(null);
    setGoogleSubmitting(true);
    try {
      await onGoogleSignIn();
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setGoogleSubmitting(false);
    }
  };

  const disabled = submitting || googleSubmitting || loading;

  return (
    <div className="flex w-full flex-col gap-4">
      {onGoogleSignIn && (
        <>
          <GoogleSignInButton
            onClick={handleGoogleSignIn}
            disabled={disabled}
          />
          <AuthDivider />
        </>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-lf-text-secondary">Email</span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="min-h-11 rounded-[var(--lf-radius-md)] border border-lf-border bg-lf-bg-page px-3 text-lf-text-primary placeholder:text-lf-text-tertiary focus:border-lf-brand focus:outline-none focus:ring-2 focus:ring-lf-brand/20"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-lf-text-secondary">
          Password
        </span>
        <input
          type="password"
          required
          minLength={6}
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="min-h-11 rounded-[var(--lf-radius-md)] border border-lf-border bg-lf-bg-page px-3 text-lf-text-primary focus:border-lf-brand focus:outline-none focus:ring-2 focus:ring-lf-brand/20"
        />
      </label>

      {error && (
        <p className="text-sm text-lf-danger" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={disabled}
        className="min-h-12 rounded-[var(--lf-radius-md)] bg-lf-action-primary px-4 text-sm font-semibold text-lf-text-inverse transition-colors hover:bg-lf-action-primary-hover disabled:opacity-50"
      >
        {submitting ? "Signing in…" : "Sign in"}
      </button>

        <p className="text-center text-sm text-lf-text-secondary">
          New here?{" "}
          <Link href={signupHref} className="font-medium text-lf-brand hover:underline">
            Create account
          </Link>
        </p>
      </form>
    </div>
  );
}
