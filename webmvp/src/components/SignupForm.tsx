"use client";

import Link from "next/link";
import { useState } from "react";

import { AuthDivider } from "@/components/AuthDivider";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { formatAuthError } from "@/lib/authErrors";
import { validateUsername } from "@/lib/validation";

type SignupFormProps = {
  onSubmit: (
    displayName: string,
    username: string,
    email: string,
    password: string,
  ) => Promise<void>;
  onGoogleSignIn?: () => Promise<void>;
  onCheckUsername: (username: string) => Promise<boolean>;
  loading?: boolean;
  loginHref?: string;
};

export function SignupForm({
  onSubmit,
  onGoogleSignIn,
  onCheckUsername,
  loading = false,
  loginHref = "/login",
}: SignupFormProps) {
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);

  const validateUsernameField = async (value: string): Promise<boolean> => {
    const result = validateUsername(value);
    if (!result.ok) {
      setUsernameError(result.error);
      return false;
    }

    const available = await onCheckUsername(result.normalized);
    if (!available) {
      setUsernameError("That username is already taken");
      return false;
    }

    setUsernameError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const usernameOk = await validateUsernameField(username);
    if (!usernameOk) {
      return;
    }

    setSubmitting(true);
    try {
      const normalized = validateUsername(username);
      if (!normalized.ok) {
        setUsernameError(normalized.error);
        return;
      }
      await onSubmit(displayName.trim(), normalized.normalized, email, password);
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
            label="Sign up with Google"
          />
          <AuthDivider />
        </>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-lf-text-secondary">
          Display name
        </span>
        <input
          type="text"
          required
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          onBlur={(e) => setDisplayName(e.target.value.trim())}
          placeholder="Alex Rivera"
          className="min-h-11 rounded-[var(--lf-radius-md)] border border-lf-border bg-lf-bg-elevated px-3 text-lf-text-primary placeholder:text-lf-text-tertiary focus:border-lf-brand focus:outline-none focus:ring-2 focus:ring-lf-brand/20"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-lf-text-secondary">
          Username
        </span>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lf-text-tertiary">
            @
          </span>
          <input
            type="text"
            required
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setUsernameError(null);
            }}
            onBlur={() => {
              if (username.trim()) {
                void validateUsernameField(username);
              }
            }}
            placeholder="alexrivera"
            autoComplete="username"
            className="min-h-11 w-full rounded-[var(--lf-radius-md)] border border-lf-border bg-lf-bg-elevated py-2 pl-7 pr-3 text-lf-text-primary placeholder:text-lf-text-tertiary focus:border-lf-brand focus:outline-none focus:ring-2 focus:ring-lf-brand/20"
          />
        </div>
        {usernameError && (
          <p className="text-sm text-lf-danger" role="alert">
            {usernameError}
          </p>
        )}
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-lf-text-secondary">Email</span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="min-h-11 rounded-[var(--lf-radius-md)] border border-lf-border bg-lf-bg-elevated px-3 text-lf-text-primary placeholder:text-lf-text-tertiary focus:border-lf-brand focus:outline-none focus:ring-2 focus:ring-lf-brand/20"
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
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="min-h-11 rounded-[var(--lf-radius-md)] border border-lf-border bg-lf-bg-elevated px-3 text-lf-text-primary placeholder:text-lf-text-tertiary focus:border-lf-brand focus:outline-none focus:ring-2 focus:ring-lf-brand/20"
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
        {submitting ? "Creating account…" : "Create account"}
      </button>

        <p className="text-center text-sm text-lf-text-secondary">
          Already have an account?{" "}
          <Link href={loginHref} className="font-medium text-lf-brand hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
